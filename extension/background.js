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

// ─── Message handler ───
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
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
        handleGetDecrypted(msg.entryId).then(sendResponse).catch(e => sendResponse({ error: e.message }));
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
