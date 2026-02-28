/**
 * Sekure Extension — Popup Script
 */
const API_BASE = 'https://sekure-woad.vercel.app/api';

// ─── DOM refs ───
const loginView = document.getElementById('loginView');
const dashboardView = document.getElementById('dashboardView');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const togglePasswordBtn = document.getElementById('togglePassword');
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');
const searchInput = document.getElementById('searchInput');
const passwordList = document.getElementById('passwordList');
const loadingSpinner = document.getElementById('loadingSpinner');
const emptyState = document.getElementById('emptyState');
const totalCount = document.getElementById('totalCount');
const currentSiteSection = document.getElementById('currentSiteSection');
const currentSiteList = document.getElementById('currentSiteList');
const passwordCount = document.getElementById('passwordCount');
const toastContainer = document.getElementById('toastContainer');

// ─── Clipboard helper (fallback for extension popups) ───
async function copyToClipboard(text) {
    if (typeof text !== 'string' || !text) {
        throw new Error('Nada que copiar');
    }
    // Try Clipboard API first
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        try {
            await navigator.clipboard.writeText(text);
            return;
        } catch { /* fall through to fallback */ }
    }
    // Fallback: textarea + execCommand
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;left:-9999px';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    if (!ok) throw new Error('No se pudo copiar al portapapeles');
}

let allEntries = [];
let currentTabUrl = '';
let _bioLastVerified = 0;
const BIO_GRACE_MS = 30 * 1000; // 30 seconds

// ─── Biometric helpers ───
async function isBioAvailable() {
    if (!window.PublicKeyCredential) return false;
    try { return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(); }
    catch { return false; }
}

function isBioEnabled() {
    try {
        const d = JSON.parse(localStorage.getItem('sekure_bio_ext') || 'null');
        return !!d?.credentialId;
    } catch { return false; }
}

async function registerBio() {
    const { username } = await chrome.storage.local.get('username');
    const credential = await navigator.credentials.create({
        publicKey: {
            challenge: crypto.getRandomValues(new Uint8Array(32)),
            rp: { name: 'Sekure Extension' },
            user: {
                id: new TextEncoder().encode(username || 'user'),
                name: username || 'user',
                displayName: username || 'user',
            },
            pubKeyCredParams: [
                { alg: -7, type: 'public-key' },
                { alg: -257, type: 'public-key' },
            ],
            authenticatorSelection: {
                authenticatorAttachment: 'platform',
                userVerification: 'required',
                residentKey: 'discouraged',
            },
            timeout: 60000,
        },
    });
    if (!credential) throw new Error('Cancelado');
    const rawId = Array.from(new Uint8Array(credential.rawId));
    localStorage.setItem('sekure_bio_ext', JSON.stringify({ credentialId: rawId }));
}

function disableBio() {
    localStorage.removeItem('sekure_bio_ext');
    _bioLastVerified = 0;
}

async function requireBio() {
    if (!isBioEnabled()) return;
    if (Date.now() - _bioLastVerified < BIO_GRACE_MS) return;
    const { credentialId } = JSON.parse(localStorage.getItem('sekure_bio_ext'));
    await navigator.credentials.get({
        publicKey: {
            challenge: crypto.getRandomValues(new Uint8Array(32)),
            allowCredentials: [{ id: new Uint8Array(credentialId), type: 'public-key' }],
            userVerification: 'required',
            timeout: 60000,
        },
    });
    _bioLastVerified = Date.now();
}

// ─── Biometric toggle UI ───
async function setupBioToggle() {
    const btn = document.getElementById('bioToggleBtn');
    if (!btn) return;
    const available = await isBioAvailable();
    if (!available) { btn.style.display = 'none'; return; }
    btn.style.display = 'inline-flex';
    updateBioBtn(btn);
    btn.onclick = async () => {
        try {
            if (isBioEnabled()) {
                disableBio();
                showToast('Bloqueo biométrico desactivado');
            } else {
                await registerBio();
                showToast('Bloqueo biométrico activado');
            }
            updateBioBtn(btn);
        } catch (err) {
            if (err?.name === 'NotAllowedError') {
                showToast('Verificación cancelada', 'error');
            } else {
                showToast('Error al configurar biometría', 'error');
            }
        }
    };
}

function updateBioBtn(btn) {
    const enabled = isBioEnabled();
    btn.textContent = enabled ? '🔒' : '🔓';
    btn.style.background = enabled ? 'var(--sekure-50, #f0f9ff)' : 'transparent';
    btn.title = enabled ? 'Bloqueo biométrico: activado' : 'Bloqueo biométrico: desactivado';
}

