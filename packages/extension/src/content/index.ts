/**
 * Content Script - Injected into all web pages
 * Handles: Policy enforcement UI, event tracking, domain checking
 * 
 * Strategy: Hybrid detection — Network interception (primary) + DOM monitoring (fallback)
 */

import type { ExtensionMessage, CheckDomainResponse, EventAction, ExtensionConfig } from '@/types';
import { extractDomain } from '@/utils/helpers';
import { getStorageItem, STORAGE_KEYS } from '@/utils/storage';
import { initNetworkBridge } from './network-bridge';

// DEBUG LOGGING
console.log('Onefend Content Script Loaded');

let monitoringActive = false;

// ============================================================================
// Firefox MV3 Keepalive — maintain port to prevent service worker termination
// ============================================================================
let keepaliveInitialConnect = true;

function connectKeepalive() {
    try {
        const port = chrome.runtime.connect({ name: 'keepalive' });

        // On first successful connection, the SW is now alive.
        // Trigger a config sync and re-run policy check so policies/monitoring
        // work immediately without needing to open the popup first.
        if (keepaliveInitialConnect) {
            keepaliveInitialConnect = false;
            chrome.runtime.sendMessage({ type: 'SYNC_CONFIG' }, () => {
                // After sync completes, re-run policy check if monitoring isn't active yet
                if (!monitoringActive) {
                    runPolicyCheck().catch(() => {});
                }
            });
        }

        port.onDisconnect.addListener(() => {
            setTimeout(connectKeepalive, 1000);
        });
    } catch {
        setTimeout(connectKeepalive, 5000);
    }
}
connectKeepalive();

// ============================================================================
// Initialization & Anti-Flicker
// ============================================================================

// Inject anti-flicker style immediately
const style = document.createElement('style');
style.id = 'onefend-anti-flicker';
style.textContent = 'body { visibility: hidden !important; opacity: 0 !important; }';
document.documentElement.appendChild(style);

// Hard timeout: forcibly remove anti-flicker after 2s regardless of policy check status
// Prevents pages from staying invisible if storage API hangs or first-load is slow
setTimeout(removeAntiFlicker, 2000);

// Run immediately on load
runPolicyCheck().catch(err => {
  console.error('[Content] Initial policy check failed:', err);
  removeAntiFlicker();
});

function removeAntiFlicker() {
  const style = document.getElementById('onefend-anti-flicker');
  if (style) style.remove();
}

// ============================================================================
// Page Load Handler
// ============================================================================

async function runPolicyCheck() {
  const url = window.location.href;
  const domain = extractDomain(url);

  // UX: Capture currently focused element to restore it after anti-flicker
  const previousActiveElement = document.activeElement as HTMLElement;

  try {
    // 0. Read config from storage (persists across SW restarts)
    const storedConfig = await getStorageItem(STORAGE_KEYS.CONFIG);
    const hostname = window.location.hostname;

    // Whitelist Check (Critical)
    const excludedDomains = storedConfig?.config?.excludedDomains || [];

    if (excludedDomains.some(ed => {
      const normalizedEd = ed.toLowerCase().trim();
      const normalizedHost = hostname.toLowerCase();
      // "example.com" matches "example.com" and "sub.example.com"
      return normalizedHost === normalizedEd || normalizedHost.endsWith('.' + normalizedEd);
    })) {
      console.log(`[Content] 🏳️ Domain ${hostname} is WHITELISTED. Monitoring disabled.`);
      removeAntiFlicker();
      return;
    }

    // Use hostname for policy checking instead of full URL derived "domain" to ensure consistency
    const domainToCheck = hostname;

    // 1. Check policy locally (Fast path)
    const checkResponse = await checkPolicyLocally(domainToCheck, storedConfig?.config);

    // 2. Enforce action
    // For WARN/SOFT_BLOCK/BLOCK, this will render overlays BEFORE showing body
    await handlePolicyAction(checkResponse, domainToCheck, url);

  } catch (error) {
    console.error('[Content] Policy check error:', error);
  } finally {
    // Always reveal content eventually (unless hard blocked by overlay)
    // If it was BLOCK, the overlay covers the screen anyway.
    // If it was WARN/SOFT_BLOCK, the overlay/banner is added, then we show content.
    // removing anti-flicker makes the body visible "behind" the overlay.
    requestAnimationFrame(() => {
      removeAntiFlicker();

      // UX: Restore focus to input if applicable and safe
      if (previousActiveElement && document.body.contains(previousActiveElement)) {
        // Avoid stealing focus if we showed a Blocking Overlay that needs focus
        const blockOverlay = document.getElementById('onefend-block-overlay');
        const softOverlay = document.getElementById('onefend-softblock-overlay');

        if (!blockOverlay && !softOverlay) {
          previousActiveElement.focus();
        }
      }
    });
  }

  // 3. Log visit in background
  logEvent(domain, 'VISIT');

  // 4. Start monitoring if needed (platform detection)
  if (!monitoringActive) {
    await initPlatformMonitoring(url);
  }
}

