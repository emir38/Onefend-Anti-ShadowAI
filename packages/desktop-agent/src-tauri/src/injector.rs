use anyhow::{Context, Result};
use std::fs;
use std::path::PathBuf;
use tracing::{error, info};

use crate::api_client::PolicyConfig;

/// Handles loading and injecting the compiled monitor.ts bundle
pub struct Injector {
    bundle_path: PathBuf,
}

impl Injector {
    pub fn new() -> Self {
        // Path to the compiled bundle (will be created in Phase 2)
        let bundle_path = PathBuf::from("..")
            .join("injected")
            .join("dist")
            .join("bundle.js");

        Self { bundle_path }
    }

    /// Generate a dynamic script based on the current policy and device identity
    pub fn generate_policy_script(policy: &PolicyConfig, device_id: &str) -> String {
        let keywords_json =
            serde_json::to_string(&policy.blocked_keywords).unwrap_or("[]".to_string());
        // If monitoring is disabled globally, disable DLP features
        let dlp_enabled = policy.dlp_enabled && policy.monitoring_enabled;

        format!(
            r###"
        (function() {{
            // Prevent multiple injections
            if (window.__ONEFEND_INSTALLED) {{
                console.log("🔄 Updating Onefend Policy...");
                window.__ONEFEND_POLICY = {{
                    keywords: {keywords},
                    dlpEnabled: {dlp_enabled}
                }};
                console.log("🔄 Policy updated (Already Installed).");
                return "ALREADY_INSTALLED";
            }}
            window.__ONEFEND_INSTALLED = true;

            // Cleanup previous poller if exists (defensive)
            if (window.__ONEFEND_POLLER) {{
                clearInterval(window.__ONEFEND_POLLER);
                window.__ONEFEND_POLLER = null;
            }}

            const POLICY = {{
                keywords: {keywords},
                dlpEnabled: {dlp_enabled}
            }};
            window.__ONEFEND_POLICY = POLICY;
            
            console.log("🔒 Onefend Policy Enforced:", POLICY);
            
            // Visual Indicator
            const badge = document.createElement('div');
            badge.id = 'onefend-badge';
            badge.textContent = '🛡️ Protected by Onefend';
            badge.style.cssText = 'position: fixed; bottom: 10px; right: 10px; background: linear-gradient(135deg, #10a37f 0%, #0d8c6c 100%); color: white; padding: 6px 10px; border-radius: 6px; z-index: 999999; font-family: sans-serif; font-size: 11px; font-weight: bold; box-shadow: 0 2px 10px rgba(0,0,0,0.2); pointer-events: none; opacity: 0.9; transition: all 0.3s;';
            document.body.appendChild(badge);

            if (!POLICY.dlpEnabled) return;

            // === DEDUPLICATION MECHANISM ===
            const approvedTextHashes = new Map();
            const DEDUP_TTL = 15000;

            function hashText(text) {{
                let hash = 0;
                const sample = text.substring(0, 200);
                for (let i = 0; i < sample.length; i++) {{
                    const ch = sample.charCodeAt(i);
                    hash = ((hash << 5) - hash) + ch;
                    hash |= 0;
                }}
                return hash.toString();
            }}

            function markAsApproved(text) {{
                const hash = hashText(text);
                approvedTextHashes.set(hash, Date.now());
                for (const [k, t] of approvedTextHashes) {{
                    if (Date.now() - t > DEDUP_TTL) approvedTextHashes.delete(k);
                }}
            }}

            function wasRecentlyApproved(text) {{
                const hash = hashText(text);
                const ts = approvedTextHashes.get(hash);
                return !!(ts && (Date.now() - ts < DEDUP_TTL));
            }}

            // === BRIDGE & INTERCEPTOR START ===
            
            // Pending requests map for async Rust communication
            const pendingRequests = new Map();
            
            // Listen for responses from Rust
            window.addEventListener('message', (event) => {{
                if (event.data && event.data.type === 'ONEFEND_RESPONSE') {{
                    const {{ id, response, error }} = event.data;
                    if (pendingRequests.has(id)) {{
                        const {{ resolve, reject }} = pendingRequests.get(id);
                        pendingRequests.delete(id);
                        if (error) reject(new Error(error));
                        else resolve(response);
                    }}
                }}
            }});

            async function callRustBackend(textToAnalyze) {{
                return new Promise((resolve, reject) => {{
                    const id = Date.now().toString() + Math.random().toString();
                    pendingRequests.set(id, {{ resolve, reject }});
                    
                    const payload = {{
                        text: textToAnalyze || "",
                        documents: [],
                        images: [],
                        context: "Desktop",
                    }};
                    
                    const msg = {{
                        type: "ANALYZE",
                        id,
                        payload
                    }};
                    
                    // Try binding first
                    if (window.onefendBridge) {{
                        window.onefendBridge(JSON.stringify(msg));
                    }} else {{
                        console.log("__ONEFEND_BRIDGE__", JSON.stringify(msg));
                        reject(new Error("Desktop Agent bridge not connected"));
                    }}

                    // Timeout
                    setTimeout(() => {{
                         if (pendingRequests.has(id)) {{
                             pendingRequests.delete(id);
                             reject(new Error("Analysis timeout"));
                         }}
                    }}, 15000);
                }});
            }}

            function reportEventToRust(eventData) {{
                const id = Date.now().toString() + Math.random().toString();
                
                const payload = {{
                     ...eventData,
                     deviceId: eventData.deviceId || "{device_id}", 
                     platform: eventData.platform || "ChatGPT Desktop",
                     analysisSource: eventData.analysisSource || "desktop-agent",
                     inputLength: eventData.inputLength || 0,
                     confidence: eventData.confidence || 0.9,
                     sensitiveDataDetected: eventData.sensitiveDataDetected === true,
                     dataTypes: eventData.dataTypes || [],
                }};

                const msg = {{
                    type: "LOG_EVENT",
                    id,
                    payload
                }};
                
                if (window.onefendBridge) {{
                     window.onefendBridge(JSON.stringify(msg));
                }} else {{
                     // Fallback log
                }}
            }}

            // Create UI Overlay
            function showLoadingOverlay() {{
                if (document.getElementById('onefend-loading-overlay')) return;
                const overlay = document.createElement('div');
                overlay.id = 'onefend-loading-overlay';
                overlay.style.cssText = `
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(0,0,0,0.5); z-index: 100000;
                    display: flex; justify-content: center; align-items: center;
                    backdrop-filter: blur(2px);
                `;
                overlay.innerHTML = `
                    <div style="background: #1f2937; padding: 20px; border-radius: 12px; border: 1px solid #374151; display: flex; align-items: center; gap: 12px; color: white; font-family: sans-serif; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
                        <div class="onefend-spinner" style="width: 20px; height: 20px; border: 3px solid #10a37f; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                        <span style="font-weight: 600;">🛡️ Analyzing prompt...</span>
                    </div>
                    <style>@keyframes spin {{ 0% {{ transform: rotate(0deg); }} 100% {{ transform: rotate(360deg); }} }}</style>
                `;
                document.body.appendChild(overlay);
            }}

            function hideLoadingOverlay() {{
                const el = document.getElementById('onefend-loading-overlay');
                if (el) el.remove();
            }}

            // Unified Decision Modal (Matches Browser Extension Logic)
            function showDecisionModal(props) {{
                const existing = document.getElementById('onefend-decision-modal');
                if (existing) existing.remove();

                const overlay = document.createElement('div');
                overlay.id = 'onefend-decision-modal';
                overlay.style.cssText = `
                    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                    background: rgba(0, 0, 0, 0.7); z-index: 2147483647;
                    display: flex; justify-content: center; align-items: center;
                    backdrop-filter: blur(5px);
                `;

                const card = document.createElement('div');

                // Color scheme based on risk level
                let accentColor = '#3b82f6'; // Default Blue
                const isHighRiskRedaction = props.type === 'REDACTION' && (props.riskLevel === 'CRITICAL' || props.riskLevel === 'HIGH');

                if (props.type === 'WARNING' || isHighRiskRedaction) accentColor = '#eab308'; // Yellow
                if (props.type === 'BLOCK' || (props.type === 'REDACTION' && props.riskLevel === 'CRITICAL')) accentColor = '#ef4444'; // Red

                // Fixed modal dimensions
                card.style.cssText = `
                    background: #111827; color: white; width: 560px; max-height: 600px;
                    border-radius: 16px; padding: 0;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    font-family: system-ui, sans-serif;
                    border-left: 4px solid ${{accentColor}};
                    display: flex; flex-direction: column;
                `;

                // Button styles
                const btnBase = `min-width: 120px; height: 40px; border-radius: 8px; cursor: pointer; font-weight: 500; font-size: 14px; transition: all 0.2s;`;
                const clearBtnStyle = `${{btnBase}} background: transparent; border: 1px solid #374151; color: #9ca3af;`;
                const secondaryBtnStyle = `${{btnBase}} background: rgba(255,255,255,0.05); border: 1px solid #374151; color: #e5e7eb;`;
                const primaryBtnStyle = `${{btnBase}} background: ${{accentColor}}; border: none; color: white; font-weight: 600; box-shadow: 0 4px 6px -1px ${{accentColor}}40;`;

                // Buttons HTML
                let buttonsHtml = '';
                if (props.type === 'REDACTION' && props.hasPII) {{
                    buttonsHtml = `
                        <button id="sai-cancel-btn" style="${{clearBtnStyle}}">Clear Text</button>
                        <button id="sai-override-btn" style="${{secondaryBtnStyle}}">Proceed Anyway</button>
                        <button id="sai-confirm-btn" style="${{primaryBtnStyle}}">Send Redacted</button>
                    `;
                }} else if (props.type === 'REDACTION' && !props.hasPII) {{
                    buttonsHtml = `
                        <button id="sai-cancel-btn" style="${{clearBtnStyle}}">Clear Text</button>
                        <button id="sai-confirm-btn" style="${{primaryBtnStyle}}">Send Redacted</button>
                    `;
                }} else if (props.type === 'WARNING' || !props.hasPII) {{
                    buttonsHtml = `
                        <button id="sai-cancel-btn" style="${{clearBtnStyle}}">Clear Text</button>
                        <button id="sai-confirm-btn" style="${{primaryBtnStyle}}">Proceed Anyway</button>
                    `;
                }} else if (props.type === 'BLOCK') {{
                    buttonsHtml = `
                        <button id="sai-cancel-btn" style="${{primaryBtnStyle}}">Clear Text</button>
                    `;
                }}

                // Icon SVG
                let iconSvg = '';
                 if (props.type === 'BLOCK') {{
                    iconSvg = '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>';
                }} else if (props.type === 'WARNING') {{
                    iconSvg = '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>';
                }} else if (props.type === 'REDACTION') {{
                     if (props.riskLevel === 'CRITICAL') {{
                        iconSvg = '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>';
                    }} else if (props.riskLevel === 'HIGH') {{
                        iconSvg = '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>';
                    }} else {{
                        iconSvg = '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>';
                    }}
                }}

                card.innerHTML = `
                    <div style="padding: 24px 20px 20px 20px;">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                            <div style="background: ${{accentColor}}20; padding: 10px; border-radius: 12px;">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${{accentColor}}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    ${{iconSvg}}
                                </svg>
                            </div>
                            <h2 style="margin: 0; font-size: 18px; font-weight: 600;">${{props.title}}</h2>
                        </div>

                         <p style="margin: 0 0 20px 0; color: #9ca3af; line-height: 1.5; font-size: 14px;">
                            ${{props.message}}
                        </p>

                        ${{props.previewText ? `
                            <div style="background: #1f2937; padding: 12px; border-radius: 8px; margin-bottom: 0; border: 1px solid #374151; max-height: 200px; overflow-y: auto; overflow-x: hidden;">
                                <div style="font-size: 11px; text-transform: uppercase; color: #6b7280; margin-bottom: 8px; font-weight: 600;">Redacted Content Preview</div>
                                <div style="font-family: monospace; font-size: 13px; color: #ef4444; white-space: pre-wrap; word-break: break-word;">${{props.previewText}}</div>
                            </div>
                        ` : ''}}
                    </div>

                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 0 20px 24px 20px;">
                        ${{buttonsHtml}}
                    </div>
                `;

                overlay.appendChild(card);
                document.body.appendChild(overlay);

                // Bind Events
                const confirmBtn = document.getElementById('sai-confirm-btn');
                if (confirmBtn) confirmBtn.onclick = () => {{ overlay.remove(); props.onConfirm && props.onConfirm(); }};

                const cancelBtn = document.getElementById('sai-cancel-btn');
                if (cancelBtn) cancelBtn.onclick = () => {{ overlay.remove(); props.onCancel && props.onCancel(); }};

                const overrideBtn = document.getElementById('sai-override-btn');
                if (overrideBtn) overrideBtn.onclick = () => {{ overlay.remove(); props.onOverride && props.onOverride(); }};
            }}

            // Helper: Send logs to Rust (Bypass Console)
            function logToRust(msg) {{
                if (window.onefendBridge) {{
                    // Send as a structured log message
                    console.error("🔒 [BRIDGE-LOG] " + msg);
                }} else {{
                    console.error("🔒 [BRIDGE-LOG] " + msg);
                }}
            }}

                // Badge Logic
                const badgeElement = document.getElementById('onefend-badge');
                function setBadgeStatus(status) {{
                    if (!badgeElement) return;
                    if (status === 'scanning') {{
                        badgeElement.textContent = '🛡️ Scanning...';
                        badgeElement.style.background = 'linear-gradient(135deg, #e67e22 0%, #d35400 100%)';
                    }} else if (status === 'blocked') {{
                        badgeElement.textContent = '🛡️ Blocked';
                        badgeElement.style.background = 'linear-gradient(135deg, #c0392b 0%, #e74c3c 100%)';
                    }} else {{
                        badgeElement.textContent = '🛡️ Protected by Onefend';
                        badgeElement.style.background = 'linear-gradient(135deg, #10a37f 0%, #0d8c6c 100%)';
                    }}
                }}

                logToRust("Hybrid Interceptor Loaded: Fetch + XHR + DOM");





                // Core Analysis & Decision Logic
                async function processText(text, onProceed, onCancel) {{
                    if (!text || !text.trim()) {{
                        onProceed(text);
                        return;
                    }}
                    
                    const textLen = text.length;

                    logToRust(`Processing text: ${{text.substring(0, Math.min(text.length, 50))}}...`);
                    setBadgeStatus('scanning');
                    showLoadingOverlay();

                    try {{
                        const analysis = await callRustBackend(text);
                        hideLoadingOverlay();
                        setBadgeStatus('idle');
                        logToRust("Analysis Result: " + JSON.stringify(analysis));

                        const riskLevel = analysis.riskLevel || analysis.originalRisk || 'UNKNOWN';
                        const action = analysis.action || 'ALLOW';
                        const hasPII = analysis.action === 'REDACT' || (analysis.redactedText && analysis.redactedText !== text);
                        const redactedText = analysis.redactedText || text;
                        const category = analysis.category || 'High Risk';

                        // Base event object
                        const baseEvent = {{
                            riskLevel: riskLevel,
                            action: action, 
                            aiCategory: category,
                            inputLength: textLen,
                            sensitiveDataDetected: hasPII,
                            confidence: 1.0, 
                            dataTypes: [] 
                        }};

                        // 1. Safe -> Proceed
                        if ((riskLevel === 'LOW' || riskLevel === 'MEDIUM') && !hasPII) {{
                            logToRust('[Onefend] Low/Medium risk without PII. Auto-proceeding.');
                            reportEventToRust({{
                                ...baseEvent,
                                action: 'ALLOW',
                                justification: 'Auto-allowed low risk'
                            }});
                            markAsApproved(text);
                            onProceed(text);
                            return;
                        }}

                        // 2./3. Risks -> Modal
                        const modalType = hasPII ? 'REDACTION' : 'WARNING';
                        const message = hasPII 
                            ? `We detected ${{riskLevel}} risk content with PII. Review the redacted version below.` 
                            : `This content is classified as ${{category}} (${{riskLevel}}). Are you sure you want to share this?`;

                        showDecisionModal({{
                            type: modalType,
                            title: 'Security Alert',
                            message: message,
                            previewText: redactedText,
                            riskLevel: riskLevel,
                            hasPII: hasPII,
                            onConfirm: () => {{
                                logToRust("User confirmed. Proceeding with " + (hasPII ? "redacted" : "original") + " text.");
                                reportEventToRust({{
                                    ...baseEvent,
                                    action: hasPII ? 'REDACT' : 'ALLOW',
                                    userOverride: true,
                                    justification: 'User accepted warning/redaction'
                                }});
                                markAsApproved(redactedText);
                                onProceed(redactedText);
                            }},
                            onOverride: () => {{
                                logToRust("User overrode redaction. Proceeding with original text.");
                                reportEventToRust({{
                                    ...baseEvent,
                                    action: 'ALLOW',
                                    userOverride: true,
                                    justification: 'User bypassed redaction'
                                }});
                                markAsApproved(text);
                                onProceed(text);
                            }},
                            onCancel: () => {{
                                // User cancelled
                                logToRust("User cancelled.");
                                reportEventToRust({{
                                    ...baseEvent,
                                    action: 'BLOCK',
                                    justification: 'User cancelled operation'
                                }});
                                setBadgeStatus('blocked');
                                onCancel();
                            }}
                        }});

                    }} catch (e) {{
                        hideLoadingOverlay();
                        setBadgeStatus('idle');
                        logToRust("Analysis Error: " + e.message);
                        // Fail open
                        onProceed(text);
                    }}
                }}

                // --- LAYER 1: DOM INTERCEPTION (UI Freeze) ---
                // We monitor for the textarea and the send button
                
                function attachDomListeners() {{
                    const textarea = document.querySelector('#prompt-textarea');
                    const sendButton = document.querySelector('[data-testid="send-button"]');

                    if (textarea && !textarea.dataset.onefendAttached) {{
                        logToRust("DOM: Textarea found, attaching listener");
                        textarea.dataset.onefendAttached = "true";
                        
                        textarea.addEventListener('keydown', async (e) => {{
                            if (e.key === 'Enter' && !e.shiftKey) {{
                                logToRust("DOM: Enter pressed");
                                // We stop immediate propagation to prevent React from sending
                                e.preventDefault();
                                e.stopPropagation();
                                
                                const text = textarea.value;
                                await processText(text, 
                                    (finalText) => {{
                                        // Proceed: Update text and submit
                                        if (finalText !== text) {{
                                            // React hack to update value
                                            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
                                            nativeInputValueSetter.call(textarea, finalText);
                                            textarea.dispatchEvent(new Event('input', {{ bubbles: true }}));
                                        }}
                                        
                                        // Now we need to submit. 
                                        // Since we blocked the event, we can try clicking the send button if it exists/enabled
                                        setTimeout(() => {{
                                            const btn = document.querySelector('[data-testid="send-button"]');
                                            if (btn) {{
                                                logToRust("DOM: Simulating click on send button");
                                                btn.click();
                                            }} else {{
                                                logToRust("DOM: Send button not found for submit simulation");
                                            }}
                                        }}, 100);
                                    }},
                                    () => {{
                                        logToRust("DOM: Cancelled by user");
                                    }}
                                );
                            }}
                        }}, true); // Capture phase
                    }}

                    if (sendButton && !sendButton.dataset.onefendAttached) {{
                        logToRust("DOM: Send button found, attaching listener");
                        sendButton.dataset.onefendAttached = "true";
                        
                        const handleSendClick = async (e) => {{
                            logToRust("DOM: Send button clicked");
                            const ta = document.querySelector('#prompt-textarea');
                            if (!ta || !ta.value.trim()) return;

                            e.preventDefault();
                            e.stopPropagation();
                            
                            const text = ta.value;
                            await processText(text,
                                (finalText) => {{
                                    if (finalText !== text) {{
                                         const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
                                         nativeInputValueSetter.call(ta, finalText);
                                         ta.dispatchEvent(new Event('input', {{ bubbles: true }}));
                                    }}
                                    
                                    sendButton.removeEventListener('click', handleSendClick, true);
                                    sendButton.click();
                                    sendButton.addEventListener('click', handleSendClick, true);
                                    logToRust("DOM: Click processed, simulating button click.");
                                }},
                                () => {{
                                    logToRust("DOM: Click cancelled by user.");
                                }}
                            );
                        }};
                        
                        sendButton.addEventListener('click', handleSendClick, true);
                    }}
                }}

                // MutationObserver with debounce (avoids firing on every React re-render)
                let domObserverTimer = null;
                const domObserver = new MutationObserver(() => {{
                    if (domObserverTimer) return;
                    domObserverTimer = setTimeout(() => {{
                        domObserverTimer = null;
                        attachDomListeners();
                    }}, 500);
                }});
                domObserver.observe(document.body || document.documentElement, {{
                    childList: true, subtree: true
                }});
                attachDomListeners();

                // --- LAYER 2/3: NETWORK INTERCEPTION (Fallback) ---
                // If DOM missed it (e.g. pasted + click), we catch it here.
                
                function isConversationUrl(url) {{
                    return url && (url.includes('/backend-api/conversation') || url.includes('/backend-api/f/conversation'));
                }}

                // XHR Hook
                const originalOpen = XMLHttpRequest.prototype.open;
                const originalSend = XMLHttpRequest.prototype.send;
                
                XMLHttpRequest.prototype.open = function(method, url) {{
                    this._url = url;
                    return originalOpen.apply(this, arguments);
                }};
                
                XMLHttpRequest.prototype.send = function(body) {{
                    if (isConversationUrl(this._url) && body) {{
                        logToRust("XHR Intercepted: " + this._url);

                        if (this._onefendProcessing) {{
                            logToRust("XHR: Re-entry guard — letting it pass.");
                            return originalSend.apply(this, arguments);
                        }}

                        try {{
                            const parsed = JSON.parse(body);
                            let textToAnalyze = "";
                            if (parsed.messages) {{
                                const lastMsg = parsed.messages[parsed.messages.length - 1];
                                if (lastMsg && lastMsg.content && lastMsg.content.parts) {{
                                    textToAnalyze = lastMsg.content.parts.join(" ");
                                }}
                            }}

                            if (textToAnalyze) {{
                                if (wasRecentlyApproved(textToAnalyze)) {{
                                    logToRust("XHR: Text recently approved by DOM — passing through");
                                    return originalSend.apply(this, arguments);
                                }}

                                this._onefendProcessing = true;
                                const xhrInstance = this;
                                
                                processText(textToAnalyze, 
                                    (finalText) => {{
                                        xhrInstance._onefendProcessing = false;
                                        if (finalText !== textToAnalyze) {{
                                            const lastMsg = parsed.messages[parsed.messages.length - 1];
                                            if (lastMsg && lastMsg.content && lastMsg.content.parts) {{
                                                lastMsg.content.parts = [finalText];
                                                body = JSON.stringify(parsed);
                                            }}
                                        }}
                                        originalSend.call(xhrInstance, body);
                                    }},
                                    () => {{
                                        xhrInstance._onefendProcessing = false;
                                        logToRust("XHR: Request cancelled by user.");
                                    }}
                                );
                                return;
                            }}
                        }} catch (e) {{
                            logToRust("XHR Parse Error: " + e);
                        }}
                    }}
                    return originalSend.apply(this, arguments);
                }};

                // Fetch Hook (Refined)
                const originalFetch = window.fetch;
                window.fetch = async function(...args) {{
                    let resource = args[0];
                    let init = args[1];
                    let targetUrl = "";
                    
                    if (typeof resource === 'string') {{
                        targetUrl = resource;
                    }} else if (resource instanceof Request) {{
                        targetUrl = resource.url;
                    }} else if (resource instanceof URL) {{
                        targetUrl = resource.toString();
                    }}

                    if (isConversationUrl(targetUrl)) {{
                         logToRust("Fetch Intercepted: " + targetUrl);
                         
                         try {{
                            let requestBodyString = null;
                            let isRequestObject = (resource instanceof Request);

                            if (isRequestObject) {{
                                try {{
                                    requestBodyString = await resource.clone().text();
                                }} catch (e) {{
                                    logToRust("Error cloning request in fetch: " + e);
                                }}
                            }} else if (init && init.body) {{
                                requestBodyString = init.body;
                            }}

                            if (requestBodyString) {{
                                let requestBody;
                                try {{
                                    requestBody = JSON.parse(requestBodyString);
                                }} catch (e) {{
                                    // Body might not be JSON or empty
                                }}

                                let textToAnalyze = "";
                                if (requestBody && requestBody.messages) {{
                                    const lastMsg = requestBody.messages[requestBody.messages.length - 1];
                                    if (lastMsg && lastMsg.content && lastMsg.content.parts) {{
                                        textToAnalyze = lastMsg.content.parts.join(" ");
                                    }}
                                }}

                                if (textToAnalyze) {{
                                    if (wasRecentlyApproved(textToAnalyze)) {{
                                        logToRust("Fetch: Text recently approved by DOM — passing through");
                                        return originalFetch.apply(this, args);
                                    }}

                                    return new Promise((resolve, reject) => {{
                                        processText(textToAnalyze, 
                                            (finalText) => {{
                                                if (finalText !== textToAnalyze) {{
                                                    // Modify the body if text was redacted
                                                    if (requestBody && requestBody.messages) {{
                                                        const lastMsg = requestBody.messages[requestBody.messages.length - 1];
                                                        if (lastMsg && lastMsg.content && lastMsg.content.parts) {{
                                                            lastMsg.content.parts = [finalText];
                                                            
                                                            const newBodyStr = JSON.stringify(requestBody);
                                                            
                                                            if (isRequestObject) {{
                                                                // Create new Request with modified body
                                                                const newReqInit = {{
                                                                    method: resource.method,
                                                                    headers: resource.headers,
                                                                    body: newBodyStr,
                                                                    mode: resource.mode,
                                                                    credentials: resource.credentials,
                                                                    cache: resource.cache,
                                                                    redirect: resource.redirect,
                                                                    referrer: resource.referrer,
                                                                    integrity: resource.integrity,
                                                                }};
                                                                args[0] = new Request(resource.url, newReqInit);
                                                            }} else {{
                                                                args[1].body = newBodyStr;
                                                            }}
                                                        }}
                                                    }}
                                                }}
                                                resolve(originalFetch.apply(this, args));
                                            }},
                                            () => {{
                                                logToRust("Fetch: Request cancelled by user.");
                                                reject(new Error('Onefend: Request cancelled by user'));
                                            }}
                                        );
                                    }});
                                }}
                            }}
                        }} catch (e) {{
                            logToRust("Fetch Interceptor Error: " + e);
                            // Fail open
                            return originalFetch.apply(this, args);
                        }}
                    }}
                    return originalFetch.apply(this, args);
                }};

                console.error("🔒 [ONEFEND] HYBRID INTERCEPTOR ACTIVE");
                logToRust("Interceptor Ready");
            }})();
        "###,
            keywords = keywords_json,
            dlp_enabled = dlp_enabled,
            device_id = device_id
        )
    }

