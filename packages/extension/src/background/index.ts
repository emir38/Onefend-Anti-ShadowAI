/**
 * Background Service Worker (Manifest V3)
 * Handles: Config sync, event batching, policy enforcement, token renewal
 */

import { ALARMS, CONFIG_SYNC_INTERVAL, EVENT_SYNC_INTERVAL, TOKEN_RENEWAL_CHECK_INTERVAL } from '@/config/constants';
import { isRegistered } from '@/utils/storage';
import type { ExtensionMessage } from '@/types';

console.log('[Background] Service worker initialized');

// ============================================================================
// Firefox MV3 Keepalive
// Firefox kills service workers after ~30s of inactivity.
// Keeping open ports from content scripts prevents this.
// ============================================================================
const keepalivePorts = new Set<chrome.runtime.Port>();

chrome.runtime.onConnect.addListener((port) => {
    if (port.name === 'keepalive') {
        keepalivePorts.add(port);
        port.onDisconnect.addListener(() => {
            keepalivePorts.delete(port);
        });
    }
});

// ============================================================================
// Installation & Startup
// ============================================================================

chrome.runtime.onInstalled.addListener(async (details) => {
    console.log('[Background] Extension installed/updated:', details.reason);

    // Check if already registered
    const registered = await isRegistered();
    console.log('[Background] Initial registration check:', registered);

    if (!registered) {
        // Open onboarding page
        chrome.tabs.create({
            url: chrome.runtime.getURL('src/pages/onboarding.html'),
        });
    } else {
        // Already registered, setup alarms
        await setupAlarms();
        // Trigger initial sync immediately
        await syncConfig();
        // Force another sync in 5 seconds to ensure robustness after wakeup
        setTimeout(() => syncConfig(), 5000);
    }
});

chrome.runtime.onStartup.addListener(async () => {
    console.log('[Background] Browser started');

    const registered = await isRegistered();
    console.log('[Background] Startup registration check:', registered);

    if (registered) {
        await setupAlarms();
        await syncConfig();
    }
});

// ============================================================================
// Programmatic Content Script Injection (Stability Control)
// ============================================================================

// Re-enabled to ensure DOM is ready before injection
// Re-enabled to ensure DOM is ready before injection
// chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
//     if (changeInfo.status === 'complete' && tab.url) {
//         if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
//             return;
//         }
// 
//         // Wait for page interactivity and stability before injecting
//         setTimeout(async () => {
//             try {
//                 await chrome.scripting.executeScript({
//                     target: { tabId },
//                     files: ['src/content/index.js'],
//                 });
//                 console.log(`[Background] Script injected into tab ${tabId}`);
//             } catch (error) {
//                 // Ignore errors for pages where injection is not allowed
//                 console.debug(`[Background] Injection failed for tab ${tabId}:`, error);
//             }
//         }, 5000);
//     }
// });

// ============================================================================
// Alarms Setup
// ============================================================================

async function setupAlarms() {
    // Clear existing alarms
    await chrome.alarms.clearAll();

    // Config sync alarm
    chrome.alarms.create(ALARMS.SYNC_CONFIG, {
        periodInMinutes: CONFIG_SYNC_INTERVAL / 60000,
    });

    // Event sync alarm
    chrome.alarms.create(ALARMS.SYNC_EVENTS, {
        periodInMinutes: EVENT_SYNC_INTERVAL / 60000,
    });

    // Token renewal check
    chrome.alarms.create(ALARMS.RENEW_TOKEN, {
        periodInMinutes: TOKEN_RENEWAL_CHECK_INTERVAL / 60000,
    });

    console.log('[Background] Alarms configured');
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
    console.log('[Background] Alarm triggered:', alarm.name);

    switch (alarm.name) {
        case ALARMS.SYNC_CONFIG:
            await syncConfig();
            break;
        case ALARMS.SYNC_EVENTS:
            await syncEvents();
            break;
        case ALARMS.RENEW_TOKEN:
            await checkTokenRenewal();
            break;
    }
});

// ============================================================================
// Error Handling
// ============================================================================