async function checkPolicyLocally(domain: string, configInput?: ExtensionConfig): Promise<CheckDomainResponse> {
  try {
    const { findBestDomainMatch } = await import('@/utils/domain-matcher');

    let config: ExtensionConfig | undefined = configInput;
    if (!config) {
      const storedConfig = await getStorageItem(STORAGE_KEYS.CONFIG);
      config = storedConfig?.config;
    }

    if (!config) return { action: 'ALLOW' };

    // Check Policies
    if (config.policies) {
      const matchingPolicy = findBestDomainMatch(domain, config.policies);
      if (matchingPolicy) {
        return {
          action: matchingPolicy.action,
          application: { name: matchingPolicy.domain, domain: matchingPolicy.domain }
        };
      }
    }

    // Check Applications
    if (config.applications) {
      const matchingApp = findBestDomainMatch(domain, config.applications);
      if (matchingApp) {
        return {
          action: matchingApp.action,
          application: { name: matchingApp.name || matchingApp.domain, domain: matchingApp.domain }
        };
      }
    }

    return { action: config.defaultAction || 'ALLOW' };
  } catch (e) {
    console.error('[Content] Local policy check failed, falling back to message:', e);
    return await checkDomain(domain, window.location.href);
  }
}

async function initPlatformMonitoring(url: string) {
  try {
    let platformConfig = await identifyPlatform(url);

    // If no specific platform is detected, use Generic monitoring logic
    // This ensures DLP protections apply to internal tools, unrecognized SaaS, and other web forms
    if (!platformConfig) {
      console.log('[Content] No official platform detected. Applying Generic DLP monitoring.');
      platformConfig = {
        id: 'generic-webapp',
        name: 'Generic Web App',
        domains: ['localhost', '127.0.0.1', extractDomain(url)],
        category: 'OTHER',
        selectors: {
          // Broad selectors to catch most text input scenarios
          input: ['textarea', 'input[type="text"]', 'input[type="search"]', '[contenteditable="true"]'],
        },
        features: {},
        isOfficial: false
      } as any;
    }

    if (platformConfig) {
      console.log('[Content] Monitored platform detected:', platformConfig.name);
      monitoringActive = true;

      // Initialize input monitoring
      const { initInputMonitoring } = await import('./monitor');
      await initInputMonitoring(platformConfig);

      // Initialize Network Bridge (primary detection layer)
      // The bridge listens for intercepted network requests from the MAIN world
      // and coordinates with the background for analysis.
      // DOM monitoring above acts as the fallback if network interception misses.
      await initNetworkBridge(platformConfig);
      console.log('[Content] Hybrid detection active: Network (primary) + DOM (fallback)');
    }
  } catch (error) {
    console.error('[Content] Platform detection failed:', error);
  }
}

async function identifyPlatform(url: string): Promise<any> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({
      type: 'IDENTIFY_PLATFORM',
      payload: { url }
    }, (response) => {
      resolve(response?.platformConfig || null);
    });
  });
}

// ============================================================================
// Domain Check
// ============================================================================

async function checkDomain(domain: string, _url: string): Promise<CheckDomainResponse> {
  return new Promise((resolve) => {
    const message: ExtensionMessage = {
      type: 'CHECK_DOMAIN',
      payload: { domain, url: _url },
    };

    chrome.runtime.sendMessage(message, (response: CheckDomainResponse) => {
      resolve(response || { action: 'ALLOW' });
    });
  });
}

// ============================================================================
// Policy Action Handler
// ============================================================================