// ─── Toast ───
function showToast(text, type = 'success') {
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            ${type === 'success'
            ? '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'
            : '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>'}
        </svg>
        ${text}`;
    toastContainer.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 2500);
}

// ─── API helpers ───
async function apiRequest(url, options = {}) {
    const { token } = await chrome.storage.local.get('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}${url}`, { headers, ...options });
    if (!res.ok) {
        if (res.status === 401) {
            await chrome.storage.local.remove(['token', 'username']);
            throw new Error('Sesión expirada');
        }
        const err = await res.json().catch(() => ({ detail: 'Error desconocido' }));
        throw new Error(err.detail || `Error ${res.status}`);
    }
    return res.json();
}

// ─── Auth ───
async function doLogin(user, pass) {
    const res = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: user, master_password: pass }),
    });
    await chrome.storage.local.set({ token: res.token, username: res.user.username });

    // Derive encryption key and store in session storage
    const key = await SEKURE_CRYPTO.deriveKey(pass, res.salt);
    const exportedKey = await SEKURE_CRYPTO.exportKey(key);
    await chrome.storage.session.set({ encryptionKey: exportedKey, salt: res.salt });

    return res;
}

async function doLogout() {
    try { await apiRequest('/auth/logout', { method: 'POST' }); } catch { }
    await chrome.storage.local.remove(['token', 'username']);
    await chrome.storage.session.remove(['encryptionKey', 'salt']);
}

// ─── Data ───
async function fetchVault() {
    return apiRequest('/vault');
}

async function fetchDecryptedPassword(id) {
    const entry = await apiRequest(`/vault/${id}`);
    if (!entry || !entry.encrypted_password || !entry.iv) {
        throw new Error('No se pudo obtener la contraseña cifrada.');
    }
    const { encryptionKey } = await chrome.storage.session.get('encryptionKey');
    if (!encryptionKey) {
        // Key lost (e.g. browser restart) — force re-login
        await chrome.storage.local.remove(['token', 'username']);
        throw new Error('Sesión expirada. Inicia sesión de nuevo.');
    }
    const key = await SEKURE_CRYPTO.importKey(encryptionKey);
    try {
        const decrypted = await SEKURE_CRYPTO.decryptPassword(entry.encrypted_password, entry.iv, key);
        if (decrypted === undefined || decrypted === null) {
            throw new Error('Error al descifrar la contraseña.');
        }
        return decrypted;
    } catch (cryptoErr) {
        // Decryption failed — key probably doesn't match
        throw new Error('Error al descifrar. Cierra sesión y vuelve a iniciar.');
    }
}

// ─── URL matching ───
function extractDomain(url) {
    try {
        const u = new URL(url);
        return u.hostname.replace(/^www\./, '');
    } catch { return ''; }
}

function matchesDomain(entryUrl, domain) {
    if (!entryUrl || !domain) return false;
    const entryDomain = extractDomain(
        entryUrl.startsWith('http') ? entryUrl : `https://${entryUrl}`
    );
    return entryDomain === domain || entryDomain.endsWith(`.${domain}`) || domain.endsWith(`.${entryDomain}`);
}

// ─── Render ───
function createPasswordItem(entry, showCopyBtn = true) {
    const div = document.createElement('div');
    div.className = 'password-item';

    const rawUrl = entry.url && entry.url.startsWith('http') ? entry.url : (entry.url ? `https://${entry.url}` : '');
    const domain = rawUrl ? extractDomain(rawUrl) : null;
    const fallbackSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>';
    let iconHTML = '';
    if (domain) {
        iconHTML = `<img class="favicon-img" src="https://www.google.com/s2/favicons?domain=${domain}&sz=64" alt="${domain}" style="width:20px;height:20px;border-radius:4px;object-fit:contain;"/>`;
    } else {
        iconHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
    }

    div.innerHTML = `
        <div class="password-icon">${iconHTML}</div>
        <div class="password-info">
            <div class="password-title">${escapeHtml(entry.title)}</div>
            ${entry.username ? `<div class="password-user">${escapeHtml(entry.username)}</div>` : ''}
        </div>
        <div class="password-actions">
            <button class="btn-ghost copy-user-btn" title="Copiar usuario" ${!entry.username ? 'style="display:none;"' : ''}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
            </button>
            <button class="btn-ghost copy-pw-btn" title="Copiar contraseña">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                </svg>
            </button>
            <button class="btn-ghost fill-btn" title="Autocompletar en la página">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
            </button>
        </div>
    `;

    // Favicon error fallback (inline onerror blocked by MV3 CSP)
    const faviconImg = div.querySelector('.favicon-img');
    if (faviconImg) {
        faviconImg.addEventListener('error', () => {
            faviconImg.parentElement.innerHTML = fallbackSVG;
        });
    }

    // Copy username
    div.querySelector('.copy-user-btn')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (entry.username) {
            await copyToClipboard(entry.username);
            showToast('Usuario copiado');
        }
    });

    // Copy password
    div.querySelector('.copy-pw-btn').addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
            await requireBio();
            const pw = await fetchDecryptedPassword(entry.id);
            if (!pw) {
                showToast('No se pudo descifrar la contraseña', 'error');
                return;
            }
            await copyToClipboard(pw);
            showToast('Contraseña copiada');
        } catch (err) {
            console.error('Error al copiar contraseña:', err);
            const msg = (err && err.message) ? err.message : 'Error al copiar';
            if (msg.includes('Sesión expirada') || msg.includes('Cierra sesión')) {
                showLogin();
            }
            showToast(msg, 'error');
        }
    });

    // Autofill in page (requires master password confirmation)
    div.querySelector('.fill-btn').addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
            await requireBio();
            const pw = await fetchDecryptedPassword(entry.id);
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab?.id) {
                await chrome.tabs.sendMessage(tab.id, {
                    type: 'SEKURE_AUTOFILL',
                    username: entry.username || '',
                    password: pw,
                });
                showToast('Credenciales introducidas');
                setTimeout(() => window.close(), 600);
            }
        } catch (err) {
            if (err && err.message === 'Cancelado') return;
            const msg = (err && err.message) ? err.message : 'Error al autocompletar';
            if (msg.includes('Sesión expirada') || msg.includes('Cierra sesión')) {
                showLogin();
            }
            showToast(msg, 'error');
        }
    });

    return div;
}