async function handleAuthError(error: any) {
    // Check for ApiError with 401 or 403 status
    if (error.name === 'ApiError' && (error.status === 401 || error.status === 403)) {
        console.log('[Background] potential auth error detected. Verifying Status...');

        try {
            // Attempt to renew/validate token before wiping
            const { renewToken } = await import('@/api/client');
            const { getStorageItem, setStorageItem, STORAGE_KEYS } = await import('@/utils/storage');

            console.log('[Background] Calling renewToken() check...');

            // Add timeout race to prevent hanging
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Renew token timeout')), 5000)
            );

            const response = await Promise.race([
                renewToken(),
                timeoutPromise
            ]) as any;

            console.log('[Background] renewToken response:', JSON.stringify(response));

            if (response.renewed && response.token) {
                const auth = await getStorageItem(STORAGE_KEYS.AUTH);
                if (auth) {
                    auth.token = response.token;
                    await setStorageItem(STORAGE_KEYS.AUTH, auth);
                    console.log('[Background] Token renewed successfully. Preventing reset.');
                }
                return false; // Handled
            }
            console.log('[Background] Renew succeeded but no token? Response:', response);
        } catch (renewError: any) {
            console.error('[Background] Renew Token Error Details:', {
                name: renewError.name,
                message: renewError.message,
                status: renewError.status,
                stack: renewError.stack
            });

            if (renewError.name === 'ApiError' && renewError.status === 401) {
                console.log('[Background] Authentication failed definitively (Token Invalid/Expired). Resetting extension...');

                const { clearStorage } = await import('@/utils/storage');

                // 1. Clear local storage
                await clearStorage();

                // 2. Clear all alarms
                await chrome.alarms.clearAll();

                // 3. Open onboarding page
                chrome.tabs.create({
                    url: chrome.runtime.getURL('src/pages/onboarding.html'),
                });

                return true;
            } else {
                console.log(`[Background] Transient/Non-Auth error during token check (${renewError.status || renewError.message}). Skipping reset.`);
                return false;
            }
        }

        // Catch-all for other initial errors if we didn't return above
        return false;
    }
    return false;
}

// ============================================================================
// Config Sync
// ============================================================================

async function syncConfig() {
    console.log('[Background] Syncing configuration...');

    try {
        const { getConfig } = await import('@/api/client');
        const { setStorageItem, STORAGE_KEYS } = await import('@/utils/storage');
        const { syncPlatformData } = await import('@/background/services/platformSync');

        // Sync everything in parallel
        await Promise.all([
            (async () => {
                const config = await getConfig();
                await setStorageItem(STORAGE_KEYS.CONFIG, {
                    config,
                    lastSync: Date.now(),
                });

                // Update network rules (Just clears them for now to ensure connection stability)
                await updateNetRequestRules(config);

                // RESET ALARM with new interval from config (if present)
                if (config.syncInterval) {
                    // chrome.alarms.create overwrites existing alarm with same name
                    chrome.alarms.create(ALARMS.SYNC_CONFIG, {
                        periodInMinutes: config.syncInterval / 60000
                    });
                    console.log(`[Background] Updated sync interval to ${config.syncInterval / 1000}s`);
                }
            })(),
            syncPlatformData()
        ]);

        console.log('[Background] Full configuration synced successfully');
    } catch (error) {
        console.error('[Background] Config sync failed:', error);
        await handleAuthError(error);
    }
}

// ============================================================================
// Event Sync
// ============================================================================

async function syncEvents() {
    // console.log('[Background] Syncing events...');

    try {
        const { getStorageItem, setStorageItem, STORAGE_KEYS } = await import('@/utils/storage');
        const { sendEvents } = await import('@/api/client');

        const eventQueue = await getStorageItem(STORAGE_KEYS.EVENT_QUEUE) || [];

        if (eventQueue.length === 0) {
            return;
        }

        // Send events to backend
        await sendEvents(eventQueue);

        // Clear event queue
        await setStorageItem(STORAGE_KEYS.EVENT_QUEUE, []);
        await setStorageItem(STORAGE_KEYS.LAST_EVENT_SYNC, Date.now());

        console.log(`[Background] Synced ${eventQueue.length} events`);
    } catch (error) {
        console.error('[Background] Event sync failed:', error);
        await handleAuthError(error);
    }
}

