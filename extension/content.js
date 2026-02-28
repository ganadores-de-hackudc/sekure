/**
 * Sekure Extension — Content Script
 *
 * 1. Detects password fields → shows autofill dropdown with matching entries
 * 2. Detects form submissions → offers to save new credentials
 */

(() => {
    // Avoid double-injection
    if (window.__sekureInjected) return;
    window.__sekureInjected = true;

    const DROPDOWN_ID = 'sekure-autofill-dropdown';
    const BANNER_ID = 'sekure-save-banner';
    const PENDING_KEY = 'sekure_pending_save';
    const DISMISSED_KEY = 'sekure_dismissed_saves';
    let currentDropdown = null;
    let currentPasswordField = null;
    let matchingEntries = [];
    let allVaultEntries = []; // full vault for cross-domain duplicate check
    let isAuthenticated = false;
    let currentSuggestedPassword = '';

    // Proactive credential tracking — stores the latest values as user types
    let trackedCredentials = { username: '', password: '' };

    // ─── Password Strength (client-side, mirrors backend logic) ───
    function calculateEntropy(password) {
        if (!password) return 0;
        let charset = 0;
        if (/[a-z]/.test(password)) charset += 26;
        if (/[A-Z]/.test(password)) charset += 26;
        if (/[0-9]/.test(password)) charset += 10;
        if (/[^a-zA-Z0-9]/.test(password)) charset += 32;
        if (charset === 0) charset = 128;
        return Math.round(password.length * Math.log2(charset) * 100) / 100;
    }

    function getStrengthInfo(entropy) {
        if (entropy < 28) return { label: 'Muy débil', score: 0, color: '#ef4444' };
        if (entropy < 36) return { label: 'Débil', score: 1, color: '#f97316' };
        if (entropy < 60) return { label: 'Moderada', score: 2, color: '#ca8a04' };
        if (entropy < 80) return { label: 'Fuerte', score: 3, color: '#9b1b2f' };
        return { label: 'Muy fuerte', score: 4, color: '#d43d55' };
    }

    function estimateCrackTime(entropy) {
        if (entropy <= 0) return 'Instantáneo';
        const guesses = Math.pow(2, entropy);
        const seconds = guesses / 10_000_000_000;
        if (seconds < 1) return 'Instantáneo';
        if (seconds < 60) return `${Math.round(seconds)} segundos`;
        if (seconds < 3600) return `${Math.round(seconds / 60)} minutos`;
        if (seconds < 86400) return `${Math.round(seconds / 3600)} horas`;
        if (seconds < 31536000) return `${Math.round(seconds / 86400)} días`;
        const years = seconds / 31536000;
        if (years < 1000) return `${Math.round(years)} años`;
        if (years < 1e6) return `${Math.round(years / 1000)} miles de años`;
        if (years < 1e9) return `${Math.round(years / 1e6)} millones de años`;
        return 'Más que la edad del universo';
    }

    // ─── Password Generation (client-side, mirrors backend logic) ───
    function generateSecurePassword(length = 20) {
        const lower = 'abcdefghijklmnopqrstuvwxyz';
        const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const digits = '0123456789';
        const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
        const all = lower + upper + digits + symbols;

        // Guarantee at least one from each set
        const required = [
            lower[cryptoRandBelow(lower.length)],
            upper[cryptoRandBelow(upper.length)],
            digits[cryptoRandBelow(digits.length)],
            symbols[cryptoRandBelow(symbols.length)],
        ];

        const remaining = [];
        for (let i = 0; i < length - required.length; i++) {
            remaining.push(all[cryptoRandBelow(all.length)]);
        }

        // Fisher-Yates shuffle
        const chars = [...required, ...remaining];
        for (let i = chars.length - 1; i > 0; i--) {
            const j = cryptoRandBelow(i + 1);
            [chars[i], chars[j]] = [chars[j], chars[i]];
        }
        return chars.join('');
    }

    function cryptoRandBelow(max) {
        const array = new Uint32Array(1);
        crypto.getRandomValues(array);
        return array[0] % max;
    }

    // Sekure's own domains — extension features are redundant here
    const SEKURE_DOMAINS = ['sekure-woad.vercel.app', 'sekure-cq2t.vercel.app', 'localhost'];
    function isSekureDomain(domain) {
        // Match exact domains, subdomains, and any sekure-*.vercel.app preview deployments
        return SEKURE_DOMAINS.some(d => domain === d || domain.endsWith('.' + d))
            || /^sekure[a-z0-9-]*\.vercel\.app$/i.test(domain);
    }

    // ─── Utility ───
    function extractDomain(url) {
        try { return new URL(url).hostname.replace(/^www\./, ''); }
        catch { return ''; }
    }

    const currentDomain = extractDomain(window.location.href);

    // Skip entirely on Sekure's own pages — the web app handles everything
    if (isSekureDomain(currentDomain)) return;

    // ─── Check auth & load entries ───
    async function init() {
        try {
            const res = await chrome.runtime.sendMessage({ type: 'SEKURE_GET_ENTRIES', domain: currentDomain });
            if (res && !res.error) {
                isAuthenticated = res.authenticated;
                matchingEntries = res.entries || [];
                allVaultEntries = res.allEntries || res.entries || [];
            }
        } catch { /* extension context invalidated */ }

        if (isAuthenticated) {
            observePasswordFields();
            // Don't offer to save passwords on Sekure's own login page
            if (!isSekureDomain(currentDomain)) {
                observeFormSubmissions();
                // Check if we have pending credentials from a previous page navigation
                checkPendingCredentials();
            }
        }
    }

    // ─── Password field detection ───
    function observePasswordFields() {
        // Process existing fields
        document.querySelectorAll('input[type="password"]').forEach(attachToField);

        // Watch for dynamically added fields
        const observer = new MutationObserver(mutations => {
            for (const m of mutations) {
                for (const node of m.addedNodes) {
                    if (node.nodeType !== 1) continue;
                    if (node.matches?.('input[type="password"]')) attachToField(node);
                    node.querySelectorAll?.('input[type="password"]')?.forEach(attachToField);
                }
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    function attachToField(field) {
        if (field.__sekureAttached) return;
        field.__sekureAttached = true;

        // Show Sekure dropdown on focus (entries + generator + strength)
        field.addEventListener('focus', () => {
            currentPasswordField = field;
            showDropdown(field);
        });

        field.addEventListener('click', () => {
            if (!currentDropdown) {
                showDropdown(field);
            }
        });

        // Update strength bar in real-time as user types
        field.addEventListener('input', () => {
            updateStrengthBar(field.value);
        });
    }

    // ─── Autofill Dropdown ───
    function showDropdown(field) {
        removeDropdown();
        currentSuggestedPassword = generateSecurePassword(20);

        const dropdown = document.createElement('div');
        dropdown.id = DROPDOWN_ID;

        // Position relative to the field
        const rect = field.getBoundingClientRect();
        dropdown.style.cssText = `
            position: fixed;
            top: ${rect.bottom + 4}px;
            left: ${rect.left}px;
            width: ${Math.max(rect.width, 300)}px;
            max-height: 380px;
            overflow-y: auto;
            z-index: 2147483647;
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            box-shadow: 0 12px 32px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.06);
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
            animation: sekureSlideIn 0.2s ease;
        `;

        // Header
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex; align-items: center; gap: 8px;
            padding: 10px 14px; border-bottom: 1px solid #f3f4f6;
            background: #fdf2f4;
            border-radius: 10px 10px 0 0;
        `;
        const logoUrl = chrome.runtime.getURL('icons/sekure-longlogo.svg');
        const entryCount = matchingEntries.length;
        header.innerHTML = `
            <img src="${logoUrl}" alt="Sekure" style="height:20px; width:auto;">
            <span style="font-size:11px; color:#9ca3af; margin-left:auto;">${entryCount} contraseña${entryCount !== 1 ? 's' : ''}</span>
        `;
        dropdown.appendChild(header);

        // Vault entries (if any)
        matchingEntries.forEach(entry => {
            const item = document.createElement('div');
            item.style.cssText = `
                display: flex; align-items: center; gap: 10px;
                padding: 10px 14px; cursor: pointer;
                transition: background 0.15s;
                border-bottom: 1px solid #f9fafb;
            `;
            item.innerHTML = `
                <div style="width:32px; height:32px; background:#f3f4f6; border-radius:6px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                    </svg>
                </div>
                <div style="flex:1; min-width:0;">
                    <div style="font-size:13px; font-weight:600; color:#1f2937; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(entry.title)}</div>
                    <div style="font-size:11px; color:#9ca3af; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(entry.username || '')}</div>
                </div>
            `;

            item.addEventListener('mouseenter', () => { item.style.background = '#f9fafb'; });
            item.addEventListener('mouseleave', () => { item.style.background = 'transparent'; });
            item.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                try {
                    const res = await chrome.runtime.sendMessage({ type: 'SEKURE_GET_DECRYPTED', entryId: entry.id });
                    if (res && !res.error) {
                        fillCredentials(field, entry.username || '', res.password);
                        removeDropdown();
                    }
                } catch { }
            });

            dropdown.appendChild(item);
        });

        // ─── Suggested Password Section ───
        const suggestSection = document.createElement('div');
        suggestSection.style.cssText = `
            border-top: 1px solid #e5e7eb;
            padding: 10px 14px;
            background: #fefce8;
        `;
        suggestSection.innerHTML = `
            <div style="display:flex; align-items:center; gap:6px; margin-bottom:8px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ca8a04" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                </svg>
                <span style="font-size:11px; font-weight:600; color:#854d0e;">Contraseña sugerida</span>
            </div>
            <div style="display:flex; align-items:center; gap:6px;">
                <div id="sekure-suggested-pw" style="
                    flex:1; font-size:12px; font-family:'Courier New',monospace; color:#1f2937;
                    background:#fffbeb; border:1px solid #fde68a; border-radius:6px;
                    padding:7px 10px; cursor:pointer; word-break:break-all;
                    transition: background 0.15s;
                    line-height:1.4;
                " title="Haz clic para usar esta contraseña">${escapeHtml(currentSuggestedPassword)}</div>
                <button id="sekure-regenerate" style="
                    background:none; border:1px solid #fde68a; border-radius:6px;
                    cursor:pointer; padding:6px; display:flex; align-items:center; justify-content:center;
                    color:#ca8a04; transition: background 0.15s;
                " title="Generar otra contraseña">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21.5 2v6h-6"/><path d="M2.5 22v-6h6"/>
                        <path d="M2 11.5a10 10 0 0 1 18.8-4.3"/><path d="M22 12.5a10 10 0 0 1-18.8 4.2"/>
                    </svg>
                </button>
            </div>
        `;
        dropdown.appendChild(suggestSection);

        // Suggested password click → fill into field
        setTimeout(() => {
            const suggestedEl = dropdown.querySelector('#sekure-suggested-pw');
            const regenBtn = dropdown.querySelector('#sekure-regenerate');

            if (suggestedEl) {
                suggestedEl.addEventListener('mouseenter', () => { suggestedEl.style.background = '#fef3c7'; });
                suggestedEl.addEventListener('mouseleave', () => { suggestedEl.style.background = '#fffbeb'; });
                suggestedEl.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setNativeValue(field, currentSuggestedPassword);
                    updateStrengthBar(currentSuggestedPassword);
                    removeDropdown();
                });
            }

            if (regenBtn) {
                regenBtn.addEventListener('mouseenter', () => { regenBtn.style.background = '#fef3c7'; });
                regenBtn.addEventListener('mouseleave', () => { regenBtn.style.background = 'transparent'; });
                regenBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    currentSuggestedPassword = generateSecurePassword(20);
                    if (suggestedEl) suggestedEl.textContent = currentSuggestedPassword;
                });
            }
        }, 0);

        // ─── Strength Bar Section ───
        const strengthSection = document.createElement('div');
        strengthSection.id = 'sekure-strength-section';
        strengthSection.style.cssText = `
            border-top: 1px solid #e5e7eb;
            padding: 10px 14px;
            background: #fafafa;
            border-radius: 0 0 10px 10px;
        `;

        const currentValue = field.value || '';
        const entropy = calculateEntropy(currentValue);
        const info = getStrengthInfo(entropy);
        const barWidth = currentValue ? (info.score + 1) * 20 : 0;
        const crackTime = currentValue ? estimateCrackTime(entropy) : '';

        strengthSection.innerHTML = `
            <div style="display:flex; align-items:center; gap:6px; margin-bottom:6px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <span style="font-size:11px; font-weight:600; color:#374151;">Fortaleza</span>
                <span id="sekure-strength-label" style="font-size:11px; font-weight:600; color:${info.color}; margin-left:auto;">
                    ${currentValue ? info.label : ''}
                </span>
            </div>
            <div style="width:100%; height:6px; background:#e5e7eb; border-radius:3px; overflow:hidden; margin-bottom:4px;">
                <div id="sekure-strength-bar" style="
                    height:100%; border-radius:3px;
                    background:${info.color};
                    width:${barWidth}%;
                    transition: width 0.3s ease, background 0.3s ease;
                "></div>
            </div>
            <div id="sekure-crack-time" style="font-size:10px; color:#9ca3af;">
                ${crackTime ? `Tiempo de crackeo: ${crackTime}` : 'Escribe para analizar la fortaleza'}
            </div>
        `;
        dropdown.appendChild(strengthSection);

        document.body.appendChild(dropdown);
        currentDropdown = dropdown;

        // Close on outside click
        setTimeout(() => {
            document.addEventListener('click', outsideClickHandler, true);
            document.addEventListener('keydown', escHandler, true);
        }, 10);
    }

    function updateStrengthBar(value) {
        const bar = document.getElementById('sekure-strength-bar');
        const label = document.getElementById('sekure-strength-label');
        const crackEl = document.getElementById('sekure-crack-time');
        if (!bar || !label || !crackEl) return;

        if (!value) {
            bar.style.width = '0%';
            bar.style.background = '#e5e7eb';
            label.textContent = '';
            crackEl.textContent = 'Escribe para analizar la fortaleza';
            return;
        }

        const entropy = calculateEntropy(value);
        const info = getStrengthInfo(entropy);
        const barWidth = (info.score + 1) * 20;
        const crackTime = estimateCrackTime(entropy);

        bar.style.width = `${barWidth}%`;
        bar.style.background = info.color;
        label.textContent = info.label;
        label.style.color = info.color;
        crackEl.textContent = `Tiempo de crackeo: ${crackTime}`;
    }

    function removeDropdown() {
        if (currentDropdown) {
            currentDropdown.remove();
            currentDropdown = null;
        }
        document.removeEventListener('click', outsideClickHandler, true);
        document.removeEventListener('keydown', escHandler, true);
    }

    function outsideClickHandler(e) {
        if (currentDropdown && !currentDropdown.contains(e.target) && e.target !== currentPasswordField) {
            removeDropdown();
        }
    }

    function escHandler(e) {
        if (e.key === 'Escape') removeDropdown();
    }

    // ─── Autofill ───
    function fillCredentials(passwordField, username, password) {
        // Fill password
        setNativeValue(passwordField, password);

        // Try to find the username field
        if (username) {
            const form = passwordField.closest('form') || document.body;
            const usernameField = findUsernameField(form, passwordField);
            if (usernameField) {
                setNativeValue(usernameField, username);
            }
        }
    }

    function setNativeValue(el, value) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype, 'value'
        ).set;
        nativeInputValueSetter.call(el, value);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function findUsernameField(container, passwordField) {
        // Look for common username/email fields before the password field
        const allInputs = Array.from(container.querySelectorAll(
            'input[type="text"], input[type="email"], input[type="tel"], input:not([type])'
        ));

        // Filter to visible inputs  
        const visible = allInputs.filter(i => {
            const r = i.getBoundingClientRect();
            return r.width > 0 && r.height > 0 && !i.hidden && getComputedStyle(i).display !== 'none';
        });

        // Try by common attributes first
        const byAttr = visible.find(i => {
            const attrs = [i.name, i.id, i.autocomplete, i.placeholder].join(' ').toLowerCase();
            return /user|email|login|correo|usuario|account|identifier/.test(attrs);
        });
        if (byAttr) return byAttr;

        // Fall back to the input right before the password field in DOM order
        const pwIndex = allInputs.indexOf(passwordField);
        if (pwIndex > 0) return allInputs[pwIndex - 1];

        return visible[0] || null;
    }

    // ─── Form submission detection (save password prompt) ───
    function observeFormSubmissions() {
        // 1. Track password/username field values as the user types
        trackCredentialInputs();

        // 2. On form submit, persist credentials to storage BEFORE page navigates
        document.addEventListener('submit', handleFormSubmit, true);

        // 3. Broad click listener for submit-like buttons (SPAs + traditional)
        document.addEventListener('click', handleButtonClick, true);

        // 4. Enter key on password fields
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target?.type === 'password' && e.target.value) {
                captureAndPersist();
            }
        }, true);
    }

    function trackCredentialInputs() {
        // Attach input listeners to all current and future password fields
        function trackField(field) {
            if (field.__sekureTracked) return;
            field.__sekureTracked = true;

            field.addEventListener('input', () => {
                trackedCredentials.password = field.value;
                // Also grab the username at this moment
                const form = field.closest('form');
                const container = form || field.closest('div, section, main, article') || document.body;
                const userField = findUsernameField(container, field);
                if (userField?.value) {
                    trackedCredentials.username = userField.value;
                }
            }, true);

            // Also capture on blur/change in case input event is suppressed
            field.addEventListener('change', () => {
                if (field.value) trackedCredentials.password = field.value;
            }, true);
        }

        document.querySelectorAll('input[type="password"]').forEach(trackField);

        const observer = new MutationObserver(mutations => {
            for (const m of mutations) {
                for (const node of m.addedNodes) {
                    if (node.nodeType !== 1) continue;
                    if (node.matches?.('input[type="password"]')) trackField(node);
                    node.querySelectorAll?.('input[type="password"]')?.forEach(trackField);
                }
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    async function captureAndPersist() {
        // Grab the latest credentials from all visible password fields
        let password = trackedCredentials.password;
        let username = trackedCredentials.username;

        // Also try to grab directly from visible fields as a fallback
        const pwFields = document.querySelectorAll('input[type="password"]');
        for (const f of pwFields) {
            if (f.value) {
                password = f.value;
                const container = f.closest('form') || f.closest('div, section, main, article') || document.body;
                const userField = findUsernameField(container, f);
                if (userField?.value) username = userField.value;
                break;
            }
        }

        if (!password) return;

        // Never save on Sekure's own pages
        if (isSekureDomain(currentDomain)) return;

        // Check if already saved (match by username on same domain)
        const alreadySaved = matchingEntries.some(e =>
            e.username === username || (!e.username && !username)
        );
        if (alreadySaved) return;

        // Check if this exact credential was already dismissed this session
        const dismissKey = `${currentDomain}|${username}`;
        try {
            const dismissed = await chrome.storage.local.get(DISMISSED_KEY);
            const list = dismissed[DISMISSED_KEY] || [];
            if (list.includes(dismissKey)) return;
        } catch { /* ignore */ }

        // Persist to chrome.storage so it survives page navigation
        const pending = {
            username,
            password,
            url: window.location.href,
            domain: currentDomain,
            timestamp: Date.now(),
        };

        chrome.storage.local.set({ [PENDING_KEY]: pending });
    }

    function handleFormSubmit(e) {
        const form = e.target;
        if (!(form instanceof HTMLFormElement)) return;

        const pwField = form.querySelector('input[type="password"]');
        if (!pwField || (!pwField.value && !trackedCredentials.password)) return;

        // Capture credentials and persist BEFORE navigation
        if (pwField.value) {
            trackedCredentials.password = pwField.value;
            const userField = findUsernameField(form, pwField);
            if (userField?.value) trackedCredentials.username = userField.value;
        }

        captureAndPersist();

        // Also try to show the banner immediately for SPA forms that don't navigate
        const username = trackedCredentials.username;
        const password = trackedCredentials.password;
        setTimeout(() => {
            maybeOfferSave(username, password);
        }, 1000);
    }

    function handleButtonClick(e) {
        // Match a wide range of submit-like elements
        const btn = e.target.closest(
            'button[type="submit"], input[type="submit"], button:not([type]), ' +
            'button[type="button"], [role="button"], a.btn, a.button, ' +
            '.submit-btn, .login-btn, .signin-btn, .signup-btn'
        );
        if (!btn) return;

        // Check if there's a password field anywhere nearby
        const form = btn.closest('form');
        const container = form || btn.closest('div, section, main, article, [class*="form"], [class*="login"], [class*="auth"]') || document.body;
        const pwField = container.querySelector('input[type="password"]');

        if (!pwField && !trackedCredentials.password) return;

        if (pwField?.value) {
            trackedCredentials.password = pwField.value;
            const userField = findUsernameField(container, pwField);
            if (userField?.value) trackedCredentials.username = userField.value;
        }

        if (!trackedCredentials.password) return;

        captureAndPersist();

        // For SPAs, try showing the banner after a delay
        const username = trackedCredentials.username;
        const password = trackedCredentials.password;
        setTimeout(() => {
            maybeOfferSave(username, password);
        }, 1500);
    }

    async function checkPendingCredentials() {
        try {
            const result = await chrome.storage.local.get(PENDING_KEY);
            const pending = result[PENDING_KEY];
            if (!pending) return;

            // Only show if recent (< 30 seconds) and matches this domain
            const age = Date.now() - pending.timestamp;
            if (age > 30000) {
                chrome.storage.local.remove(PENDING_KEY);
                return;
            }

            // Domain must match (allows for redirects within same domain or to dashboard)
            const pendingDomain = pending.domain;
            if (pendingDomain !== currentDomain &&
                !currentDomain.endsWith('.' + pendingDomain) &&
                !pendingDomain.endsWith('.' + currentDomain)) {
                // Different domain — still show if we just got redirected (common for OAuth)
                // But clear it after showing once
            }

            // Clear the pending data
            chrome.storage.local.remove(PENDING_KEY);

            // Never save on Sekure's own pages
            if (isSekureDomain(pendingDomain)) return;

            // Check if already saved — compare against current domain entries
            // and also re-fetch from the full vault to avoid stale cache
            const alreadySaved = matchingEntries.some(e =>
                e.username === pending.username || (!e.username && !pending.username)
            );
            if (alreadySaved) return;

            // Also check full vault entries (covers cross-domain match)
            const alreadyInVault = allVaultEntries.some(e => {
                if (!e.url) return false;
                const eDomain = extractDomain(e.url.startsWith('http') ? e.url : `https://${e.url}`);
                return (eDomain === pendingDomain || eDomain.endsWith('.' + pendingDomain) || pendingDomain.endsWith('.' + eDomain)) &&
                    (e.username === pending.username || (!e.username && !pending.username));
            });
            if (alreadyInVault) return;

            // Show the save banner with a small delay for the page to settle
            setTimeout(() => {
                showSaveBanner(pending.username, pending.password, pending.url, pendingDomain);
            }, 800);
        } catch { /* ignore */ }
    }

    function maybeOfferSave(username, password) {
        if (!isAuthenticated || !password) return;

        // Never on Sekure's own pages
        if (isSekureDomain(currentDomain)) return;

        // Check if already saved for this exact username on this domain
        const alreadySaved = matchingEntries.some(e =>
            e.username === username || (!e.username && !username)
        );
        if (alreadySaved) return;

        // Don't show if a banner is already visible
        if (document.getElementById(BANNER_ID)) return;

        showSaveBanner(username, password);
    }

    // ─── Save Password Banner ───
    function showSaveBanner(username, password, originalUrl, originalDomain) {
        const banner = document.createElement('div');
        banner.id = BANNER_ID;
        banner.style.cssText = `
            position: fixed;
            top: 16px;
            right: 16px;
            width: 340px;
            z-index: 2147483647;
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.12), 0 8px 16px rgba(0,0,0,0.06);
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
            animation: sekureSlideIn 0.3s ease;
            overflow: hidden;
        `;

        const siteTitle = originalDomain || currentDomain || 'este sitio';
        const saveUrl = originalUrl || window.location.href;

        banner.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px; padding:14px 16px; background:#fdf2f4; border-bottom:1px solid #fce4e8;">
                <div style="width:36px; height:36px; background:linear-gradient(135deg, #e86f82, #9b1b2f); border-radius:8px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                </div>
                <div style="flex:1;">
                    <div style="font-size:14px; font-weight:600; color:#530e17;">Guardar en Sekure</div>
                    <div style="font-size:11px; color:#9b1b2f;">¿Guardar esta contraseña?</div>
                </div>
                <button id="sekure-banner-close" style="background:none; border:none; cursor:pointer; padding:4px; color:#d43d55; display:flex;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
            <div style="padding:14px 16px;">
                <div style="margin-bottom:10px;">
                    <div style="font-size:11px; font-weight:500; color:#6b7280; margin-bottom:3px;">Sitio web</div>
                    <div style="font-size:13px; color:#1f2937; font-weight:500;">${escapeHtml(siteTitle)}</div>
                </div>
                ${username ? `
                    <div style="margin-bottom:10px;">
                        <div style="font-size:11px; font-weight:500; color:#6b7280; margin-bottom:3px;">Usuario</div>
                        <div style="font-size:13px; color:#1f2937;">${escapeHtml(username)}</div>
                    </div>
                ` : ''}
                <div style="margin-bottom:14px;">
                    <div style="font-size:11px; font-weight:500; color:#6b7280; margin-bottom:3px;">Contraseña</div>
                    <div style="font-size:13px; color:#1f2937; font-family:monospace;">${'•'.repeat(Math.min(password.length, 20))}</div>
                </div>
                <div style="display:flex; gap:8px;">
                    <button id="sekure-banner-dismiss" style="
                        flex:1; padding:9px 16px; border-radius:6px; font-size:13px; font-weight:500;
                        background:#f3f4f6; color:#4b5563; border:1px solid #d1d5db; cursor:pointer;
                        transition: background 0.15s;
                    ">No guardar</button>
                    <button id="sekure-banner-save" style="
                        flex:1; padding:9px 16px; border-radius:6px; font-size:13px; font-weight:500;
                        background:#9b1b2f; color:white; border:none; cursor:pointer;
                        box-shadow: 0 2px 8px rgba(155,27,47,0.2);
                        transition: background 0.15s;
                    ">Guardar</button>
                </div>
            </div>
        `;

        const dismissKey = `${originalDomain || currentDomain}|${username}`;

        document.body.appendChild(banner);

        // Helper to mark this credential as dismissed so it won't re-appear
        function markDismissed() {
            chrome.storage.local.get(DISMISSED_KEY).then(result => {
                const list = result[DISMISSED_KEY] || [];
                if (!list.includes(dismissKey)) {
                    list.push(dismissKey);
                    chrome.storage.local.set({ [DISMISSED_KEY]: list });
                }
            }).catch(() => { });
        }

        // Close button
        banner.querySelector('#sekure-banner-close').addEventListener('click', () => {
            markDismissed();
            banner.style.animation = 'sekureFadeOut 0.2s ease';
            setTimeout(() => banner.remove(), 200);
        });

        // Dismiss
        banner.querySelector('#sekure-banner-dismiss').addEventListener('click', () => {
            markDismissed();
            banner.style.animation = 'sekureFadeOut 0.2s ease';
            setTimeout(() => banner.remove(), 200);
        });

        // Save
        banner.querySelector('#sekure-banner-save').addEventListener('click', async () => {
            const saveBtn = banner.querySelector('#sekure-banner-save');
            saveBtn.textContent = 'Guardando...';
            saveBtn.disabled = true;

            try {
                const res = await chrome.runtime.sendMessage({
                    type: 'SEKURE_SAVE_PASSWORD',
                    data: {
                        title: siteTitle,
                        username: username,
                        url: saveUrl,
                        password: password,
                    },
                });

                if (res && res.success) {
                    // Update local cache
                    matchingEntries.push(res.entry);

                    // Show success
                    banner.innerHTML = `
                        <div style="padding:20px; text-align:center;">
                            <div style="width:40px; height:40px; background:#ecfdf5; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 10px;">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="20 6 9 17 4 12"/>
                                </svg>
                            </div>
                            <div style="font-size:14px; font-weight:600; color:#1f2937;">¡Guardada en Sekure!</div>
                            <div style="font-size:12px; color:#6b7280; margin-top:2px;">La contraseña se guardó correctamente</div>
                        </div>
                    `;
                    setTimeout(() => {
                        banner.style.animation = 'sekureFadeOut 0.3s ease';
                        setTimeout(() => banner.remove(), 300);
                    }, 2000);
                } else {
                    saveBtn.textContent = 'Error';
                    setTimeout(() => { saveBtn.textContent = 'Guardar'; saveBtn.disabled = false; }, 2000);
                }
            } catch (err) {
                saveBtn.textContent = 'Error';
                setTimeout(() => { saveBtn.textContent = 'Guardar'; saveBtn.disabled = false; }, 2000);
            }
        });

        // Auto-dismiss after 15 seconds
        setTimeout(() => {
            if (document.getElementById(BANNER_ID)) {
                banner.style.animation = 'sekureFadeOut 0.3s ease';
                setTimeout(() => banner.remove(), 300);
            }
        }, 15000);
    }

    // ─── Listen for autofill messages from popup ───
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        if (msg.type === 'SEKURE_AUTOFILL') {
            const pwField = document.querySelector('input[type="password"]:focus')
                || document.querySelector('input[type="password"]');
            if (pwField) {
                fillCredentials(pwField, msg.username, msg.password);
                sendResponse({ success: true });
            } else {
                sendResponse({ success: false, error: 'No password field found' });
            }
        }
    });

    function escapeHtml(text) {
        const el = document.createElement('span');
        el.textContent = text || '';
        return el.innerHTML;
    }

    // ─── Start ───
    init();
})();
