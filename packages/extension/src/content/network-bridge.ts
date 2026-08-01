/**
 * Network Bridge - Content Script (Isolated World)
 * 
 * Bridges the gap between the network-interceptor.ts (MAIN world) and the
 * extension's background service worker. Handles:
 * 
 * 1. Receiving intercepted request data from MAIN world via postMessage
 * 2. Deduplication: Checking if DOM monitor already approved this text
 * 3. Analysis: Sending text to background for AI + DLP analysis
 * 4. Decision UI: Showing modals for HIGH/CRITICAL risk or PII
 * 5. Responding back to MAIN world with ALLOW / BLOCK / MODIFY
 * 6. Logging audit events
 */

import { analyzeText, type AnalysisResult } from '@/analyzers/regexEngine';
import { getStorageItem, STORAGE_KEYS } from '@/utils/storage';
import { TIMEOUTS } from '@/config/constants';
import type { SensitiveDataPattern, AiAnalysisResult, PlatformConfig } from '@/types';

// ============================================================================
// Deduplication: Track texts approved by DOM monitor
// ============================================================================

const recentlyApprovedByDOM = new Map<string, number>();
const DEDUP_WINDOW_MS = 5000; // 5 seconds

/**
 * Called by monitor.ts when DOM approves a text for sending.
 * This allows the network interceptor to skip re-analysis.
 */
export function markTextAsApprovedByDOM(text: string): void {
    const key = makeDeduplicationKey(text);
    recentlyApprovedByDOM.set(key, Date.now());

    // Cleanup old entries
    for (const [k, ts] of recentlyApprovedByDOM) {
        if (Date.now() - ts > DEDUP_WINDOW_MS) {
            recentlyApprovedByDOM.delete(k);
        }
    }
}

function isRecentlyApprovedByDOM(text: string): boolean {
    const key = makeDeduplicationKey(text);
    const ts = recentlyApprovedByDOM.get(key);
    return !!ts && (Date.now() - ts < DEDUP_WINDOW_MS);
}

function makeDeduplicationKey(text: string): string {
    // Use length + first 300 chars for fast matching
    return `${text.length}:${text.substring(0, 300)}`;
}

// ============================================================================
// State
// ============================================================================

let activePatterns: SensitiveDataPattern[] = [];
let bridgeInitialized = false;
let networkInterceptCount = 0;

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize the Network Bridge.
 * Called from content/index.ts after platform detection.
 */
export async function initNetworkBridge(platformConfig?: PlatformConfig): Promise<void> {
    if (bridgeInitialized) return;
    bridgeInitialized = true;

    // Load patterns for local regex analysis
    const storedConfig = await getStorageItem(STORAGE_KEYS.CONFIG);
    if (storedConfig?.config?.patterns?.length) {
        activePatterns = storedConfig.config.patterns;
    } else {
        const storedPatterns = await getStorageItem(STORAGE_KEYS.SENSITIVE_PATTERNS);
        if (storedPatterns?.patterns?.length) {
            activePatterns = storedPatterns.patterns;
        }
    }

    // Listen for intercept messages from MAIN world
    window.addEventListener('message', handleMainWorldMessage);

    // Signal readiness to MAIN world
    window.postMessage({ type: 'ONEFEND_NET_READY' }, window.location.origin);

    // Push specific platform config if available
    if (platformConfig && (platformConfig as any).networkInterception) {
        updateNetworkEndpoints([platformConfig]);
    }

    console.log(`[NetworkBridge] ✅ Bridge initialized with ${activePatterns.length} patterns`);
}

/**
 * Push updated platform endpoint config to MAIN world interceptor.
 */
export function updateNetworkEndpoints(configs: PlatformConfig[]): void {
    const endpoints = configs
        .filter(c => c.isOfficial && (c as any).networkInterception)
        .map(c => ({
            id: c.id,
            patterns: (c as any).networkInterception?.endpoints || [],
            bodyType: (c as any).networkInterception?.bodyParser || 'json',
        }));

    if (endpoints.length > 0) {
        window.postMessage({
            type: 'ONEFEND_NET_CONFIG',
            endpoints,
        }, window.location.origin);
        console.log(`[NetworkBridge] Pushed ${endpoints.length} endpoint configs to interceptor`);
    }
}

