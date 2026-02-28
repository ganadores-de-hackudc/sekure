/**
 * Sekure Extension — Client-side Cryptography
 * PBKDF2-HMAC-SHA256 (600k iterations) + AES-256-GCM
 * Mirrors frontend/src/crypto.ts for zero-knowledge architecture.
 */

const SEKURE_CRYPTO = (() => {
    const ITERATIONS = 600_000;
    const IV_BYTES = 12;
    const KEY_BITS = 256;

    // ─── Random.org entropy mixing ───
    let randomOrgCache = [];

    async function prefetchRandomOrgBytes() {
        try {
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), 4000);
            const res = await fetch(
                'https://www.random.org/integers/?num=64&min=0&max=255&col=1&base=10&format=plain&rnd=new',
                { signal: ctrl.signal }
            );
            clearTimeout(timer);
            if (res.ok) {
                const text = await res.text();
                randomOrgCache = text.trim().split('\n').map(Number).filter(n => !isNaN(n));
            }
        } catch { /* fallback to pure CSPRNG */ }
    }

    // Pre-fetch on load
    prefetchRandomOrgBytes();

    function generateSecureIV() {
        const localIV = crypto.getRandomValues(new Uint8Array(IV_BYTES));
        if (randomOrgCache.length >= IV_BYTES) {
            const extra = randomOrgCache.splice(0, IV_BYTES);
            for (let i = 0; i < IV_BYTES; i++) localIV[i] ^= extra[i];
            if (randomOrgCache.length < IV_BYTES) prefetchRandomOrgBytes();
        }
        return localIV;
    }

    // ─── Helpers ───
    function b64ToBytes(b64) {
        return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    }

    function bytesToB64(buf) {
        return btoa(String.fromCharCode(...new Uint8Array(buf)));
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // ─── Key derivation ───
    async function deriveKey(masterPassword, saltB64) {
        const salt = b64ToBytes(saltB64);
        const keyMaterial = await crypto.subtle.importKey(
            'raw', encoder.encode(masterPassword), 'PBKDF2', false, ['deriveKey']
        );
        return crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
            keyMaterial,
            { name: 'AES-GCM', length: KEY_BITS },
            true,
            ['encrypt', 'decrypt']
        );
    }

    // ─── Encrypt ───
    async function encryptPassword(plaintext, key) {
        const iv = generateSecureIV();
        const ciphertext = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            key,
            encoder.encode(plaintext)
        );
        return {
            encrypted_password: bytesToB64(ciphertext),
            iv: bytesToB64(iv),
        };
    }

    // ─── Decrypt ───
    async function decryptPassword(encryptedB64, ivB64, key) {
        const ciphertext = b64ToBytes(encryptedB64);
        const iv = b64ToBytes(ivB64);
        const plainBuf = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            ciphertext
        );
        return decoder.decode(plainBuf);
    }

    // ─── Export / Import key ───
    async function exportKey(key) {
        const raw = await crypto.subtle.exportKey('raw', key);
        return bytesToB64(raw);
    }

    async function importKey(keyB64) {
        const raw = b64ToBytes(keyB64);
        return crypto.subtle.importKey(
            'raw', raw, { name: 'AES-GCM', length: KEY_BITS }, true, ['encrypt', 'decrypt']
        );
    }

    return {
        deriveKey,
        encryptPassword,
        decryptPassword,
        exportKey,
        importKey,
    };
})();
