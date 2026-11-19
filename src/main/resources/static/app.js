/**
 * Shortly - Interactive Application Logic
 * Modern, responsive UI with real-time analytics, session history, and clipboard integrations.
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- State & Storage ---
    const STORAGE_KEY = 'shortly_links_history';
    let historyLinks = loadHistory();

    // --- DOM Elements ---
    // Tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');
    const historyBadge = document.getElementById('history-badge');

    // Create Form Elements
    const shortenForm = document.getElementById('shorten-form');
    const urlInput = document.getElementById('url-input');
    const pasteBtn = document.getElementById('paste-btn');
    const toggleOptionsBtn = document.getElementById('toggle-options-btn');
    const advancedOptions = document.getElementById('advanced-options');
    const aliasInput = document.getElementById('alias-input');
    const expiryInput = document.getElementById('expiry-input');
    const presetPills = document.querySelectorAll('.preset-pill');
    const customExpiryWrap = document.getElementById('custom-expiry-wrap');
    const shortenBtn = document.getElementById('shorten-btn');
    const shortenError = document.getElementById('shorten-error');
    const shortenErrorText = document.getElementById('shorten-error-text');

    // Result Card Elements
    const shortenResult = document.getElementById('shorten-result');
    const shortLinkAnchor = document.getElementById('short-link-anchor');
    const resultExpiryBadge = document.getElementById('result-expiry-badge');
    const destinationPreview = document.getElementById('destination-preview');
    const copyBtn = document.getElementById('copy-btn');
    const visitBtn = document.getElementById('visit-btn');
    const qrToggleBtn = document.getElementById('qr-toggle-btn');
    const qrDrawer = document.getElementById('qr-drawer');
    const qrCanvas = document.getElementById('qr-canvas');
    const downloadQrBtn = document.getElementById('download-qr-btn');
    const inspectStatsBtn = document.getElementById('inspect-stats-btn');

    // Analytics Form & Dashboard Elements
    const statsForm = document.getElementById('stats-form');
    const statsCodeInput = document.getElementById('stats-code-input');
    const statsBtn = document.getElementById('stats-btn');
    const statsError = document.getElementById('stats-error');
    const statsErrorText = document.getElementById('stats-error-text');
    const statsDashboard = document.getElementById('stats-dashboard');
    const statTotalClicks = document.getElementById('stat-total-clicks');
    const statShortCode = document.getElementById('stat-short-code');
    const statOriginalUrl = document.getElementById('stat-original-url');
    const statVisitLink = document.getElementById('stat-visit-link');
    const devicesVisualList = document.getElementById('devices-visual-list');
    const deviceCountSummary = document.getElementById('device-count-summary');
    const noDevicesMsg = document.getElementById('no-devices-msg');
    const daysVisualList = document.getElementById('days-visual-list');
    const daysCountSummary = document.getElementById('days-count-summary');
    const noDaysMsg = document.getElementById('no-days-msg');

    // History Elements
    const historyList = document.getElementById('history-list');
    const historyEmpty = document.getElementById('history-empty');
    const clearHistoryBtn = document.getElementById('clear-history-btn');

    // Toast
    const toast = document.getElementById('toast');
    const toastText = document.getElementById('toast-text');
    let toastTimeout = null;

    // --- Initialize ---
    updateHistoryBadge();
    renderHistoryList();

    // --- Tab Switching ---
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            switchTab(targetTab);
        });
    });

    function switchTab(tabId) {
        tabBtns.forEach(b => {
            b.classList.toggle('active', b.getAttribute('data-tab') === tabId);
        });
        tabPanels.forEach(p => {
            p.classList.toggle('active', p.id === tabId);
        });

        if (tabId === 'history-tab') {
            renderHistoryList();
        }
    }

    // --- Advanced Options Toggle ---
    let optionsExpanded = false;
    toggleOptionsBtn.addEventListener('click', () => {
        optionsExpanded = !optionsExpanded;
        toggleOptionsBtn.classList.toggle('expanded', optionsExpanded);
        advancedOptions.classList.toggle('collapsed', !optionsExpanded);
    });

    // --- Expiry Presets ---
    let selectedExpiryPreset = 'never';
    presetPills.forEach(pill => {
        pill.addEventListener('click', () => {
            presetPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            selectedExpiryPreset = pill.getAttribute('data-expiry');

            if (selectedExpiryPreset === 'custom') {
                customExpiryWrap.classList.remove('hidden');
                expiryInput.focus();
            } else {
                customExpiryWrap.classList.add('hidden');
                expiryInput.value = '';
            }
        });
    });

    // --- Paste from Clipboard ---
    if (pasteBtn && navigator.clipboard) {
        pasteBtn.addEventListener('click', async () => {
            try {
                const text = await navigator.clipboard.readText();
                if (text) {
                    urlInput.value = text.trim();
                    showToast('Pasted URL from clipboard');
                    urlInput.focus();
                }
            } catch (err) {
                urlInput.focus();
            }
        });
    }

    // --- Shorten Form Submit ---
    shortenForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideError(shortenError);
        shortenResult.classList.add('hidden');
        qrDrawer.classList.add('hidden');

        let rawUrl = urlInput.value.trim();
        if (!rawUrl) return;

        // Auto-prefix http:// or https:// if protocol omitted
        if (!/^https?:\/\//i.test(rawUrl)) {
            rawUrl = 'https://' + rawUrl;
            urlInput.value = rawUrl;
        }

        const payload = { url: rawUrl };

        const alias = aliasInput.value.trim();
        if (alias) {
            payload.alias = alias;
        }

        // Calculate expiration timestamp
        const expiryIso = computeExpiryIso();
        if (expiryIso) {
            payload.expiresAt = expiryIso;
        }

        setLoading(shortenBtn, true);

        try {
            const res = await fetch('/api/links', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (!res.ok) {
                showError(shortenError, shortenErrorText, data.message || `Request failed (${res.status})`);
                return;
            }

            // Populate success card
            shortLinkAnchor.href = data.shortUrl;
            shortLinkAnchor.textContent = data.shortUrl;
            visitBtn.href = data.shortUrl;
            destinationPreview.textContent = data.originalUrl;
            destinationPreview.title = data.originalUrl;

            if (data.expiresAt) {
                const expDate = new Date(data.expiresAt);
                resultExpiryBadge.textContent = `Expires ${expDate.toLocaleDateString()} ${expDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            } else {
                resultExpiryBadge.textContent = 'Never expires';
            }

            // Attach inspect stats handler to this specific link
            inspectStatsBtn.onclick = () => {
                statsCodeInput.value = data.shortCode;
                switchTab('analytics-tab');
                fetchStats(data.shortCode);
            };

            // Setup QR code
            setupQrCode(data.shortUrl);

            shortenResult.classList.remove('hidden');
            showToast('Short link created successfully!');

            // Save to Session History
            saveToHistory({
                shortCode: data.shortCode,
                shortUrl: data.shortUrl,
                originalUrl: data.originalUrl,
                expiresAt: data.expiresAt,
                createdAt: new Date().toISOString()
            });

        } catch (err) {
            showError(shortenError, shortenErrorText, 'Failed to connect to backend server. Make sure the application is running.');
        } finally {
            setLoading(shortenBtn, false);
        }
    });

    function computeExpiryIso() {
        if (selectedExpiryPreset === 'never') return null;

        const now = new Date();
        if (selectedExpiryPreset === '1d') {
            now.setDate(now.getDate() + 1);
            return now.toISOString();
        }
        if (selectedExpiryPreset === '7d') {
            now.setDate(now.getDate() + 7);
            return now.toISOString();
        }
        if (selectedExpiryPreset === '30d') {
            now.setDate(now.getDate() + 30);
            return now.toISOString();
        }
        if (selectedExpiryPreset === 'custom' && expiryInput.value) {
            return new Date(expiryInput.value).toISOString();
        }
        return null;
    }

    // --- Copy Actions ---
    copyBtn.addEventListener('click', async () => {
        const text = shortLinkAnchor.textContent;
        if (!text) return;

        try {
            await navigator.clipboard.writeText(text);
            const copyLabel = copyBtn.querySelector('.copy-label');
            const originalText = copyLabel ? copyLabel.textContent : 'Copy';
            if (copyLabel) copyLabel.textContent = 'Copied!';
            showToast('Link copied to clipboard!');
            setTimeout(() => {
                if (copyLabel) copyLabel.textContent = originalText;
            }, 2000);
        } catch (err) {
            showToast('Failed to copy text', true);
        }
    });

    // --- QR Code Rendering ---
    qrToggleBtn.addEventListener('click', () => {
        qrDrawer.classList.toggle('hidden');
    });

    function setupQrCode(textToEncode) {
        if (!qrCanvas) return;
        const ctx = qrCanvas.getContext('2d');
        qrCanvas.width = 110;
        qrCanvas.height = 110;

        // Use public QR generator image piped to canvas for high quality
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            ctx.clearRect(0, 0, qrCanvas.width, qrCanvas.height);
            ctx.drawImage(img, 0, 0, qrCanvas.width, qrCanvas.height);
        };
        img.onerror = () => {
            drawFallbackQr(ctx, qrCanvas.width, qrCanvas.height);
        };
        img.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(textToEncode)}&color=090a10&bgcolor=ffffff`;

        downloadQrBtn.onclick = () => {
            try {
                const link = document.createElement('a');
                link.download = `shortly-qr-${Date.now()}.png`;
                link.href = qrCanvas.toDataURL('image/png');
                link.click();
            } catch (err) {
                showToast('Unable to export QR code', true);
            }
        };
    }

    function drawFallbackQr(ctx, w, h) {
        // Geometric placeholder pattern if external image is blocked
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#1e1b4b';
        ctx.fillRect(10, 10, 30, 30);
        ctx.fillRect(w - 40, 10, 30, 30);
        ctx.fillRect(10, h - 40, 30, 30);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(16, 16, 18, 18);
        ctx.fillRect(w - 34, 16, 18, 18);
        ctx.fillRect(16, h - 34, 18, 18);
        ctx.fillStyle = '#4338ca';
        ctx.fillRect(20, 20, 10, 10);
        ctx.fillRect(w - 30, 20, 10, 10);
        ctx.fillRect(20, h - 30, 10, 10);
    }

    // --- Analytics Inspection ---
    statsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        let query = statsCodeInput.value.trim();
        if (!query) return;

        // If user pasted a full link like http://localhost:8080/my-alias
        if (query.includes('/')) {
            query = query.split('/').pop();
        }

        fetchStats(query);
    });

    async function fetchStats(code) {
        hideError(statsError);
        statsDashboard.classList.add('hidden');
        setLoading(statsBtn, true);

        try {
            const res = await fetch(`/api/links/${encodeURIComponent(code)}/stats`);
            const data = await res.json();

            if (!res.ok) {
                showError(statsError, statsErrorText, data.message || `No link found for "${code}" (Status ${res.status})`);
                return;
            }

            // Populate KPIs
            statTotalClicks.textContent = (data.totalClicks || 0).toLocaleString();
            statShortCode.textContent = data.shortCode;
            statOriginalUrl.textContent = data.originalUrl;
            statOriginalUrl.href = data.originalUrl;
            statOriginalUrl.title = data.originalUrl;
            statVisitLink.href = `/${encodeURIComponent(data.shortCode)}`;

            // Populate Devices Visual Progress Bars
            renderDeviceBreakdown(data.devices, data.totalClicks);

            // Populate Daily Timeline
            renderDailyActivity(data.clicksPerDay);

            statsDashboard.classList.remove('hidden');
            showToast('Analytics loaded');

        } catch (err) {
            showError(statsError, statsErrorText, 'Failed to connect to backend service.');
        } finally {
            setLoading(statsBtn, false);
        }
    }

    function renderDeviceBreakdown(devices, totalClicks) {
        devicesVisualList.innerHTML = '';
        const list = devices || [];
        deviceCountSummary.textContent = `${list.length} Device${list.length === 1 ? '' : 's'}`;

        if (list.length === 0 || totalClicks === 0) {
            noDevicesMsg.classList.remove('hidden');
            return;
        }

        noDevicesMsg.classList.add('hidden');

        list.forEach(item => {
            const count = item.count || 0;
            const percentage = totalClicks > 0 ? Math.round((count / totalClicks) * 100) : 0;
            const type = (item.device || 'OTHER').toUpperCase();

            let fillClass = 'fill-other';
            let iconSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';

            if (type.includes('DESKTOP')) {
                fillClass = 'fill-desktop';
                iconSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>';
            } else if (type.includes('MOBILE')) {
                fillClass = 'fill-mobile';
                iconSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>';
            } else if (type.includes('TABLET')) {
                fillClass = 'fill-tablet';
                iconSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>';
            }

            const barDiv = document.createElement('div');
            barDiv.className = 'bar-item';
            barDiv.innerHTML = `
                <div class="bar-meta">
                    <span class="bar-name">${iconSvg} ${escapeHtml(type)}</span>
                    <span class="bar-val">${count} (${percentage}%)</span>
                </div>
                <div class="bar-track">
                    <div class="bar-fill ${fillClass}" style="width: ${percentage}%"></div>
                </div>
            `;
            devicesVisualList.appendChild(barDiv);
        });
    }

    function renderDailyActivity(clicksPerDay) {
        daysVisualList.innerHTML = '';
        const list = clicksPerDay || [];
        daysCountSummary.textContent = `${list.length} Day${list.length === 1 ? '' : 's'}`;

        if (list.length === 0) {
            noDaysMsg.classList.remove('hidden');
            return;
        }

        noDaysMsg.classList.add('hidden');

        list.forEach(item => {
            const row = document.createElement('div');
            row.className = 'activity-row';
            row.innerHTML = `
                <span class="activity-date">${escapeHtml(item.date)}</span>
                <span class="activity-badge">${item.count} click${item.count === 1 ? '' : 's'}</span>
            `;
            daysVisualList.appendChild(row);
        });
    }

    // --- Session History Management ---
    function loadHistory() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    function saveToHistory(item) {
        historyLinks = historyLinks.filter(l => l.shortCode !== item.shortCode);
        historyLinks.unshift(item);
        if (historyLinks.length > 20) {
            historyLinks = historyLinks.slice(0, 20);
        }
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(historyLinks));
        } catch (e) {}
        updateHistoryBadge();
    }

    function updateHistoryBadge() {
        if (historyBadge) {
            historyBadge.textContent = historyLinks.length;
        }
    }

    function renderHistoryList() {
        if (!historyList) return;
        historyList.innerHTML = '';

        if (historyLinks.length === 0) {
            historyEmpty.classList.remove('hidden');
            clearHistoryBtn.classList.add('hidden');
            return;
        }

        historyEmpty.classList.add('hidden');
        clearHistoryBtn.classList.remove('hidden');

        historyLinks.forEach(item => {
            const card = document.createElement('div');
            card.className = 'history-card';
            card.innerHTML = `
                <div class="history-main">
                    <div class="history-code-row">
                        <a href="${escapeHtml(item.shortUrl)}" target="_blank" class="history-short-link">${escapeHtml(item.shortUrl)}</a>
                        <span class="badge neutral-badge">${item.expiresAt ? 'Expires' : 'Permanent'}</span>
                    </div>
                    <div class="history-dest" title="${escapeHtml(item.originalUrl)}">Target: ${escapeHtml(item.originalUrl)}</div>
                </div>
                <div class="history-actions">
                    <button type="button" class="history-icon-btn copy-hist-btn" data-url="${escapeHtml(item.shortUrl)}">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        <span>Copy</span>
                    </button>
                    <button type="button" class="history-icon-btn stats-hist-btn" data-code="${escapeHtml(item.shortCode)}">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                        <span>Stats</span>
                    </button>
                </div>
            `;

            // Copy handler
            card.querySelector('.copy-hist-btn').addEventListener('click', async (e) => {
                const btn = e.currentTarget;
                const url = btn.getAttribute('data-url');
                try {
                    await navigator.clipboard.writeText(url);
                    showToast('Link copied to clipboard!');
                } catch (err) {
                    showToast('Failed to copy', true);
                }
            });

            // Inspect stats handler
            card.querySelector('.stats-hist-btn').addEventListener('click', (e) => {
                const btn = e.currentTarget;
                const code = btn.getAttribute('data-code');
                statsCodeInput.value = code;
                switchTab('analytics-tab');
                fetchStats(code);
            });

            historyList.appendChild(card);
        });
    }

    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', () => {
            if (confirm('Clear your local history of shortened links?')) {
                historyLinks = [];
                localStorage.removeItem(STORAGE_KEY);
                updateHistoryBadge();
                renderHistoryList();
                showToast('History cleared');
            }
        });
    }

    // --- Helper Utilities ---
    function setLoading(btn, isLoading) {
        if (!btn) return;
        btn.disabled = isLoading;
        const textSpan = btn.querySelector('.btn-text');
        const spinnerSpan = btn.querySelector('.btn-spinner');

        if (textSpan) textSpan.classList.toggle('hidden', isLoading);
        if (spinnerSpan) spinnerSpan.classList.toggle('hidden', !isLoading);
    }

    function showError(container, textElement, message) {
        if (textElement) textElement.textContent = message;
        if (container) container.classList.remove('hidden');
    }

    function hideError(container) {
        if (container) container.classList.add('hidden');
    }

    function showToast(message, isError = false) {
        if (!toast || !toastText) return;
        if (toastTimeout) clearTimeout(toastTimeout);

        toastText.textContent = message;
        toast.style.borderColor = isError ? 'var(--rose)' : 'var(--border-focus)';
        toast.classList.remove('hidden');

        toastTimeout = setTimeout(() => {
            toast.classList.add('hidden');
        }, 2800);
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
});