async function handlePolicyAction(
  response: CheckDomainResponse,
  domain: string,
  _url: string
) {
  const { action, application } = response;

  console.log('[Content] handlePolicyAction called:', { domain, action, application });

  switch (action) {
    case 'BLOCK': {
      console.log('[Content] Showing BLOCK overlay for:', domain);
      const storedCfg = await getStorageItem(STORAGE_KEYS.CONFIG);
      const approvedAiName: string = String((storedCfg?.config as any)?.tenantSettings?.approvedAiName || '');
      const approvedAiUrl: string = String((storedCfg?.config as any)?.tenantSettings?.approvedAiUrl || '');
      showBlockOverlay(domain, application?.name || domain, approvedAiName, approvedAiUrl);
      await logEvent(domain, 'BLOCKED');
      break;
    }

    case 'SOFT_BLOCK': {
      // Check for user override
      const overrideKey = `softblock_override_${domain}`;
      const result = await chrome.storage.local.get(overrideKey);
      const expiry = result[overrideKey];

      console.log(`[Content] Checking SOFT_BLOCK override for ${domain}. Key: ${overrideKey}, Expiry: ${expiry}, Now: ${Date.now()}`);

      if (expiry && expiry > Date.now()) {
        console.log('[Content] SOFT_BLOCK overridden by user until:', new Date(expiry).toLocaleString());
        await logEvent(domain, 'ALLOWED');
        return;
      }

      console.log('[Content] Showing SOFT_BLOCK overlay for:', domain);
      const storedCfgSb = await getStorageItem(STORAGE_KEYS.CONFIG);
      const approvedAiNameSb: string = String((storedCfgSb?.config as any)?.tenantSettings?.approvedAiName || '');
      const approvedAiUrlSb: string = String((storedCfgSb?.config as any)?.tenantSettings?.approvedAiUrl || '');
      showSoftBlockOverlay(domain, application?.name || domain, approvedAiNameSb, approvedAiUrlSb);
      await logEvent(domain, 'WARNED');
      break;
    }

    case 'WARN':
      console.log('[Content] Showing WARN banner for:', domain);
      showWarningBanner(domain, application?.name || domain);
      await logEvent(domain, 'WARNED');
      break;

    case 'ALLOW':
      console.log('[Content] ALLOW action for:', domain);
      await logEvent(domain, 'ALLOWED');
      break;

    default:
      console.log('[Content] Unknown action:', action, 'for domain:', domain);
  }
}

// ============================================================================
// Event Logging
// ============================================================================

async function logEvent(domain: string, action: EventAction) {
  const message: ExtensionMessage = {
    type: 'LOG_EVENT',
    payload: {
      userId: '', // Will be filled by background script
      applicationId: null,
      domain,
      action,
      metadata: {
        url: window.location.href,
        timestamp: new Date().toISOString(),
      },
    },
  };

  chrome.runtime.sendMessage(message);
}

// ============================================================================
// UI Overlays
// ============================================================================