    /// Load the compiled bundle from disk
    pub fn load_bundle(&self) -> Result<String> {
        info!("Loading injection bundle from: {:?}", self.bundle_path);

        let bundle_code = fs::read_to_string(&self.bundle_path).context(format!(
            "Failed to read bundle from {:?}. Make sure to run 'pnpm run build:bundle' first",
            self.bundle_path
        ))?;

        info!(
            "Bundle loaded successfully. Size: {} bytes",
            bundle_code.len()
        );
        Ok(bundle_code)
    }

    /// Get a test injection script (for Phase 1 spike)
    pub fn get_test_script() -> String {
        r#"
        (function() {
            console.log("🔒 ONEFEND DESKTOP AGENT - TEST INJECTION");
            
            // Create a visible indicator
            const indicator = document.createElement('div');
            indicator.style.cssText = `
                position: fixed; top: 10px; right: 10px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white; padding: 12px 20px; border-radius: 8px;
                font-family: system-ui, -apple-system, sans-serif;
                font-size: 14px; font-weight: 600; z-index: 999999;
            `;
            indicator.textContent = '🔒 Onefend Active';
            document.body.appendChild(indicator);
            
            return "INJECTION_SUCCESS";
        })();
        "#
        .to_string()
    }

    /// Validate that the bundle exists and is valid
    pub fn validate_bundle(&self) -> Result<()> {
        if !self.bundle_path.exists() {
            anyhow::bail!(
                "Bundle not found at {:?}. Run 'pnpm run build:bundle' to create it.",
                self.bundle_path
            );
        }

        let metadata = fs::metadata(&self.bundle_path).context("Failed to read bundle metadata")?;

        if metadata.len() == 0 {
            anyhow::bail!("Bundle is empty");
        }

        info!(
            "Bundle validation successful. Size: {} bytes",
            metadata.len()
        );
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_injector_creation() {
        let injector = Injector::new();
        assert!(injector.bundle_path.to_string_lossy().contains("bundle.js"));
    }
}