// ============================================================================
// Main World Message Handler
// ============================================================================

async function handleMainWorldMessage(event: MessageEvent): Promise<void> {
    if (event.source !== window) return;
    if (event.data?.type !== 'ONEFEND_NET_INTERCEPT') return;

    const { requestId, body, extractedText, platformId } = event.data;

    if (!requestId || !extractedText) return;

    networkInterceptCount++;
    console.log(`[NetworkBridge] 🌐 Network intercept #${networkInterceptCount} from ${platformId}`);

    let hadLocalRedaction = false;

    try {
        // 1. DEDUP CHECK: Did DOM already approve this text?
        if (isRecentlyApprovedByDOM(extractedText)) {
            console.log('[NetworkBridge] ✅ Text recently approved by DOM — passing through');
            respondToMainWorld(requestId, 'ALLOW');
            return;
        }

        // 2. LOCAL REGEX ANALYSIS (Pre-redaction)
        let textToSend = extractedText;
        const regexResult: AnalysisResult = analyzeText(extractedText, activePatterns);

        if (regexResult.hasMatches) {
            console.log(`[NetworkBridge] Local regex: ${regexResult.matches.length} matches. Pre-redacting.`);
            let redacted = extractedText;
            activePatterns.forEach(p => {
                try {
                    const re = new RegExp(p.regex, p.caseSensitive ? 'g' : 'gi');
                    redacted = redacted.replace(re, `[${p.category.toUpperCase()}]`);
                } catch { /* skip invalid regex */ }
            });
            textToSend = redacted;
            hadLocalRedaction = extractedText !== textToSend;
        }

        // 3. BACKEND ANALYSIS (AI + DLP)
        const response = await new Promise<any>((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('Timeout')), TIMEOUTS.AI_REQUEST);

            chrome.runtime.sendMessage({
                type: 'ANALYZE_TEXT',
                payload: {
                    text: textToSend,
                    context: platformId,
                }
            }, (resp) => {
                clearTimeout(timer);
                resolve(resp);
            });
        });

        if (!response?.success || !response?.data) {
            throw new Error(response?.error || 'Analysis failed');
        }

        const result: AiAnalysisResult = response.data;
        console.log('[NetworkBridge] AI Result:', result);

        // 🔍 DEBUG: Show full processing details (same as DOM monitor)
        if (result.debug) {
            console.log(`%c[NetworkBridge] Processing Pipeline:`, 'color: #3b82f6; font-weight: bold');
            console.log(`  ✓ DLP Enabled: ${result.debug.dlpEnabled ? '🛡️ YES' : '⚡ NO'}`);
            console.log(`  ✓ DLP Called: ${result.debug.dlpCalled ? 'YES' : 'NO'}`);
            console.log(`  ✓ DLP Redacted: ${result.debug.dlpRedacted ? 'YES' : 'NO'}`);
            console.log(`  ✓ AI Called: ${result.debug.aiCalled ? 'YES' : 'NO'}`);
            console.log(`%c[NetworkBridge] Timing Breakdown:`, 'color: #22c55e; font-weight: bold');
            if (result.debug.timings.dlpMs !== undefined) {
                console.log(`  ⏱️  DLP API: ${result.debug.timings.dlpMs}ms`);
            }
            console.log(`  ⏱️  AI Analysis: ${result.debug.timings.aiMs}ms`);
            console.log(`  ⏱️  Total: ${result.debug.timings.totalMs}ms`);
        }

        // 4. DECISION MATRIX (mirrors monitor.ts logic)
        const hasPIILocal = regexResult.hasMatches;
        const hasPIIBackend = result.recommendation === 'CONFIRM_REDACTION' ||
            (result.redactedText && result.redactedText !== textToSend);
        const hasPII = hasPIILocal || hasPIIBackend;
        const riskLevel = result.originalRisk || result.riskLevel;
        const redactedText = result.redactedText || textToSend;

        console.log('[NetworkBridge] PII Detection:', { hasPIILocal, hasPIIBackend, hasPII, riskLevel });

        // RULE 1: LOW/MEDIUM without PII → Auto-allow
        if ((riskLevel === 'LOW' || riskLevel === 'MEDIUM') && !hasPII) {
            console.log('[NetworkBridge] Low/Medium risk, no PII → ALLOW');
            logNetworkEvent('ALLOWED', result, extractedText.length, platformId, regexResult);
            respondToMainWorld(requestId, 'ALLOW');
            return;
        }

        // RULE 2: PII detected → Show REDACTION modal
        if (hasPII) {
            const modifiedBody = buildModifiedBody(body, platformId, extractedText, redactedText);
            showNetworkDecisionModal({
                type: 'REDACTION',
                title: 'Sensitive Data Detected',
                message: `Network request to <b>${platformId}</b> contains ${riskLevel} risk content with PII.`,
                previewText: redactedText,
                riskLevel,
                hasPII: true,
                onSendRedacted: () => {
                    logNetworkEvent('REDACTED_SEND', result, extractedText.length, platformId, regexResult);
                    respondToMainWorld(requestId, 'MODIFY', modifiedBody);
                },
                onProceedAnyway: () => {
                    logNetworkEvent('USER_OVERRIDE', result, extractedText.length, platformId, regexResult);
                    respondToMainWorld(requestId, 'ALLOW');
                },
                onBlock: () => {
                    logNetworkEvent('BLOCK', result, extractedText.length, platformId, regexResult);
                    respondToMainWorld(requestId, 'BLOCK');
                },
            });
            return;
        }

        // RULE 3: HIGH/CRITICAL without PII → Show WARNING modal
        if (riskLevel === 'HIGH' || riskLevel === 'CRITICAL') {
            showNetworkDecisionModal({
                type: 'WARNING',
                title: 'Security Warning',
                message: `Network request to <b>${platformId}</b> is classified as ${result.category} (${riskLevel} risk).`,
                riskLevel,
                hasPII: false,
                onSendRedacted: () => {
                    logNetworkEvent('WARNED_PROCEED', result, extractedText.length, platformId, regexResult);
                    respondToMainWorld(requestId, 'ALLOW');
                },
                onBlock: () => {
                    logNetworkEvent('BLOCK', result, extractedText.length, platformId, regexResult);
                    respondToMainWorld(requestId, 'BLOCK');
                },
            });
            return;
        }

        // RULE 4: Default → Allow
        logNetworkEvent('ALLOWED', result, extractedText.length, platformId, regexResult);
        respondToMainWorld(requestId, 'ALLOW');

    } catch (err: any) {
        console.error('[NetworkBridge] Analysis error:', err.message);
        // Fail open — allow the request through
        // hadLocalRedaction is available here since it's declared before try
        console.warn(`[NetworkBridge] Failing open. Local redaction was: ${hadLocalRedaction}`);
        respondToMainWorld(requestId, 'ALLOW');
    }
}

