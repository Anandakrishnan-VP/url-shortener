/**
 * Shortly — Frontend Application Logic
 * Clean, lightweight, and resilient interactions.
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- State & Storage ---
    const STORAGE_KEY = 'shortly_history_v1';
    let historyLinks = loadHistory();

    // --- DOM Elements ---
    // Tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');
    const historyBadge = document.getElementById('history-badge');
    const createFirstLink = document.getElementById('create-first-link');

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

    // Analytics Elements
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
    const historyTableWrapper = document.getElementById('history-table-wrapper');
    const historyEmpty = document.getElementById('history-empty');
    const clearHistoryBtn = document.getElementById('clear-history-btn');

    // Toast
    const toast = document.getElementById('toast');
    const toastText = document.getElementById('toast-text');
    let toastTimeout = null;

    // --- Initialize ---
    updateHistoryBadge();
    renderHistoryList();

    // --- Tab Navigation ---
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            switchTab(targetTab);
        });
    });

    if (createFirstLink) {
        createFirstLink.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab('create-tab');
            urlInput.focus();
        });
    }

    function switchTab(tabId) {
        tabBtns.forEach(b => {
            const isActive = b.getAttribute('data-tab') === tabId;
            b.classList.toggle('active', isActive);
            b.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
        tabPanels.forEach(p => {
            p.classList.toggle('active', p.id === tabId);
        });

        if (tabId === 'history-tab') {
            renderHistoryList();
        }
    }

    // --- Advanced Options Inline Disclosure ---
    let optionsExpanded = false;
    toggleOptionsBtn.addEventListener('click', () => {
        optionsExpanded = !optionsExpanded;
        toggleOptionsBtn.classList.toggle('expanded', optionsExpanded);
        toggleOptionsBtn.setAttribute('aria-expanded', optionsExpanded ? 'true' : 'false');
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
                    showToast('Pasted from clipboard');
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

        // Auto-prefix https:// if scheme is missing
        if (!/^https?:\/\//i.test(rawUrl)) {
            rawUrl = 'https://' + rawUrl;
            urlInput.value = rawUrl;
        }

        const payload = { url: rawUrl };

        const alias = aliasInput.value.trim();
        if (alias) {
            payload.alias = alias;
        }

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
                showError(shortenError, shortenErrorText, data.message || `Could not shorten link (${res.status})`);
                return;
            }

            // Populate Result
            shortLinkAnchor.href = data.shortUrl;
            shortLinkAnchor.textContent = data.shortUrl;
            visitBtn.href = data.shortUrl;
            destinationPreview.textContent = data.originalUrl;
            destinationPreview.title = data.originalUrl;

            if (data.expiresAt) {
                const expDate = new Date(data.expiresAt);
                resultExpiryBadge.textContent = `Expires ${expDate.toLocaleDateString()}`;
            } else {
                resultExpiryBadge.textContent = 'Never expires';
            }

            // Bind stats inspect button
            inspectStatsBtn.onclick = () => {
                statsCodeInput.value = data.shortCode;
                switchTab('analytics-tab');
                fetchStats(data.shortCode);
            };

            // Setup QR
            setupQrCode(data.shortUrl);

            shortenResult.classList.remove('hidden');
            showToast('Short link created');

            // Save to Session History
            saveToHistory({
                shortCode: data.shortCode,
                shortUrl: data.shortUrl,
                originalUrl: data.originalUrl,
                expiresAt: data.expiresAt,
                createdAt: new Date().toISOString()
            });

        } catch (err) {
            showError(shortenError, shortenErrorText, 'Failed to connect to server. Check your network.');
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

    // --- Copy Link ---
    copyBtn.addEventListener('click', async () => {
        const text = shortLinkAnchor.textContent;
        if (!text) return;

        try {
            await navigator.clipboard.writeText(text);
            const copyLabel = copyBtn.querySelector('.copy-label') || copyBtn;
            const originalText = copyLabel.textContent;
            copyLabel.textContent = 'Copied';
            showToast('Copied to clipboard');
            setTimeout(() => {
                copyLabel.textContent = originalText;
            }, 1800);
        } catch (err) {
            showToast('Failed to copy');
        }
    });

    // --- QR Code ---
    qrToggleBtn.addEventListener('click', () => {
        qrDrawer.classList.toggle('hidden');
    });

    function setupQrCode(textToEncode) {
        if (!qrCanvas) return;
        const ctx = qrCanvas.getContext('2d');
        qrCanvas.width = 100;
        qrCanvas.height = 100;

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            ctx.clearRect(0, 0, qrCanvas.width, qrCanvas.height);
            ctx.drawImage(img, 0, 0, qrCanvas.width, qrCanvas.height);
        };
        img.onerror = () => {
            drawFallbackQr(ctx, qrCanvas.width, qrCanvas.height);
        };
        img.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(textToEncode)}&color=1c1917&bgcolor=ffffff`;

        downloadQrBtn.onclick = () => {
            try {
                const link = document.createElement('a');
                link.download = `shortly-${Date.now()}.png`;
                link.href = qrCanvas.toDataURL('image/png');
                link.click();
            } catch (err) {
                showToast('Unable to export QR image');
            }
        };
    }

    function drawFallbackQr(ctx, w, h) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#1c1917';
        ctx.fillRect(8, 8, 26, 26);
        ctx.fillRect(w - 34, 8, 26, 26);
        ctx.fillRect(8, h - 34, 26, 26);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(13, 13, 16, 16);
        ctx.fillRect(w - 29, 13, 16, 16);
        ctx.fillRect(13, h - 29, 16, 16);
        ctx.fillStyle = '#1c1917';
        ctx.fillRect(17, 17, 8, 8);
        ctx.fillRect(w - 25, 17, 8, 8);
        ctx.fillRect(17, h - 25, 8, 8);
    }

    // --- Analytics Inspection ---
    statsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        let query = statsCodeInput.value.trim();
        if (!query) return;

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
                showError(statsError, statsErrorText, data.message || `No link found for "${code}"`);
                return;
            }

            statTotalClicks.textContent = (data.totalClicks || 0).toLocaleString();
            statShortCode.textContent = data.shortCode;
            statOriginalUrl.textContent = data.originalUrl;
            statOriginalUrl.href = data.originalUrl;
            statOriginalUrl.title = data.originalUrl;
            statVisitLink.href = `/${encodeURIComponent(data.shortCode)}`;

            renderDeviceBreakdown(data.devices, data.totalClicks);
            renderDailyActivity(data.clicksPerDay);

            statsDashboard.classList.remove('hidden');

        } catch (err) {
            showError(statsError, statsErrorText, 'Failed to fetch analytics from server.');
        } finally {
            setLoading(statsBtn, false);
        }
    }

    function renderDeviceBreakdown(devices, totalClicks) {
        devicesVisualList.innerHTML = '';
        const list = devices || [];
        deviceCountSummary.textContent = `${list.length} device${list.length === 1 ? '' : 's'}`;

        if (list.length === 0 || totalClicks === 0) {
            noDevicesMsg.classList.remove('hidden');
            return;
        }

        noDevicesMsg.classList.add('hidden');

        list.forEach(item => {
            const count = item.count || 0;
            const percentage = totalClicks > 0 ? Math.round((count / totalClicks) * 100) : 0;
            const type = (item.device || 'OTHER').toUpperCase();

            const barDiv = document.createElement('div');
            barDiv.className = 'bar-row';
            barDiv.innerHTML = `
                <div class="bar-info">
                    <span class="bar-label">${escapeHtml(type)}</span>
                    <span class="bar-number">${count} (${percentage}%)</span>
                </div>
                <div class="bar-track">
                    <div class="bar-progress" style="width: ${percentage}%"></div>
                </div>
            `;
            devicesVisualList.appendChild(barDiv);
        });
    }

    function renderDailyActivity(clicksPerDay) {
        daysVisualList.innerHTML = '';
        const list = clicksPerDay || [];
        daysCountSummary.textContent = `${list.length} day${list.length === 1 ? '' : 's'}`;

        if (list.length === 0) {
            noDaysMsg.classList.remove('hidden');
            return;
        }

        noDaysMsg.classList.add('hidden');

        list.forEach(item => {
            const row = document.createElement('div');
            row.className = 'daily-row';
            row.innerHTML = `
                <span class="daily-date">${escapeHtml(item.date)}</span>
                <span class="daily-count">${item.count} click${item.count === 1 ? '' : 's'}</span>
            `;
            daysVisualList.appendChild(row);
        });
    }

    // --- Session History ---
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
        if (historyLinks.length > 25) {
            historyLinks = historyLinks.slice(0, 25);
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
            historyTableWrapper.classList.add('hidden');
            historyEmpty.classList.remove('hidden');
            clearHistoryBtn.classList.add('hidden');
            return;
        }

        historyTableWrapper.classList.remove('hidden');
        historyEmpty.classList.add('hidden');
        clearHistoryBtn.classList.remove('hidden');

        historyLinks.forEach(item => {
            const tr = document.createElement('tr');
            const expiryText = item.expiresAt ? new Date(item.expiresAt).toLocaleDateString() : 'Never';

            tr.innerHTML = `
                <td>
                    <a href="${escapeHtml(item.shortUrl)}" target="_blank" class="table-link-mono">${escapeHtml(item.shortUrl)}</a>
                </td>
                <td>
                    <span class="table-dest" title="${escapeHtml(item.originalUrl)}">${escapeHtml(item.originalUrl)}</span>
                </td>
                <td>
                    <span class="table-expiry">${expiryText}</span>
                </td>
                <td style="text-align: right;">
                    <div class="table-actions">
                        <button type="button" class="btn btn-secondary btn-sm copy-hist-btn" data-url="${escapeHtml(item.shortUrl)}">Copy</button>
                        <button type="button" class="btn btn-secondary btn-sm stats-hist-btn" data-code="${escapeHtml(item.shortCode)}">Stats</button>
                    </div>
                </td>
            `;

            // Copy Action
            tr.querySelector('.copy-hist-btn').addEventListener('click', async (e) => {
                const btn = e.currentTarget;
                const url = btn.getAttribute('data-url');
                try {
                    await navigator.clipboard.writeText(url);
                    const original = btn.textContent;
                    btn.textContent = 'Copied';
                    showToast('Copied to clipboard');
                    setTimeout(() => { btn.textContent = original; }, 1500);
                } catch (err) {
                    showToast('Failed to copy');
                }
            });

            // Inspect Stats Action
            tr.querySelector('.stats-hist-btn').addEventListener('click', (e) => {
                const btn = e.currentTarget;
                const code = btn.getAttribute('data-code');
                statsCodeInput.value = code;
                switchTab('analytics-tab');
                fetchStats(code);
            });

            historyList.appendChild(tr);
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

    // --- Utilities ---
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

    function showToast(message) {
        if (!toast || !toastText) return;
        if (toastTimeout) clearTimeout(toastTimeout);

        toastText.textContent = message;
        toast.classList.remove('hidden');

        toastTimeout = setTimeout(() => {
            toast.classList.add('hidden');
        }, 2200);
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
