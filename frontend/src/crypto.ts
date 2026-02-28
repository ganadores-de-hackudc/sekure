/**
 * Sekure — Client-side cryptographic module.
 *
 * All vault encryption/decryption happens here in the browser.
 * The backend NEVER sees plaintext passwords (zero-knowledge architecture).
 *
 * Algorithms:
 *   - Key derivation: PBKDF2-HMAC-SHA256 (600 000 iterations)
 *   - Encryption:     AES-256-GCM (96-bit IV)
 *   - IV generation:  crypto.getRandomValues ⊕ random.org (double entropy)
 */

const ITERATIONS = 600_000;
const IV_BYTES = 12;       // 96-bit nonce for GCM
const SALT_BYTES = 32;
const KEY_BITS = 256;

// ─── Helpers ──────────────────────────────────────────

function b64Encode(buf: ArrayBuffer | Uint8Array): string {
    const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
}

function b64Decode(b64: string): Uint8Array<ArrayBuffer> {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes as Uint8Array<ArrayBuffer>;
}

// ─── Random.org entropy (best-effort) ─────────────────

let randomOrgCache: Uint8Array[] = [];
let randomOrgFetchPromise: Promise<void> | null = null;

/**
 * Pre-fetch random bytes from random.org and cache them.
 * Uses the JSON-RPC API (free tier: up to 1 000 000 bits/day).
 */
async function prefetchRandomOrgBytes(): Promise<void> {
    try {
        const res = await fetch('https://www.random.org/integers/?num=64&min=0&max=255&col=1&base=10&format=plain&rnd=new', {
            signal: AbortSignal.timeout(4000),
        });
        if (!res.ok) return;
        const text = await res.text();
        const numbers = text.trim().split(/\s+/).map(Number).filter(n => !isNaN(n));
        if (numbers.length > 0) {
            randomOrgCache.push(new Uint8Array(numbers));
        }
    } catch {
        // Silently fail — local CSPRNG is always the fallback
    }
}

/**
 * Generate a secure IV by XOR-ing local CSPRNG with random.org bytes.
 * If random.org is unavailable, falls back to pure crypto.getRandomValues.
 */
async function generateSecureIV(): Promise<Uint8Array<ArrayBuffer>> {
    const localIV = crypto.getRandomValues(new Uint8Array(IV_BYTES));

    // Try to get random.org bytes (non-blocking: use cache or fetch)
    if (randomOrgCache.length === 0 && !randomOrgFetchPromise) {
        randomOrgFetchPromise = prefetchRandomOrgBytes().finally(() => { randomOrgFetchPromise = null; });
    }

    // If cache is available, XOR with local IV for double entropy
    if (randomOrgCache.length > 0) {
        const remoteBytes = randomOrgCache.shift()!;
        for (let i = 0; i < IV_BYTES; i++) {
            localIV[i] ^= remoteBytes[i % remoteBytes.length];
        }
    }

    return localIV as Uint8Array<ArrayBuffer>;
}

// Kick off background pre-fetch on module load
prefetchRandomOrgBytes();


// ─── Key Derivation ───────────────────────────────────

/**
 * Derive an AES-256 CryptoKey from a master password + salt.
 * Mirrors the backend's PBKDF2-HMAC-SHA256 with 600k iterations.
 */
export async function deriveKey(masterPassword: string, saltB64: string): Promise<CryptoKey> {
    const salt = b64Decode(saltB64);
    const enc = new TextEncoder();

    const baseKey = await crypto.subtle.importKey(
        'raw',
        enc.encode(masterPassword),
        'PBKDF2',
        false,
        ['deriveKey'],
    );

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt,
            iterations: ITERATIONS,
            hash: 'SHA-256',
        },
        baseKey,
        { name: 'AES-GCM', length: KEY_BITS },
        true,   // extractable so we can export for storage
        ['encrypt', 'decrypt'],
    );
}

/**
 * Derive the verification hash (for auth — NOT the encryption key).
 * Uses the same salt + "_verify" suffix, matching the backend's
 * `hash_master_password()`.
 */
export async function hashMasterPassword(masterPassword: string, saltB64: string): Promise<string> {
    const salt = b64Decode(saltB64);
    const verifySalt = new Uint8Array(salt.length + 7);
    verifySalt.set(salt);
    verifySalt.set(new TextEncoder().encode('_verify'), salt.length);

    const enc = new TextEncoder();

    const baseKey = await crypto.subtle.importKey(
        'raw',
        enc.encode(masterPassword),
        'PBKDF2',
        false,
        ['deriveBits'],
    );

    const bits = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: verifySalt,
            iterations: ITERATIONS,
            hash: 'SHA-256',
        },
        baseKey,
        256,
    );

    return b64Encode(bits);
}


// ─── AES-256-GCM Encrypt / Decrypt ───────────────────

export interface EncryptedPayload {
    encrypted_password: string;   // base64 ciphertext
    iv: string;                   // base64 IV
}

/**
 * Encrypt a plaintext password using AES-256-GCM.
 * IV is sourced from local CSPRNG ⊕ random.org (double entropy).
 */
export async function encryptPassword(plaintext: string, key: CryptoKey): Promise<EncryptedPayload> {
    const iv = await generateSecureIV();
    const enc = new TextEncoder();

    const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        enc.encode(plaintext),
    );

    return {
        encrypted_password: b64Encode(ciphertext),
        iv: b64Encode(iv),
    };
}

/**
 * Decrypt an AES-256-GCM ciphertext.
 */
export async function decryptPassword(encryptedB64: string, ivB64: string, key: CryptoKey): Promise<string> {
    const ciphertext = b64Decode(encryptedB64);
    const iv = b64Decode(ivB64);

    const plaintext = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        ciphertext,
    );

    return new TextDecoder().decode(plaintext);
}


// ─── Key export / import for in-memory storage ───────

/**
 * Export a CryptoKey to a base64 string (for storing in sessionStorage / state).
 */
export async function exportKey(key: CryptoKey): Promise<string> {
    const raw = await crypto.subtle.exportKey('raw', key);
    return b64Encode(raw);
}

/**
 * Import a base64 string back into a CryptoKey.
 */
export async function importKey(keyB64: string): Promise<CryptoKey> {
    const raw = b64Decode(keyB64);
    return crypto.subtle.importKey(
        'raw',
        raw,
        { name: 'AES-GCM', length: KEY_BITS },
        true,
        ['encrypt', 'decrypt'],
    );
}


// ─── Kids account key derivation ─────────────────────

/**
 * Derive the encryption key for a kids account vault.
 * Mirrors backend's `_get_kid_encryption_key()`.
 */
export async function deriveKidsKey(kidId: number, parentId: number, saltB64: string): Promise<CryptoKey> {
    const salt = b64Decode(saltB64);
    const passphrase = `sekure_kids_${kidId}_${parentId}`;
    const enc = new TextEncoder();

    const baseKey = await crypto.subtle.importKey(
        'raw',
        enc.encode(passphrase),
        'PBKDF2',
        false,
        ['deriveKey'],
    );

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt,
            iterations: ITERATIONS,
            hash: 'SHA-256',
        },
        baseKey,
        { name: 'AES-GCM', length: KEY_BITS },
        true,
        ['encrypt', 'decrypt'],
    );
}
