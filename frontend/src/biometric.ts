/**
 * Biometric authentication gate using WebAuthn platform authenticator.
 * Uses Windows Hello / Touch ID / Face ID / Android biometrics / device PIN
 * depending on the user's device.
 *
 * This is a client-side UX gate — the encryption key is already in memory,
 * so this adds a "verify it's you" prompt before sensitive operations.
 */

const STORAGE_KEY = 'sekure_biometric_cred';
const LAST_VERIFIED_KEY = 'sekure_bio_last_verified';
const GRACE_PERIOD_MS = 2 * 60 * 1000; // 2 minutes

/** Check if this device supports a platform authenticator (fingerprint, face, PIN). */
export async function isBiometricAvailable(): Promise<boolean> {
    if (!window.PublicKeyCredential) return false;
    try {
        return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
        return false;
    }
}

/** Check whether the current user has registered a biometric credential. */
export function isBiometricEnabled(): boolean {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return false;
    try {
        const data = JSON.parse(stored);
        return !!data?.credentialId;
    } catch {
        return false;
    }
}

/** Register a new biometric credential for the current user. */
export async function registerBiometric(username: string): Promise<void> {
    const credential = await navigator.credentials.create({
        publicKey: {
            challenge: crypto.getRandomValues(new Uint8Array(32)),
            rp: { name: 'Sekure' },
            user: {
                id: new TextEncoder().encode(username),
                name: username,
                displayName: username,
            },
            pubKeyCredParams: [
                { alg: -7, type: 'public-key' },   // ES256
                { alg: -257, type: 'public-key' },  // RS256
            ],
            authenticatorSelection: {
                authenticatorAttachment: 'platform',
                userVerification: 'required',
                residentKey: 'discouraged',
            },
            timeout: 60000,
        },
    }) as PublicKeyCredential | null;

    if (!credential) throw new Error('Biometric registration cancelled');

    // Store the credential ID so we can use it for verification later
    const rawId = Array.from(new Uint8Array(credential.rawId));
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ credentialId: rawId }));

    // Mark as just verified
    sessionStorage.setItem(LAST_VERIFIED_KEY, Date.now().toString());
}

/** Remove the stored biometric credential. */
export function disableBiometric(): void {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(LAST_VERIFIED_KEY);
}

/**
 * Prompt the user for biometric/PIN verification.
 * Returns true if verified, throws if cancelled/failed.
 */
async function verifyBiometric(): Promise<boolean> {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) throw new Error('No biometric credential registered');

    const { credentialId } = JSON.parse(stored);
    const id = new Uint8Array(credentialId);

    await navigator.credentials.get({
        publicKey: {
            challenge: crypto.getRandomValues(new Uint8Array(32)),
            allowCredentials: [{ id, type: 'public-key' }],
            userVerification: 'required',
            timeout: 60000,
        },
    });

    // If we reach here, verification succeeded
    sessionStorage.setItem(LAST_VERIFIED_KEY, Date.now().toString());
    return true;
}

/**
 * Main gate function: if biometric is enabled, check grace period or prompt.
 * If biometric is not enabled, passes through silently.
 * Throws if the user cancels the biometric prompt.
 */
export async function requireBiometric(): Promise<void> {
    if (!isBiometricEnabled()) return;

    // Check grace period — skip prompt if recently verified
    const lastStr = sessionStorage.getItem(LAST_VERIFIED_KEY);
    if (lastStr) {
        const elapsed = Date.now() - parseInt(lastStr, 10);
        if (elapsed < GRACE_PERIOD_MS) return;
    }

    await verifyBiometric();
}