function sanitize(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function sanitizeUrl(url: string): string {
  return url.startsWith('https://') ? sanitize(url) : '';
}

function waitForBody(callback: () => void) {
  if (document.body) {
    callback();
  } else {
    document.addEventListener('DOMContentLoaded', callback);
  }
}

function showBlockOverlay(domain: string, appName: string, approvedAiName?: string, approvedAiUrl?: string) {
  waitForBody(() => {
    const overlay = document.createElement('div');
    overlay.id = 'onefend-block-overlay';

    const safeAiName = approvedAiName ? sanitize(approvedAiName) : '';
    const safeAiUrl = approvedAiUrl ? sanitizeUrl(approvedAiUrl) : '';
    const safeDomain = sanitize(domain);
    const safeAppName = sanitize(appName);

    const aiCard = (safeAiName || safeAiUrl) ? `
      <div style="border:1px solid rgba(37,198,136,0.3);border-left:3px solid #25C688;background:rgba(37,198,136,0.05);padding:13px 15px;margin-top:16px;text-align:left;">
        <p style="font-size:10px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:#25C688;margin:0 0 5px;">&#x2726; Your organization&apos;s approved AI</p>
        ${safeAiName ? `<p style="font-size:14px;font-weight:700;color:#1E1B39;margin:0 0 3px;">${safeAiName}</p>` : ''}
        ${safeAiUrl ? `<a href="${safeAiUrl}" target="_blank" rel="noopener noreferrer" style="font-size:12px;color:#6466FF;font-weight:500;word-break:break-all;">${safeAiUrl}</a>` : ''}
      </div>
    ` : '';

    overlay.innerHTML = `
      <div style="position:fixed;top:0;left:0;width:100%;height:100%;background:#FAF7FF;z-index:2147483647;display:flex;align-items:center;justify-content:center;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:24px;box-sizing:border-box;">
        <style>@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');@keyframes onefend-pulse{0%,100%{box-shadow:0 0 0 0 rgba(226,45,84,0.2)}50%{box-shadow:0 0 0 12px rgba(226,45,84,0)}}</style>
        <div style="background:#FFFFFF;border:1px solid rgba(212,200,255,0.5);max-width:540px;width:100%;padding:44px 42px;position:relative;overflow:hidden;">
          <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#E22D54 0%,#6466FF 100%);"></div>
          <div style="display:flex;align-items:center;justify-content:flex-end;gap:6px;margin-bottom:32px;">
            <span style="font-size:12px;font-weight:500;color:#A5AEB7;">Protected by</span>
            <svg width="16" height="16" viewBox="0 0 32 54" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M23.7395 31.2277V54H31.8877V18.2621L7.99512 29.4534V38.3914L23.7395 31.2277Z" fill="#6466FF"/><path d="M31.8877 0L0 14.1414V23.3076L31.8877 9.16438V0Z" fill="#6466FF"/></svg>
            <span style="font-size:14px;font-weight:700;color:#1E1B39;letter-spacing:-0.3px;">Onefend</span>
          </div>
          <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px;">
            <div style="width:56px;height:56px;border-radius:50%;background:rgba(226,45,84,0.08);border:1.5px solid rgba(226,45,84,0.2);display:flex;align-items:center;justify-content:center;flex-shrink:0;animation:onefend-pulse 2.5s ease-in-out infinite;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E22D54" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            </div>
            <div>
              <h1 style="font-size:24px;font-weight:800;color:#1E1B39;line-height:1.2;letter-spacing:-0.5px;margin:0 0 4px;">Access Blocked</h1>
              <span style="display:inline-flex;align-items:center;gap:5px;font-size:10px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:#E22D54;background:rgba(226,45,84,0.1);border-radius:999px;padding:3px 10px;">
                <span style="width:5px;height:5px;border-radius:50%;background:#E22D54;display:inline-block;"></span>
                Policy Enforced
              </span>
            </div>
          </div>
          <div style="background:#FAF7FF;border:1px solid rgba(212,200,255,0.5);border-left:3px solid #E22D54;padding:13px 15px;">
            <div style="font-size:10px;font-weight:700;color:#E22D54;letter-spacing:0.8px;text-transform:uppercase;margin-bottom:5px;">Policy Enforcement</div>
            <div style="font-size:13px;color:#A5AEB7;font-weight:500;line-height:1.6;"><strong style="color:#1E1B39;">${safeAppName}</strong> (${safeDomain}) is restricted by your organization's AI governance policy. All access attempts are logged and reported.</div>
          </div>
          ${aiCard}
          <div style="height:1px;background:rgba(212,200,255,0.5);margin:24px 0;"></div>
          <div style="display:flex;align-items:center;justify-content:flex-start;">
            <span style="font-size:12px;color:#A5AEB7;font-weight:500;">Contact your IT administrator if this is an error.</span>
          </div>
        </div>
      </div>
    `;

    document.documentElement.appendChild(overlay);
    document.body.style.overflow = 'hidden';
  });
}

function showSoftBlockOverlay(domain: string, appName: string, approvedAiName?: string, approvedAiUrl?: string) {
  waitForBody(() => {
    const overlay = document.createElement('div');
    overlay.id = 'onefend-softblock-overlay';

    const safeAiName = approvedAiName ? sanitize(approvedAiName) : '';
    const safeAiUrl = approvedAiUrl ? sanitizeUrl(approvedAiUrl) : '';
    const safeDomain = sanitize(domain);
    const safeAppName = sanitize(appName);

    const aiCard = (safeAiName || safeAiUrl) ? `
      <div style="border:1px solid rgba(37,198,136,0.3);border-left:3px solid #25C688;background:rgba(37,198,136,0.05);padding:13px 15px;margin-top:16px;text-align:left;">
        <p style="font-size:10px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:#25C688;margin:0 0 5px;">&#x2726; Your organization&apos;s approved AI</p>
        ${safeAiName ? `<p style="font-size:14px;font-weight:700;color:#1E1B39;margin:0 0 3px;">${safeAiName}</p>` : ''}
        ${safeAiUrl ? `<a href="${safeAiUrl}" target="_blank" rel="noopener noreferrer" style="font-size:12px;color:#6466FF;font-weight:500;word-break:break-all;">${safeAiUrl}</a>` : ''}
      </div>
    ` : '';

    overlay.innerHTML = `
      <div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(30,27,57,0.7);backdrop-filter:blur(4px);z-index:2147483647;display:flex;align-items:center;justify-content:center;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:24px;box-sizing:border-box;">
        <style>@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');@keyframes onefend-warn-pulse{0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,0.2)}50%{box-shadow:0 0 0 12px rgba(245,158,11,0)}}</style>
        <div style="background:#FFFFFF;border:1px solid rgba(212,200,255,0.5);max-width:540px;width:100%;padding:44px 42px;position:relative;overflow:hidden;">
          <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#F59E0B 0%,#6466FF 100%);"></div>
          <div style="display:flex;align-items:center;justify-content:flex-end;gap:6px;margin-bottom:32px;">
            <span style="font-size:12px;font-weight:500;color:#A5AEB7;">Protected by</span>
            <svg width="16" height="16" viewBox="0 0 32 54" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M23.7395 31.2277V54H31.8877V18.2621L7.99512 29.4534V38.3914L23.7395 31.2277Z" fill="#6466FF"/><path d="M31.8877 0L0 14.1414V23.3076L31.8877 9.16438V0Z" fill="#6466FF"/></svg>
            <span style="font-size:14px;font-weight:700;color:#1E1B39;letter-spacing:-0.3px;">Onefend</span>
          </div>
          <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px;">
            <div style="width:56px;height:56px;border-radius:50%;background:rgba(245,158,11,0.08);border:1.5px solid rgba(245,158,11,0.25);display:flex;align-items:center;justify-content:center;flex-shrink:0;animation:onefend-warn-pulse 2.5s ease-in-out infinite;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <div>
              <h1 style="font-size:24px;font-weight:800;color:#1E1B39;line-height:1.2;letter-spacing:-0.5px;margin:0 0 4px;">Policy Warning</h1>
              <span style="display:inline-flex;align-items:center;gap:5px;font-size:10px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:#F59E0B;background:rgba(245,158,11,0.1);border-radius:999px;padding:3px 10px;">
                <span style="width:5px;height:5px;border-radius:50%;background:#F59E0B;display:inline-block;"></span>
                Flagged Access
              </span>
            </div>
          </div>
          <div style="background:#FAF7FF;border:1px solid rgba(212,200,255,0.5);border-left:3px solid #F59E0B;padding:13px 15px;">
            <div style="font-size:10px;font-weight:700;color:#F59E0B;letter-spacing:0.8px;text-transform:uppercase;margin-bottom:5px;">Policy Enforcement</div>
            <div style="font-size:13px;color:#A5AEB7;font-weight:500;line-height:1.6;"><strong style="color:#1E1B39;">${safeAppName}</strong> (${safeDomain}) is flagged by your organization's AI governance policy. Proceeding will be logged and reported.</div>
          </div>
          ${aiCard}
          <div style="height:1px;background:rgba(212,200,255,0.5);margin:24px 0;"></div>
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
            <span style="font-size:12px;color:#A5AEB7;font-weight:500;">Contact your IT administrator if this is an error.</span>
            <div style="display:flex;gap:10px;">
              <button id="onefend-goback-btn" style="background:transparent;color:#A5AEB7;border:1px solid rgba(212,200,255,0.5);padding:10px 20px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;">Go Back</button>
              <button id="onefend-proceed-btn" style="background:#F59E0B;color:#FFFFFF;border:none;padding:10px 20px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;letter-spacing:0.2px;">Proceed Anyway</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.documentElement.appendChild(overlay);

    document.getElementById('onefend-proceed-btn')?.addEventListener('click', async () => {
      const overrideKey = `softblock_override_${domain}`;
      const expiry = Date.now() + 12 * 60 * 60 * 1000;
      await chrome.storage.local.set({ [overrideKey]: expiry });
      console.log('[Content] User overridden SOFT_BLOCK. Valid until:', new Date(expiry).toLocaleString());
      overlay.remove();
    });

    document.getElementById('onefend-goback-btn')?.addEventListener('click', () => {
      if (document.referrer) {
        window.history.back();
      } else {
        window.location.href = 'about:blank';
      }
    });
  });
}

function showWarningBanner(_domain: string, appName: string) {
  waitForBody(() => {
    if (document.getElementById('onefend-warning-banner')) {
      return;
    }

    const container = document.createElement('div');
    container.id = 'onefend-warning-banner';
    container.style.cssText = 'all: initial !important; position: fixed !important; top: 0 !important; left: 0 !important; width: 100% !important; z-index: 2147483647 !important;';

    const shadow = container.attachShadow({ mode: 'closed' });

    const banner = document.createElement('div');
    banner.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        .banner {
          position: fixed; top: 0; left: 0; width: 100%;
          background: #FFFFFF;
          border-bottom: 1px solid rgba(212,200,255,0.5);
          border-top: 3px solid #F59E0B;
          padding: 12px 20px;
          z-index: 2147483647;
          box-shadow: 0 4px 24px rgba(30,27,57,0.08);
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          display: flex; align-items: center; justify-content: space-between; gap: 12px;
        }
        .left { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
        .logo { display: flex; align-items: center; gap: 7px; flex-shrink: 0; }
        .logo-text { font-size: 13px; font-weight: 700; color: #1E1B39; letter-spacing: -0.2px; }
        .sep { width: 1px; height: 18px; background: rgba(212,200,255,0.7); flex-shrink: 0; }
        .warn-chip {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 10px; font-weight: 700; letter-spacing: 0.7px; text-transform: uppercase;
          color: #F59E0B; background: rgba(245,158,11,0.1); border-radius: 999px; padding: 3px 9px;
          flex-shrink: 0;
        }
        .dot { width: 5px; height: 5px; border-radius: 50%; background: #F59E0B; }
        .text { font-size: 13px; font-weight: 500; color: #A5AEB7; line-height: 1.4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .text strong { font-weight: 700; color: #1E1B39; }
        .dismiss-btn {
          background: transparent;
          border: 1px solid rgba(212,200,255,0.5);
          color: #A5AEB7;
          padding: 6px 14px;
          font-size: 12px; font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          flex-shrink: 0;
          transition: all 0.15s;
        }
        .dismiss-btn:hover { background: rgba(212,200,255,0.15); color: #1E1B39; }
      </style>
      <div class="banner">
        <div class="left">
          <div class="logo">
            <svg width="16" height="16" viewBox="0 0 32 54" fill="none"><path d="M23.7395 31.2277V54H31.8877V18.2621L7.99512 29.4534V38.3914L23.7395 31.2277Z" fill="#6466FF"/><path d="M31.8877 0L0 14.1414V23.3076L31.8877 9.16438V0Z" fill="#6466FF"/></svg>
            <span class="logo-text">Onefend</span>
          </div>
          <div class="sep"></div>
          <span class="warn-chip"><span class="dot"></span>Monitoring</span>
          <span class="text"><strong>${sanitize(appName)}</strong> is monitored by your organization. Usage will be logged.</span>
        </div>
        <button class="dismiss-btn" id="dismiss">Dismiss</button>
      </div>
    `;

    shadow.appendChild(banner);

    if (document.documentElement.firstChild) {
      document.documentElement.insertBefore(container, document.documentElement.firstChild);
    } else {
      document.documentElement.appendChild(container);
    }

    const dismissBtn = shadow.getElementById('dismiss');
    dismissBtn?.addEventListener('click', () => {
      container.remove();
      observer.disconnect();
    });

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          mutation.removedNodes.forEach((node) => {
            if (node === container) {
              console.log('[Content] Warning banner was removed, re-injecting...');
              if (document.documentElement.firstChild) {
                document.documentElement.insertBefore(container, document.documentElement.firstChild);
              } else {
                document.documentElement.appendChild(container);
              }
            }
          });
        }
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: false,
    });

    console.log('[Content] Warning banner injected with Shadow DOM protection');
  });
}

export { checkDomain, handlePolicyAction, logEvent };