// ============================================================================
// Token Renewal
// ============================================================================

async function checkTokenRenewal() {
    console.log('[Background] Checking token renewal...');

    try {
        const { renewToken } = await import('@/api/client');
        const { getStorageItem, setStorageItem, STORAGE_KEYS } = await import('@/utils/storage');

        const response = await renewToken();

        if (response.renewed && response.token) {
            const auth = await getStorageItem(STORAGE_KEYS.AUTH);
            if (auth) {
                auth.token = response.token;
                await setStorageItem(STORAGE_KEYS.AUTH, auth);
                console.log('[Background] Token renewed successfully');
            }
        }
    } catch (error) {
        console.error('[Background] Token renewal failed:', error);
        await handleAuthError(error);
    }
}

// ============================================================================
// DeclarativeNetRequest Rules Update
// ============================================================================

async function updateNetRequestRules(config: any) {
    console.log('[Background] Updating network request rules...');

    try {
        // 1. Get all existing dynamic rules
        const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
        const existingRuleIds = existingRules.map(rule => rule.id);

        // 2. Build approved AI query params from tenant settings (if configured)
        const approvedAiName: string = config?.tenantSettings?.approvedAiName || '';
        const approvedAiUrl: string = config?.tenantSettings?.approvedAiUrl || '';
        const aiParams = [
            approvedAiName ? `approvedAiName=${encodeURIComponent(approvedAiName)}` : '',
            approvedAiUrl ? `approvedAiUrl=${encodeURIComponent(approvedAiUrl)}` : '',
        ].filter(Boolean).join('&');

        // 3. Create new rules from config
        const newRules: chrome.declarativeNetRequest.Rule[] = [];
        let ruleId = 1;

        // Helper to add rule
        const addRule = (domain: string) => {
            const queryString = aiParams ? `?domain=${domain}&${aiParams}` : `?domain=${domain}`;
            newRules.push({
                id: ruleId++,
                priority: 1,
                action: {
                    type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
                    redirect: { extensionPath: `/src/pages/blocked.html${queryString}` }
                },
                condition: {
                    urlFilter: `||${domain}^`,
                    resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME]
                }
            });
        };

        // Process Policies (BLOCK only)
        if (config?.policies) {
            for (const policy of config.policies) {
                if (policy.action === 'BLOCK') addRule(policy.domain);
            }
        }

        // Process Applications (BLOCK only)
        if (config?.applications) {
            for (const app of config.applications) {
                const hasOverride = config.policies?.some((p: any) => p.domain === app.domain);
                if (!hasOverride && app.action === 'BLOCK') addRule(app.domain);
            }
        }

        // 4. Update rules (Replace all)
        await chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: existingRuleIds,
            addRules: newRules
        });

        console.log(`[Background] Updated rules: ${newRules.length} active blocks (approvedAiName=${approvedAiName || 'none'})`);

    } catch (error) {
        console.error('[Background] Failed to update network rules:', error);
    }
}

// ============================================================================
// Domain Policy Check
// ============================================================================

async function checkDomainPolicy(domain: string): Promise<any> {
    try {
        const { getStorageItem, STORAGE_KEYS } = await import('@/utils/storage');
        const { findBestDomainMatch } = await import('@/utils/domain-matcher');

        const storedConfig = await getStorageItem(STORAGE_KEYS.CONFIG);

        if (!storedConfig || !storedConfig.config) {
            return { action: 'ALLOW' };
        }

        const config = storedConfig.config;

        // Find best matching policy
        const matchingPolicy = findBestDomainMatch(domain, config.policies || []);
        if (matchingPolicy) {
            console.log(`[Background] Policy found for ${domain}: ${matchingPolicy.action}`);
            return {
                action: matchingPolicy.action,
                application: {
                    name: matchingPolicy.domain,
                    domain: matchingPolicy.domain,
                },
            };
        }

        // Find best matching application
        const matchingApp = findBestDomainMatch(domain, config.applications || []);
        if (matchingApp) {
            console.log(`[Background] Application found for ${domain}: ${matchingApp.action}`);
            return {
                action: matchingApp.action,
                application: {
                    name: matchingApp.name || matchingApp.domain,
                    domain: matchingApp.domain,
                },
            };
        }

        return { action: config.defaultAction || 'ALLOW' };
    } catch (error) {
        console.error('[Background] Error checking domain policy:', error);
        return { action: 'ALLOW' };
    }
}

