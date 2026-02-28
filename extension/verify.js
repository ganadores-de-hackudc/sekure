/**
 * Sekure Extension — Biometric Verification Page
 * Opens as a small popup window, performs WebAuthn user verification,
 * then sends the result back to the background service worker.
 */
(async () => {
    const status = document.getElementById('status');
    const spinner = document.getElementById('spinner');
    const errorMsg = document.getElementById('errorMsg');
    const retryBtn = document.getElementById('retryBtn');

    async function verify() {
        status.textContent = 'Esperando verificación…';
        spinner.style.display = 'block';
        errorMsg.style.display = 'none';
        retryBtn.style.display = 'none';

        try {
            // Read credential from localStorage (same extension origin as popup)
            const raw = localStorage.getItem('sekure_bio_ext');
            if (!raw) {
                throw new Error('No hay credencial biométrica registrada.');
            }
            const { credentialId } = JSON.parse(raw);
            if (!credentialId) {
                throw new Error('Credencial inválida.');
            }

            await navigator.credentials.get({
                publicKey: {
                    challenge: crypto.getRandomValues(new Uint8Array(32)),
                    allowCredentials: [{
                        id: new Uint8Array(credentialId),
                        type: 'public-key',
                    }],
                    userVerification: 'required',
                    timeout: 60000,
                },
            });

            // Success — notify background
            status.textContent = '✓ Verificado';
            spinner.style.display = 'none';
            chrome.runtime.sendMessage({ type: 'SEKURE_BIO_RESULT', success: true });

            // Close after brief delay so user sees confirmation
            setTimeout(() => window.close(), 350);
        } catch (err) {
            spinner.style.display = 'none';

            if (err?.name === 'NotAllowedError') {
                status.textContent = 'Verificación cancelada';
                errorMsg.textContent = 'Puedes cerrar esta ventana o reintentar.';
            } else {
                status.textContent = 'Error';
                errorMsg.textContent = err?.message || 'Error desconocido';
            }
            errorMsg.style.display = 'block';
            retryBtn.style.display = 'inline-block';

            // Notify background of failure
            chrome.runtime.sendMessage({ type: 'SEKURE_BIO_RESULT', success: false });
        }
    }

    retryBtn.addEventListener('click', verify);

    // Auto-start verification
    verify();
})();
