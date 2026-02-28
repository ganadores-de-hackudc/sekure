/**
 * Sekure Extension — Background Service Worker
 * Handles API communication and messaging between popup/content scripts.
 */

importScripts('crypto.js');

const API_BASE = 'https://sekure-woad.vercel.app/api';

// ─── API helper ───
async function apiRequest(url, options = {}) {
    const { token } = await chrome.storage.local.get('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}${url}`, { headers, ...options });
    if (!res.ok) {
        if (res.status === 401) {
            await chrome.storage.local.remove(['token', 'username']);
        }
        const err = await res.json().catch(() => ({ detail: 'Error' }));
        throw new Error(err.detail || `Error ${res.status}`);
    }
    return res.json();
}

// ─── Biometric verification via popup window ───
let _bioVerifyResolve = null;
let _bioVerifyWindowId = null;

async function requireBioVerification() {
    const { sekure_bio_enabled } = await chrome.storage.local.get('sekure_bio_enabled');
    if (!sekure_bio_enabled) return true; // bio not enabled, allow

    return new Promise((resolve) => {
        _bioVerifyResolve = resolve;
        chrome.windows.create({
            url: chrome.runtime.getURL('verify.html'),
            type: 'popup',
            width: 380,
            height: 320,
            focused: true,
        }).then((win) => {
            _bioVerifyWindowId = win.id;
        }).catch(() => {
            _bioVerifyResolve = null;
            resolve(false);
        });

        // Timeout after 60 seconds
        setTimeout(() => {
            if (_bioVerifyResolve === resolve) {
                _bioVerifyResolve = null;
                _bioVerifyWindowId = null;
                resolve(false);
            }
        }, 60000);
    });
}

// Close verification window if user dismisses it without completing
chrome.windows.onRemoved.addListener((windowId) => {
    if (windowId === _bioVerifyWindowId && _bioVerifyResolve) {
        _bioVerifyResolve(false);
        _bioVerifyResolve = null;
        _bioVerifyWindowId = null;
    }
});

// ─── Message handler ───
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'SEKURE_BIO_RESULT') {
        if (_bioVerifyResolve) {
            _bioVerifyResolve(msg.success);
            _bioVerifyResolve = null;
        }
        // Close the verification window
        if (_bioVerifyWindowId) {
            chrome.windows.remove(_bioVerifyWindowId).catch(() => { });
            _bioVerifyWindowId = null;
        }
        sendResponse({ ok: true });
        return true;
    }

    if (msg.type === 'SEKURE_GET_ENTRIES') {
        handleGetEntries(msg.domain).then(sendResponse).catch(e => sendResponse({ error: e.message }));
        return true; // keep channel open for async response
    }

    if (msg.type === 'SEKURE_SAVE_PASSWORD') {
        handleSavePassword(msg.data).then(sendResponse).catch(e => sendResponse({ error: e.message }));
        return true;
    }

    if (msg.type === 'SEKURE_CHECK_AUTH') {
        chrome.storage.local.get(['token', 'username']).then(({ token, username }) => {
            sendResponse({ authenticated: !!token, username });
        });
        return true;
    }

    if (msg.type === 'SEKURE_GET_DECRYPTED') {
        // If request comes from a content script (sender.tab), gate behind bio
        (async () => {
            try {
                if (sender.tab) {
                    const verified = await requireBioVerification();
                    if (!verified) {
                        sendResponse({ error: 'Verificación cancelada' });
                        return;
                    }
                }
                const result = await handleGetDecrypted(msg.entryId);
                sendResponse(result);
            } catch (e) {
                sendResponse({ error: e.message });
            }
        })();
        return true;
    }
});

// ─── Vault cache (30s TTL) ───
let _vaultCache = null;
let _vaultCacheTs = 0;
const CACHE_TTL = 30_000;

async function handleGetEntries(domain) {
    const { token } = await chrome.storage.local.get('token');
    if (!token) return { entries: [], allEntries: [], authenticated: false };

    try {
        const now = Date.now();
        let entries;
        if (_vaultCache && (now - _vaultCacheTs) < CACHE_TTL) {
            entries = _vaultCache;
        } else {
            entries = await apiRequest('/vault');
            _vaultCache = entries;
            _vaultCacheTs = now;
        }
        const matching = domain
            ? entries.filter(e => {
                if (!e.url) return false;
                const entryDomain = extractDomain(e.url.startsWith('http') ? e.url : `https://${e.url}`);
                return entryDomain === domain || entryDomain.endsWith(`.${domain}`) || domain.endsWith(`.${entryDomain}`);
            })
            : [];
        return { entries: matching, allEntries: entries, authenticated: true };
    } catch {
        return { entries: [], allEntries: [], authenticated: false };
    }
}

async function handleSavePassword(data) {
    const { token } = await chrome.storage.local.get('token');
    if (!token) throw new Error('No autenticado');

    const { encryptionKey } = await chrome.storage.session.get('encryptionKey');
    if (!encryptionKey) throw new Error('Clave no disponible. Inicia sesión de nuevo.');

    const key = await SEKURE_CRYPTO.importKey(encryptionKey);
    const { encrypted_password, iv } = await SEKURE_CRYPTO.encryptPassword(data.password, key);

    const entry = await apiRequest('/vault', {
        method: 'POST',
        body: JSON.stringify({
            title: data.title,
            username: data.username || '',
            url: data.url || '',
            encrypted_password,
            iv,
            notes: '',
        }),
    });
    // Invalidate cache after saving a new entry
    _vaultCache = null;
    return { success: true, entry };
}

async function handleGetDecrypted(entryId) {
    const entry = await apiRequest(`/vault/${entryId}`);
    const { encryptionKey } = await chrome.storage.session.get('encryptionKey');
    if (!encryptionKey) throw new Error('Clave no disponible. Inicia sesión de nuevo.');

    const key = await SEKURE_CRYPTO.importKey(encryptionKey);
    const password = await SEKURE_CRYPTO.decryptPassword(entry.encrypted_password, entry.iv, key);
    return { password, username: entry.username };
}

function extractDomain(url) {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return '';
    }
}
