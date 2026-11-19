document.addEventListener('DOMContentLoaded', () => {
    // Shorten URL Form
    const shortenForm = document.getElementById('shorten-form');
    const urlInput = document.getElementById('url-input');
    const aliasInput = document.getElementById('alias-input');
    const expiryInput = document.getElementById('expiry-input');
    const shortenResult = document.getElementById('shorten-result');
    const shortenError = document.getElementById('shorten-error');
    const shortLink = document.getElementById('short-link');
    const expiryDisplay = document.getElementById('expiry-display');
    const copyBtn = document.getElementById('copy-btn');

    shortenForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        shortenResult.classList.add('hidden');
        shortenError.classList.add('hidden');

        const payload = {
            url: urlInput.value.trim()
        };

        const alias = aliasInput.value.trim();
        if (alias) {
            payload.alias = alias;
        }

        const expiryVal = expiryInput.value;
        if (expiryVal) {
            payload.expiresAt = new Date(expiryVal).toISOString();
        }

        try {
            const res = await fetch('/api/links', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) {
                showError(shortenError, data.message || `Request failed with status ${res.status}`);
                return;
            }

            shortLink.href = data.shortUrl;
            shortLink.textContent = data.shortUrl;

            if (data.expiresAt) {
                const expDate = new Date(data.expiresAt);
                expiryDisplay.textContent = `Expires on: ${expDate.toLocaleString()}`;
            } else {
                expiryDisplay.textContent = 'Never expires';
            }

            shortenResult.classList.remove('hidden');
        } catch (err) {
            showError(shortenError, 'Network error: failed to connect to server.');
        }
    });

    copyBtn.addEventListener('click', async () => {
        const text = shortLink.textContent;
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            setTimeout(() => {
                copyBtn.textContent = originalText;
            }, 2000);
        } catch (err) {
            console.error('Failed to copy', err);
        }
    });

    // Stats Form
    const statsForm = document.getElementById('stats-form');
    const statsCodeInput = document.getElementById('stats-code-input');
    const statsResult = document.getElementById('stats-result');
    const statsError = document.getElementById('stats-error');
    const statTotalClicks = document.getElementById('stat-total-clicks');
    const statOriginalUrl = document.getElementById('stat-original-url');
    const daysTableBody = document.querySelector('#days-table tbody');
    const devicesTableBody = document.querySelector('#devices-table tbody');
    const noDaysMsg = document.getElementById('no-days-msg');
    const noDevicesMsg = document.getElementById('no-devices-msg');

    statsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        statsResult.classList.add('hidden');
        statsError.classList.add('hidden');

        let code = statsCodeInput.value.trim();
        // Support full url if user pasted it
        if (code.includes('/')) {
            code = code.split('/').pop();
        }

        if (!code) return;

        try {
            const res = await fetch(`/api/links/${encodeURIComponent(code)}/stats`);
            const data = await res.json();

            if (!res.ok) {
                showError(statsError, data.message || `Link not found (status ${res.status})`);
                return;
            }

            statTotalClicks.textContent = data.totalClicks;
            statOriginalUrl.textContent = data.originalUrl;
            statOriginalUrl.title = data.originalUrl;

            // Render days
            daysTableBody.innerHTML = '';
            if (data.clicksPerDay && data.clicksPerDay.length > 0) {
                noDaysMsg.classList.add('hidden');
                data.clicksPerDay.forEach(item => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `<td>${escapeHtml(item.date)}</td><td><strong>${item.count}</strong></td>`;
                    daysTableBody.appendChild(tr);
                });
            } else {
                noDaysMsg.classList.remove('hidden');
            }

            // Render devices
            devicesTableBody.innerHTML = '';
            if (data.devices && data.devices.length > 0) {
                noDevicesMsg.classList.add('hidden');
                data.devices.forEach(item => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `<td>${escapeHtml(item.device)}</td><td><strong>${item.count}</strong></td>`;
                    devicesTableBody.appendChild(tr);
                });
            } else {
                noDevicesMsg.classList.remove('hidden');
            }

            statsResult.classList.remove('hidden');
        } catch (err) {
            showError(statsError, 'Network error: failed to fetch stats.');
        }
    });

    function showError(element, msg) {
        element.textContent = msg;
        element.classList.remove('hidden');
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
});
