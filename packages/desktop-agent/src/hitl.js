import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';

const container = document.getElementById('content');

// ---------------------------------------------------------------------------
// Poll for payload then render
// ---------------------------------------------------------------------------

let payload = null;

async function pollForPayload() {
    for (let i = 0; i < 30; i++) {
        try {
            const res = await invoke('check_hitl_pending');
            if (res) {
                payload = res;
                renderModal(payload);
                return;
            }
        } catch (_) { /* backend not ready yet */ }
        await new Promise(r => setTimeout(r, 500));
    }
    document.getElementById('loading').textContent = 'No pending request. Closing...';
    setTimeout(() => getCurrentWindow().close(), 1500);
}

pollForPayload();

// ---------------------------------------------------------------------------
// SVG icons (matching extension)
// ---------------------------------------------------------------------------

const ICONS = {
    block: '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
    warning: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
};

function svg(inner, color, size = 20) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

function renderModal(data) {
    const { requestId, type, originalText, redactedText, blockReason,
        warnCategory, warnRiskLevel, platform } = data;

    const isBlock = type === 'BLOCK';
    const isRedact = type === 'REDACT';
    const isWarning = type === 'WARNING';
    const hasPII = isRedact && redactedText;

    // Accent color
    let accent = '#3b82f6';
    if (isWarning || (isRedact && (warnRiskLevel === 'HIGH' || warnRiskLevel === 'CRITICAL'))) accent = '#eab308';
    if (isBlock || (isRedact && warnRiskLevel === 'CRITICAL')) accent = '#ef4444';

    // Icon
    let icon;
    if (isBlock) icon = ICONS.block;
    else if (isWarning) icon = ICONS.warning;
    else if (isRedact && warnRiskLevel === 'CRITICAL') icon = ICONS.block;
    else if (isRedact && warnRiskLevel === 'HIGH') icon = ICONS.warning;
    else icon = ICONS.shield;

    // Title
    const title = isBlock ? 'Request Blocked'
        : isRedact ? 'Sensitive Data Detected'
            : 'Security Warning';

    // Message
    const msg = isBlock
        ? `Organization policy blocked this request.<br><span style="color:#6b7280;font-size:12px">${esc(blockReason || 'Policy violation')}</span>`
        : isWarning
            ? `Content classified as <strong>${esc(warnCategory || 'High Risk')}</strong> (<strong>${warnRiskLevel || 'HIGH'}</strong> risk). Send to <strong>${esc(platform)}</strong>?`
            : `Sensitive information detected in your prompt for <strong>${esc(platform)}</strong>.`;

    // Preview
    const preview = redactedText ? `
        <div class="preview">
            <div class="preview-label">Redacted Preview</div>
            <div class="preview-text">${esc(redactedText)}</div>
        </div>` : '';

    // Buttons
    const pri = `background:${accent};box-shadow:0 3px 5px -1px ${accent}40`;
    let buttons;
    if (isBlock) {
        buttons = `<button class="btn btn-primary" style="${pri}" id="btn-clear">Close</button>`;
    } else if (isRedact && hasPII) {
        buttons = `
            <button class="btn btn-clear" id="btn-clear">Clear Text</button>
            <button class="btn btn-secondary" id="btn-override">Proceed Anyway</button>
            <button class="btn btn-primary" style="${pri}" id="btn-redact">Send Redacted</button>`;
    } else if (isWarning) {
        buttons = `
            <button class="btn btn-clear" id="btn-clear">Clear Text</button>
            <button class="btn btn-primary" style="${pri}" id="btn-override">Proceed Anyway</button>`;
    } else {
        buttons = `
            <button class="btn btn-clear" id="btn-clear">Clear Text</button>
            <button class="btn btn-primary" style="${pri}" id="btn-redact">Send Redacted</button>`;
    }

    // Border accent
    container.style.borderLeft = `3px solid ${accent}`;

    container.innerHTML = `
        <div class="header">
            <div class="header-icon" style="background:${accent}20">${svg(icon, accent)}</div>
            <h2 class="header-title">${title}</h2>
        </div>
        <p class="message">${msg}</p>
        ${preview}
        <div class="buttons">${buttons}</div>
    `;

    // Wire buttons
    const resolve = async (action, extra = {}) => {
        document.querySelectorAll('.btn').forEach(b => b.classList.add('disabled'));
        try {
            await invoke('resolve_hitl', { requestId, action, ...extra });
            await getCurrentWindow().close();
        } catch (err) {
            try { await getCurrentWindow().close(); } catch (_) { window.close(); }
        }
    };

    document.getElementById('btn-clear')?.addEventListener('click',
        () => resolve('BLOCK', { reason: 'User cancelled via popup' }));
    document.getElementById('btn-override')?.addEventListener('click',
        () => resolve('ALLOW'));
    document.getElementById('btn-redact')?.addEventListener('click',
        () => resolve('REDACT', { redactedText: redactedText || '' }));
}

function esc(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