function escapeHtml(text) {
    const el = document.createElement('span');
    el.textContent = text;
    return el.innerHTML;
}

function renderPasswords(entries, container) {
    container.innerHTML = '';
    entries.forEach(entry => {
        container.appendChild(createPasswordItem(entry));
    });
}

function filterAndRender() {
    const q = searchInput.value.toLowerCase().trim();
    const filtered = q
        ? allEntries.filter(e =>
            e.title.toLowerCase().includes(q) ||
            (e.username && e.username.toLowerCase().includes(q)) ||
            (e.url && e.url.toLowerCase().includes(q))
        )
        : allEntries;

    loadingSpinner.style.display = 'none';

    if (filtered.length === 0) {
        passwordList.style.display = 'none';
        emptyState.style.display = 'block';
    } else {
        emptyState.style.display = 'none';
        passwordList.style.display = 'flex';
        renderPasswords(filtered, passwordList);
    }
}

async function loadDashboard() {
    const { username } = await chrome.storage.local.get('username');
    userName.textContent = username || 'Usuario';
    userAvatar.textContent = (username || 'U')[0].toUpperCase();

    loginView.style.display = 'none';
    dashboardView.style.display = 'block';
    logoutBtn.style.display = 'flex';
    loadingSpinner.style.display = 'block';
    passwordList.style.display = 'none';
    emptyState.style.display = 'none';

    // Set up biometric toggle
    setupBioToggle();

    try {
        // Get current tab URL
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        currentTabUrl = tab?.url || '';
        const currentDomain = extractDomain(currentTabUrl);

        allEntries = await fetchVault();
        totalCount.textContent = `${allEntries.length} contraseña${allEntries.length !== 1 ? 's' : ''}`;

        // Separate current-site entries
        if (currentDomain) {
            const siteEntries = allEntries.filter(e => matchesDomain(e.url, currentDomain));
            if (siteEntries.length > 0) {
                currentSiteSection.style.display = 'block';
                renderPasswords(siteEntries, currentSiteList);
            } else {
                currentSiteSection.style.display = 'none';
            }
        }

        filterAndRender();
    } catch (err) {
        loadingSpinner.style.display = 'none';
        if (err.message === 'Sesión expirada') {
            showLogin();
            showToast('Sesión expirada. Inicia sesión de nuevo.', 'error');
        } else {
            showToast(err.message, 'error');
        }
    }
}

function showLogin() {
    loginView.style.display = 'block';
    dashboardView.style.display = 'none';
    logoutBtn.style.display = 'none';
    loginError.style.display = 'none';
    usernameInput.value = '';
    passwordInput.value = '';
}

// ─── Events ───
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.style.display = 'none';
    loginBtn.disabled = true;
    loginBtn.textContent = 'Conectando...';

    try {
        await doLogin(usernameInput.value, passwordInput.value);
        await loadDashboard();
    } catch (err) {
        loginError.textContent = err.message;
        loginError.style.display = 'block';
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Iniciar sesión';
    }
});

logoutBtn.addEventListener('click', async () => {
    await doLogout();
    showLogin();
    showToast('Sesión cerrada');
});

togglePasswordBtn.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    togglePasswordBtn.innerHTML = isPassword
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
});

searchInput.addEventListener('input', () => {
    filterAndRender();
});

// ─── Init ───
(async () => {
    const { token } = await chrome.storage.local.get('token');
    if (token) {
        await loadDashboard();
    } else {
        showLogin();
    }
})();
