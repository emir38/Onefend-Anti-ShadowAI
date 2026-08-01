/**
 * Popup script - Onefend Extension popup UI
 */

import { getStorageItem, STORAGE_KEYS } from '@/utils/storage';
import type { ExtensionMessage } from '@/types';

// DOM elements
const loadingEl = document.getElementById('loading')!;
const contentEl = document.getElementById('content')!;
const notEnrolledEl = document.getElementById('not-enrolled')!;
const errorEl = document.getElementById('error-message')!;
const statusBadgeEl = document.getElementById('status-badge')!;
const statusTextEl = document.getElementById('status-text')!;
const statusDescEl = document.getElementById('status-desc')!;
const userIdentifierEl = document.getElementById('user-identifier')!;
const lastSyncEl = document.getElementById('last-sync')!;
const policyCountEl = document.getElementById('policy-count')!;
const syncBtn = document.getElementById('sync-btn')!;
const setupBtn = document.getElementById('setup-btn')!;

// Initialize popup
async function init() {
    try {
        const auth = await getStorageItem(STORAGE_KEYS.AUTH);

        if (!auth) {
            loadingEl.style.display = 'none';
            contentEl.style.display = 'none';
            notEnrolledEl.style.display = 'block';
            return;
        }

        const storedConfig = await getStorageItem(STORAGE_KEYS.CONFIG);

        // Update UI
        userIdentifierEl.textContent = auth.identifier || 'Unknown';

        if (storedConfig) {
            const lastSync = new Date(storedConfig.lastSync);
            lastSyncEl.textContent = formatRelativeTime(lastSync);

            const policyCount = storedConfig.config?.policies?.length || 0;
            policyCountEl.textContent = policyCount.toString();

            statusBadgeEl.classList.remove('inactive');
            statusBadgeEl.classList.add('active');
            statusTextEl.textContent = 'Protected';
            statusDescEl.textContent = 'Monitoring active';
        } else {
            statusBadgeEl.classList.remove('active');
            statusBadgeEl.classList.add('inactive');
            statusTextEl.textContent = 'Not synced';
            statusDescEl.textContent = 'Waiting for sync';
            lastSyncEl.textContent = 'Never';
        }

        loadingEl.style.display = 'none';
        contentEl.style.display = 'block';
    } catch (error) {
        showError('Failed to load extension data');
        console.error('[Popup] Init error:', error);
    }
}

// Setup button handler — opens onboarding page
setupBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/pages/onboarding.html') });
});

// Sync button handler
syncBtn.addEventListener('click', async () => {
    syncBtn.innerHTML = '<span>Syncing...</span>';
    (syncBtn as HTMLButtonElement).disabled = true;

    try {
        await sendMessage({ type: 'SYNC_CONFIG' });
        await init();

        syncBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#25C688" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> <span>Synced</span>';
        setTimeout(() => {
            syncBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg> <span>Sync Now</span>';
            (syncBtn as HTMLButtonElement).disabled = false;
        }, 2000);
    } catch (error) {
        showError('Sync failed. Please try again.');
        syncBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg> <span>Sync Now</span>';
        (syncBtn as HTMLButtonElement).disabled = false;
    }
});

// Helper: Send message to background
function sendMessage(message: ExtensionMessage): Promise<any> {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, (response) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(response);
            }
        });
    });
}

// Helper: Show error
function showError(message: string) {
    errorEl.textContent = message;
    errorEl.style.display = 'block';
    loadingEl.style.display = 'none';
    contentEl.style.display = 'block';
}

// Helper: Format relative time
function formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
}

// Start
init();