// ============================================================================
// Communication Back to MAIN World
// ============================================================================

function respondToMainWorld(requestId: string, action: string, modifiedBody?: string): void {
    window.postMessage({
        type: 'ONEFEND_NET_RESPONSE',
        requestId,
        action,
        modifiedBody,
    }, window.location.origin);
}

// ============================================================================
// Body Modification (for Redaction)
// ============================================================================

function buildModifiedBody(
    bodyStr: string, platformId: string,
    originalText: string, redactedText: string
): string {
    try {
        const body = JSON.parse(bodyStr);

        if (platformId === 'chatgpt' && body.messages) {
            for (let i = body.messages.length - 1; i >= 0; i--) {
                const msg = body.messages[i];
                if (msg?.content?.parts && Array.isArray(msg.content.parts)) {
                    msg.content.parts = msg.content.parts.map((p: any) =>
                        typeof p === 'string' ? p.replaceAll(originalText, redactedText) : p
                    );
                }
            }
        } else if (platformId === 'claude') {
            if (typeof body.prompt === 'string') body.prompt = body.prompt.replaceAll(originalText, redactedText);
            if (typeof body.content === 'string') body.content = body.content.replaceAll(originalText, redactedText);
            if (body.messages) {
                for (const msg of body.messages) {
                    if (typeof msg.content === 'string') {
                        msg.content = msg.content.replaceAll(originalText, redactedText);
                    }
                }
            }
        } else if (platformId === 'deepseek') {
            // DeepSeek uses OpenAI-compatible messages format
            if (body.messages && Array.isArray(body.messages)) {
                for (const msg of body.messages) {
                    if (typeof msg.content === 'string') {
                        msg.content = msg.content.replaceAll(originalText, redactedText);
                    } else if (Array.isArray(msg.content)) {
                        for (const part of msg.content) {
                            if (part.type === 'text' && typeof part.text === 'string') {
                                part.text = part.text.replaceAll(originalText, redactedText);
                            }
                        }
                    }
                }
            }
            if (typeof body.prompt === 'string') body.prompt = body.prompt.replaceAll(originalText, redactedText);
            if (typeof body.message === 'string') body.message = body.message.replaceAll(originalText, redactedText);
        } else if (platformId === 'ernie') {
            // Ernie/Baidu: text, query, msg, or messages
            if (typeof body.text === 'string') body.text = body.text.replaceAll(originalText, redactedText);
            if (typeof body.query === 'string') body.query = body.query.replaceAll(originalText, redactedText);
            if (typeof body.msg === 'string') body.msg = body.msg.replaceAll(originalText, redactedText);
            if (body.messages && Array.isArray(body.messages)) {
                for (const msg of body.messages) {
                    if (typeof msg.content === 'string') {
                        msg.content = msg.content.replaceAll(originalText, redactedText);
                    }
                }
            }
        } else {
            // Generic: try common fields
            for (const f of ['text', 'message', 'prompt', 'content', 'query', 'input']) {
                if (body[f] && typeof body[f] === 'string') {
                    body[f] = body[f].replaceAll(originalText, redactedText);
                }
            }
        }

        return JSON.stringify(body);
    } catch {
        return bodyStr.replaceAll(originalText, redactedText);
    }
}

