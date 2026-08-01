// blocked.ts — Onefend block page logic
// Compiled to JS by Vite

const params = new URLSearchParams(window.location.search);
const domain = params.get('domain');

if (domain) {
    const domainEl = document.getElementById('domain-name');
    if (domainEl) domainEl.textContent = domain;
    document.title = 'Blocked: ' + domain + ' — Onefend';
}

function showApprovedAi(name?: string | null, url?: string | null) {
    if (!name && !url) return;
    const card = document.getElementById('approved-ai-card');
    if (card) card.classList.add('visible');
    
    if (name) {
        const nameEl = document.getElementById('approved-ai-name');
        if (nameEl) nameEl.textContent = name;
    }
    if (url) {
        const a = document.getElementById('approved-ai-url') as HTMLAnchorElement | null;
        if (a) {
            a.textContent = url;
            a.href = url;
        }
    }
}

// 1. Try URL params first
const paramName = params.get('approvedAiName');
const paramUrl = params.get('approvedAiUrl');

if (paramName || paramUrl) {
    showApprovedAi(paramName, paramUrl);
} else {
    // 2. Fallback: read directly from chrome.storage.local
    try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get(['config'], (result) => {
                if (result && result.config && result.config.config) {
                    const ts = result.config.config.tenantSettings || {};
                    const aiName = ts.approvedAiName as string || '';
                    const aiUrl = ts.approvedAiUrl as string || '';
                    showApprovedAi(aiName, aiUrl);
                }
            });
        }
    } catch (e) {
        console.error('[Blocked] Failed to read from chrome.storage:', e);
    }
}
