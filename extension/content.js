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
    let currentDropdown = null;
    let currentPasswordField = null;
    let matchingEntries = [];
    let isAuthenticated = false;

    // ─── Utility ───
    function extractDomain(url) {
        try { return new URL(url).hostname.replace(/^www\./, ''); }
        catch { return ''; }
    }

    const currentDomain = extractDomain(window.location.href);

    // ─── Check auth & load entries ───
    async function init() {
        try {
            const res = await chrome.runtime.sendMessage({ type: 'SEKURE_GET_ENTRIES', domain: currentDomain });
            if (res && !res.error) {
                isAuthenticated = res.authenticated;
                matchingEntries = res.entries || [];
            }
        } catch { /* extension context invalidated */ }

        if (isAuthenticated) {
            observePasswordFields();
            observeFormSubmissions();
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

        // Show Sekure icon indicator on focus
        field.addEventListener('focus', () => {
            currentPasswordField = field;
            if (matchingEntries.length > 0) {
                showDropdown(field);
            }
        });

        field.addEventListener('click', () => {
            if (matchingEntries.length > 0 && !currentDropdown) {
                showDropdown(field);
            }
        });
    }

    // ─── Autofill Dropdown ───
    function showDropdown(field) {
        removeDropdown();

        const dropdown = document.createElement('div');
        dropdown.id = DROPDOWN_ID;

        // Position relative to the field
        const rect = field.getBoundingClientRect();
        dropdown.style.cssText = `
            position: fixed;
            top: ${rect.bottom + 4}px;
            left: ${rect.left}px;
            width: ${Math.max(rect.width, 280)}px;
            max-height: 260px;
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
        header.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9b1b2f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <span style="font-size:13px; font-weight:600; color:#9b1b2f;">Sekure</span>
            <span style="font-size:11px; color:#9ca3af; margin-left:auto;">${matchingEntries.length} contraseña${matchingEntries.length !== 1 ? 's' : ''}</span>
        `;
        dropdown.appendChild(header);

        // Entries
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

        document.body.appendChild(dropdown);
        currentDropdown = dropdown;

        // Close on outside click
        setTimeout(() => {
            document.addEventListener('click', outsideClickHandler, true);
            document.addEventListener('keydown', escHandler, true);
        }, 10);
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
        // Listen for form submits
        document.addEventListener('submit', handleFormSubmit, true);

        // Also listen for clicks on submit-like buttons (SPAs)
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('button[type="submit"], input[type="submit"], button:not([type])');
            if (!btn) return;
            const form = btn.closest('form');
            if (form) {
                // Form submit event will handle it
                return;
            }
            // Check if there's a password field nearby (SPA login)
            const container = btn.closest('div, section, main, article') || document.body;
            const pwField = container.querySelector('input[type="password"]');
            if (pwField && pwField.value) {
                const userField = findUsernameField(container, pwField);
                setTimeout(() => {
                    maybeOfferSave(userField?.value || '', pwField.value);
                }, 500);
            }
        }, true);
    }

    function handleFormSubmit(e) {
        const form = e.target;
        if (!(form instanceof HTMLFormElement)) return;

        const pwField = form.querySelector('input[type="password"]');
        if (!pwField || !pwField.value) return;

        const userField = findUsernameField(form, pwField);
        const username = userField?.value || '';
        const password = pwField.value;

        // Check if this is already saved
        const alreadySaved = matchingEntries.some(entry =>
            entry.username === username
        );

        if (!alreadySaved) {
            // Delay slightly to let the page navigate
            setTimeout(() => {
                maybeOfferSave(username, password);
            }, 800);
        }
    }

    function maybeOfferSave(username, password) {
        if (!isAuthenticated || !password) return;

        // Check if already saved for this exact username
        const alreadySaved = matchingEntries.some(e => e.username === username);
        if (alreadySaved) return;

        // Don't show if a banner is already visible
        if (document.getElementById(BANNER_ID)) return;

        showSaveBanner(username, password);
    }

    // ─── Save Password Banner ───
    function showSaveBanner(username, password) {
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

        const title = extractDomain(window.location.href) || 'este sitio';

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
                    <div style="font-size:13px; color:#1f2937; font-weight:500;">${escapeHtml(title)}</div>
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

        document.body.appendChild(banner);

        // Close button
        banner.querySelector('#sekure-banner-close').addEventListener('click', () => {
            banner.style.animation = 'sekureFadeOut 0.2s ease';
            setTimeout(() => banner.remove(), 200);
        });

        // Dismiss
        banner.querySelector('#sekure-banner-dismiss').addEventListener('click', () => {
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
                        title: title,
                        username: username,
                        url: window.location.href,
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