// ============================================================================
// Decision Modal (Simplified for Network Context)
// ============================================================================

interface NetworkModalProps {
    type: 'REDACTION' | 'WARNING';
    title: string;
    message: string;
    previewText?: string;
    riskLevel: string;
    hasPII: boolean;
    onSendRedacted: () => void;
    onProceedAnyway?: () => void;
    onBlock: () => void;
}

function showNetworkDecisionModal(props: NetworkModalProps): void {
    const existing = document.getElementById('onefend-net-modal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'onefend-net-modal';
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(0, 0, 0, 0.7); z-index: 2147483647;
        display: flex; justify-content: center; align-items: center;
        backdrop-filter: blur(5px); font-family: system-ui, sans-serif;
    `;

    let accentColor = '#3b82f6';
    if (props.type === 'WARNING' || props.riskLevel === 'HIGH') accentColor = '#eab308';
    if (props.riskLevel === 'CRITICAL') accentColor = '#ef4444';

    const btnBase = `min-width: 120px; height: 40px; border-radius: 8px; cursor: pointer; font-weight: 500; font-size: 14px; transition: all 0.2s;`;

    let buttonsHtml = '';
    if (props.type === 'REDACTION' && props.hasPII) {
        buttonsHtml = `
            <button id="sai-net-block" style="${btnBase} background: transparent; border: 1px solid #374151; color: #9ca3af;">Block Request</button>
            ${props.onProceedAnyway ? `<button id="sai-net-override" style="${btnBase} background: rgba(255,255,255,0.05); border: 1px solid #374151; color: #e5e7eb;">Proceed Anyway</button>` : ''}
            <button id="sai-net-confirm" style="${btnBase} background: ${accentColor}; border: none; color: white; font-weight: 600;">Send Redacted</button>
        `;
    } else {
        buttonsHtml = `
            <button id="sai-net-block" style="${btnBase} background: transparent; border: 1px solid #374151; color: #9ca3af;">Block Request</button>
            <button id="sai-net-confirm" style="${btnBase} background: ${accentColor}; border: none; color: white; font-weight: 600;">Proceed Anyway</button>
        `;
    }

    // Icon
    const isHighRisk = props.riskLevel === 'HIGH' || props.riskLevel === 'CRITICAL';
    const iconSvg = isHighRisk
        ? '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>'
        : '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>';

    const card = document.createElement('div');
    card.style.cssText = `
        background: #111827; color: white; width: 560px; max-height: 600px;
        border-radius: 16px; padding: 0;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-left: 4px solid ${accentColor};
        display: flex; flex-direction: column;
    `;

    card.innerHTML = `
        <div style="padding: 24px 20px 20px 20px;">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                <div style="background: ${accentColor}20; padding: 10px; border-radius: 12px;">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${accentColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        ${iconSvg}
                    </svg>
                </div>
                <div>
                    <h2 style="margin: 0; font-size: 18px; font-weight: 600;">${props.title}</h2>
                    <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">🌐 Captured via Network Interception</div>
                </div>
            </div>

            <p style="margin: 0 0 20px 0; color: #9ca3af; line-height: 1.5; font-size: 14px;">
                ${props.message}
            </p>

            ${props.previewText ? `
                <div style="background: #1f2937; padding: 12px; border-radius: 8px; margin-bottom: 0; border: 1px solid #374151; max-height: 200px; overflow-y: auto;">
                    <div style="font-size: 11px; text-transform: uppercase; color: #6b7280; margin-bottom: 8px; font-weight: 600;">Redacted Content Preview</div>
                    <div style="font-family: monospace; font-size: 13px; color: #ef4444; white-space: pre-wrap; word-break: break-word;">${escapeHtml(props.previewText)}</div>
                </div>
            ` : ''}
        </div>

        <div style="display: flex; align-items: center; justify-content: flex-end; gap: 8px; padding: 0 20px 24px 20px;">
            ${buttonsHtml}
        </div>
    `;

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    // Bind events
    document.getElementById('sai-net-confirm')?.addEventListener('click', () => {
        overlay.remove();
        props.onSendRedacted();
    });

    document.getElementById('sai-net-block')?.addEventListener('click', () => {
        overlay.remove();
        props.onBlock();
    });

    document.getElementById('sai-net-override')?.addEventListener('click', () => {
        overlay.remove();
        props.onProceedAnyway?.();
    });
}

function escapeHtml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ============================================================================
// Audit Event Logging
// ============================================================================

async function logNetworkEvent(
    action: string,
    result: AiAnalysisResult,
    textLength: number,
    platformId: string,
    regexResult?: AnalysisResult,
): Promise<void> {
    const authData = await chrome.storage.local.get(['auth']);
    if (!authData.auth?.deviceId) return;

    const piiTypes: string[] = [];
    if (regexResult?.hasMatches && regexResult.matches) {
        regexResult.matches.forEach((m: any) => {
            if (m.patternName && !piiTypes.includes(m.patternName)) piiTypes.push(m.patternName);
        });
    }

    const riskLevel = result.originalRisk || result.riskLevel;
    const finalRisk = calculateResidualRisk(riskLevel, action);

    chrome.runtime.sendMessage({
        type: 'LOG_CONVERSATION_EVENT',
        payload: {
            deviceId: authData.auth.deviceId,
            platform: platformId,
            conversationId: 'network-intercept',
            action,
            riskLevel: finalRisk,
            dataTypes: piiTypes.length > 0 ? piiTypes : (result.category ? [result.category] : []),
            sensitiveDataDetected: piiTypes.length > 0 || !['ALLOWED', 'ALLOW'].includes(action),
            inputLength: textLength,
            analysisSource: 'NETWORK_INTERCEPT',
            confidence: result.confidenceScore || 0.9,
            patternMatches: regexResult?.matches || [],
            aiCategory: result.category,
            aiRiskLevel: riskLevel,
            aiSummary: result.summary || 'Network interception analysis',
            userOverride: action === 'USER_OVERRIDE',
        },
    });
}

function calculateResidualRisk(originalRisk: string, action: string): string {
    if (action === 'BLOCK' || action === 'CLEAR_TEXT') return 'LOW';
    if (action === 'REDACTED_SEND') {
        if (originalRisk === 'CRITICAL') return 'HIGH';
        if (originalRisk === 'HIGH') return 'MEDIUM';
        return 'LOW';
    }
    if (action === 'USER_OVERRIDE') return originalRisk;
    return originalRisk;
}

