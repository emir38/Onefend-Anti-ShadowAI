import { invoke } from '@tauri-apps/api/core';

// DOM Elements
const loadingEl = document.getElementById('loading');
const contentEl = document.getElementById('content');
const notEnrolledEl = document.getElementById('not-enrolled');
const errorEl = document.getElementById('error-message');
const enrollmentError = document.getElementById('enrollment-error');

const enrollBtn = document.getElementById('enroll-btn');
const identifierInput = document.getElementById('identifier');
const enrollmentTokenInput = document.getElementById('enrollment-token');

const statusBadgeEl = document.getElementById('status-badge');
const statusTextEl = document.getElementById('status-text');
const statusDescEl = document.getElementById('status-desc');
const userIdentifierEl = document.getElementById('user-identifier');
const lastSyncEl = document.getElementById('last-sync');
const policyCountEl = document.getElementById('policy-count');
const syncBtn = document.getElementById('sync-btn');

// Track last successful sync time
let lastSyncTime = null;

// ---------------------------------------------------------------------------
// Enrollment
// ---------------------------------------------------------------------------

enrollBtn.addEventListener('click', async () => {
    const identifier = identifierInput.value.trim();
    const token = enrollmentTokenInput.value.trim();

    if (!identifier || !token) {
        showEnrollError('Please enter both Email and Enrollment Token.');
        return;
    }

    enrollBtn.disabled = true;
    enrollBtn.innerHTML = '<span class="spinner"></span> Activating...';
    enrollmentError.style.display = 'none';

    try {
        const result = await invoke('register_device', { enrollmentToken: token, identifier });
        if (result.success) {
            showScreen('content');
            updateStatus();
        } else {
            showEnrollError('Activation failed. Please check your inputs.');
        }
    } catch (error) {
        showEnrollError(`${error}`);
    } finally {
        enrollBtn.disabled = false;
        enrollBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg> Activate Agent`;
    }
});

function showEnrollError(msg) {
    enrollmentError.textContent = msg;
    enrollmentError.style.display = 'block';
}

function showScreen(screen) {
    loadingEl.style.display = 'none';
    notEnrolledEl.style.display = screen === 'enrollment' ? 'block' : 'none';
    contentEl.style.display = screen === 'content' ? 'block' : 'none';
}

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

async function updateStatus() {
    try {
        const status = await invoke('get_status');

        if (!status.configured) {
            showScreen('enrollment');
            return;
        }
        showScreen('content');

        // Account (email/user identifier, matching extension)
        userIdentifierEl.textContent = status.identifier || 'Unknown';

        // Status pill (matching extension logic exactly)
        if (status.policy_loaded) {
            statusBadgeEl.classList.remove('inactive');
            statusBadgeEl.classList.add('active');
            statusTextEl.textContent = 'Protected';
            statusDescEl.textContent = 'Monitoring active';
        } else {
            statusBadgeEl.classList.remove('active');
            statusBadgeEl.classList.add('inactive');
            statusTextEl.textContent = 'Not synced';
            statusDescEl.textContent = 'Waiting for sync';
        }

        // Last sync (relative time, matching extension)
        lastSyncTime = new Date();
        lastSyncEl.textContent = 'Just now';

        // Policy count
        // The desktop agent doesn't expose policy count directly yet,
        // so we show "Loaded" or "0" based on policy_loaded flag
        policyCountEl.textContent = status.policy_loaded ? 'Active' : '0';

    } catch (error) {
        console.error('Failed to get status:', error);
    }
}

// ---------------------------------------------------------------------------
// Sync button (matching extension behavior exactly)
// ---------------------------------------------------------------------------

syncBtn.addEventListener('click', async () => {
    syncBtn.innerHTML = '<span>Syncing...</span>';
    syncBtn.disabled = true;

    try {
        await updateStatus();

        syncBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#25C688" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> <span>Synced</span>';
        setTimeout(() => {
            syncBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg> Sync Now';
            syncBtn.disabled = false;
        }, 2000);
    } catch (error) {
        syncBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg> Sync Now';
        syncBtn.disabled = false;
    }
});

// ---------------------------------------------------------------------------
// Relative time (matching extension exactly)
// ---------------------------------------------------------------------------

function formatRelativeTime(date) {
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

// Update the "Last sync" label periodically with relative time
setInterval(() => {
    if (lastSyncTime) {
        lastSyncEl.textContent = formatRelativeTime(lastSyncTime);
    }
}, 30000);

// ---------------------------------------------------------------------------
// Init + auto-refresh
// ---------------------------------------------------------------------------

updateStatus();

// Quick refresh at startup (every 5s for 1 min)
let quickCount = 0;
const quickInterval = setInterval(async () => {
    await updateStatus();
    if (++quickCount >= 12) clearInterval(quickInterval);
}, 5000);

// Then every 30s
setInterval(() => updateStatus(), 30000);