// ============================================================================
// Message Handling
// ============================================================================

chrome.runtime.onMessage.addListener((message: ExtensionMessage | any, sender, sendResponse) => {
    // Only accept messages from our own extension
    if (sender.id !== chrome.runtime.id) {
        console.warn('Rejected message from unknown sender:', sender.id);
        return;
    }

    // console.log('[Background] Message received:', message.type);

    (async () => {
        try {
            switch (message.type) {
                case 'SYNC_CONFIG':
                    await syncConfig();
                    sendResponse({ success: true });
                    break;
                case 'GET_CONFIG':
                    const { getStorageItem, STORAGE_KEYS } = await import('@/utils/storage');
                    const storedConfig = await getStorageItem(STORAGE_KEYS.CONFIG);
                    sendResponse({ success: true, data: storedConfig });
                    break;
                case 'LOG_EVENT':
                    await logEvent(message.payload);
                    sendResponse({ success: true });
                    break;
                case 'LOG_CONVERSATION_EVENT':
                    // New: Handle conversation events from monitor.ts
                    const { eventQueue } = await import('@/services/eventQueue');
                    await eventQueue.addEvent(message.payload);

                    // 🚀 CRITICAL: Fast Track for High Risk Events
                    // If it's a security incident, don't wait for the batch timer. Send it NOW.
                    if (message.payload.riskLevel === 'HIGH' || message.payload.riskLevel === 'CRITICAL') {
                        console.log('🚀 Fast Tracking Critical Event Sync');
                        await syncEvents();
                    }

                    sendResponse({ success: true });
                    break;
                case 'CHECK_DOMAIN':
                    const res = await checkDomainPolicy((message.payload as any).domain);
                    sendResponse(res);
                    break;
                case 'GET_AUTH_STATUS':
                    const registered = await isRegistered();
                    sendResponse({ success: true, registered });
                    break;
                case 'IDENTIFY_PLATFORM':
                    const { getPlatformConfigForUrl } = await import('@/background/services/platformSync');
                    const platformConfig = await getPlatformConfigForUrl((message.payload as any).url);
                    sendResponse({ platformConfig });
                    break;
                case 'ANALYZE_TEXT':
                    const { aiAnalyze } = await import('@/api/client');
                    const { text, context, images, documents } = message.payload as any;
                    try {
                        const analysis = await aiAnalyze(text, context, images, documents);
                        sendResponse({ success: true, data: analysis });
                    } catch (err: any) {
                        console.error('[Background] AI Analysis failed:', err);
                        // Return explicit error object so content script can detect 429
                        sendResponse({ success: false, error: err.message, status: err.status });
                    }
                    break;

                default:
                    sendResponse({ success: false, error: 'Unknown message type' });
            }
        } catch (error) {
            console.error('[Background] Message handler error:', error);
            sendResponse({ success: false, error: (error as Error).message });
        }
    })();

    return true; // Async response
});

async function logEvent(event: any) {
    const { getStorageItem, setStorageItem, STORAGE_KEYS } = await import('@/utils/storage');
    const { MAX_EVENT_QUEUE_SIZE } = await import('@/config/constants');

    const eventQueue = await getStorageItem(STORAGE_KEYS.EVENT_QUEUE) || [];
    eventQueue.push({ ...event, timestamp: new Date().toISOString() });

    if (eventQueue.length > MAX_EVENT_QUEUE_SIZE) eventQueue.shift();
    await setStorageItem(STORAGE_KEYS.EVENT_QUEUE, eventQueue);
}
