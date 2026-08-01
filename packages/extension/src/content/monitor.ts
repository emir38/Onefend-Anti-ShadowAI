/**
 * Input Monitor - Observes and analyzes user input on monitored platforms
 */

import type { PlatformConfig, SensitiveDataPattern, AiAnalysisResult } from '@/types';
import { analyzeText, type AnalysisResult } from '@/analyzers/regexEngine';
import { getStorageItem, STORAGE_KEYS } from '@/utils/storage';
import { TIMEOUTS } from '@/config/constants';
import { markTextAsApprovedByDOM } from './network-bridge';
// import { aiAnalyze } from '@/api/client'; 

let isMonitoring = false;
let currentPlatform: PlatformConfig | null = null;
let activePatterns: SensitiveDataPattern[] = [];
let currentSettings: {
    enableRegexBlocking?: boolean;
    interventionMode?: 'BLOCKING' | 'OBSERVATION';
    saveEvidence?: boolean;
    aiRateLimit?: number;
} = {
    enableRegexBlocking: true,
    interventionMode: 'BLOCKING',
    saveEvidence: false,
    aiRateLimit: 60,
};
// File Analysis State for "Scan-on-Send" (Phase 18.4 Fix)
// File Queue for Unified Scan-on-Send
let pendingAttachments: File[] = [];
// State for logic if needed (Legacy kept to avoid break, but unused in new flow)
let observers: MutationObserver[] = [];
let shadowObservers = new Map<ShadowRoot, MutationObserver>();
let cleanupInterval: number | null = null;

// --- GLOBAL UI LOCK STATE (Memory Leak Fix) ---
// We manage UI blocking globally instead of per-input to avoid adding N window listeners
let isUiBlocked = false;
let lastBlockedClickTarget: HTMLElement | null = null;
let lastMonitoredInput: HTMLElement | null = null;


// Helper to identify 'Remove Attachment' buttons (ChatGPT, Claude, Gemini, etc.)
function isRemoveButton(btn: Element): boolean {
    const label = (btn.getAttribute('aria-label') || '').toLowerCase();
    const testId = (btn.getAttribute('data-testid') || btn.getAttribute('data-test-id') || btn.getAttribute('data-id') || '').toLowerCase();

    // 1. Explicit IDs/TestIDs
    if (testId.includes('remove') || testId.includes('cancel') || testId.includes('delete')) return true;

    // 2. Aria Labels Keywords
    const removeKeywords = ['remove', 'delete', 'cancel', 'close', 'quitar', 'remover', 'eliminar', 'cerrar'];
    if (removeKeywords.some(kw => label.includes(kw))) {
        // Safety: Ensure we don't ignore Send buttons
        if (label.includes('send') || label.includes('enviar')) return false;
        return true;
    }

    // 3. Fallback for icon-only buttons (like Claude): Small & Absolute
    // Heuristic: Small (<50px), often absolute positioned, NO text content.
    if ((btn as HTMLElement).innerText?.trim() === '') {
        const rect = btn.getBoundingClientRect();
        const isSmall = rect.width > 0 && rect.width < 50 && rect.height < 50;

        // Check computed style for positioning (Claude uses absolute)
        const style = window.getComputedStyle(btn);
        const isAbsolute = style.position === 'absolute';

        if (isSmall && (isAbsolute || btn.classList.contains('absolute'))) {
            return true;
        }
    }
    return false;
}

/**
 * Document-level Enter key handler (backup for editors that block per-element listeners).
 * Fires at document level in capture phase — before any element-level listener.
 *
 * Flow:
 * - INITIAL Enter: stopPropagation + preventDefault to block the event from reaching
 *   the editor. Runs analysis, then approveAndSend dispatches a new bypass Enter.
 * - BYPASS Enter: sees data-onefend-bypass flag → returns immediately without
 *   blocking, so the event propagates to the element and the editor sends normally.
 *
 * IMPORTANT: This handler must NEVER remove the bypass flag. The per-element listener
 * is responsible for cleanup to prevent infinite loops.
 */
const handleDocumentKeydown = async (e: KeyboardEvent) => {
    if (e.key !== 'Enter' || e.shiftKey) return;
    if (isUiBlocked) return;

    const target = e.target as HTMLElement;
    if (!target) return;

    // Check if target is already monitored
    let isMonitoredTarget = target.dataset.onefendMonitored === 'true';

    // FALLBACK: If not monitored yet (e.g. React re-rendered the element between sweeps),
    // use the scoring system to determine if this is a plausible AI input
    if (!isMonitoredTarget) {
        const isInputCandidate = target.isContentEditable ||
            target instanceof HTMLTextAreaElement ||
            target.getAttribute('role') === 'textbox';

        if (!isInputCandidate) return;

        // Use the full scoring system — this correctly filters out Google search,
        // login forms, etc. while allowing AI platforms like DeepSeek, ChatGPT, etc.
        if (shouldIgnoreElement(target)) return;

        // Tag it now so future events are handled by the per-element listener
        target.dataset.onefendMonitored = 'true';
        isMonitoredTarget = true;
    }

    // BYPASS: Let approved events pass through to the editor
    if (target.getAttribute('data-onefend-bypass') === 'true') {
        return;
    }

    const text = getElementText(target);
    if ((!text || text.length < 5) && pendingAttachments.length === 0) return;

    // Skip if already handled by per-element listener
    if ((e as any).__onefend_handled) return;

    // Mark as handled so per-element listener skips
    (e as any).__onefend_handled = true;

    // Block the event from reaching the editor
    e.preventDefault();
    e.stopPropagation();

    console.log('[SecurityGateway] Intercepted Enter Key (Document-level backup). Analyzing...');
    await triggerAnalysisFlow(text || '', target, 'ENTER');
};

const handleGlobalMouse = async (e: MouseEvent) => {
    // 1. UI BLOCKING: If modal is open, prevent interactions outside it
    if (isUiBlocked) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
    }




    // 2. SUBMIT INTERCEPTION
    // Only care about clicks/interactions that might SUBMIT data (Buttons)
    // Intercept multiple event types to ensure absolute blocking
    if (['mousedown', 'click', 'pointerdown'].includes(e.type)) {
        const target = e.target as HTMLElement;
        // Find closest button-like element
        const button = target.closest('button, [role="button"], input[type="submit"]');

        if (button) {
            // IGNORE our own Modal Buttons (Critical Fix for Loop)
            if (button.id && button.id.startsWith('sai-')) {
                return;
            }

            // IGNORE upload buttons (prevent false positives on attach)
            if (isUploadButton(button as HTMLElement)) return;

            // IGNORE known "Remove Attachment" buttons (ChatGPT, Claude, etc)
            // HANDLE known "Remove Attachment" buttons (ChatGPT, Claude, etc)
            if (isRemoveButton(button)) {
                // Only process removal on CLICK to avoid multiple deletions
                if (e.type === 'click') {
                    if (pendingAttachments.length > 0) {
                        const indexToRemove = findFileIndexToRemove(button as HTMLElement, pendingAttachments);

                        if (indexToRemove !== -1) {
                            const removed = pendingAttachments.splice(indexToRemove, 1)[0];
                            console.log(`[SecurityGateway] 🗑️ Smart De-queue: Match found '${removed.name}'. Remaining: ${pendingAttachments.length}`);
                        } else {
                            // FAIL SAFE: Do NOT remove blindly. LIFO is dangerous.
                            console.log(`[SecurityGateway] ⚠️ Smart Delete Identity Match failed. Keeping all attachments to prevent data leak. Queue Size: ${pendingAttachments.length}`);
                        }
                    }
                }
                return;
            }

            // Is there an active monitored input that has content?
            let active = document.activeElement as HTMLElement;

            // ON-THE-FLY: If activeElement is a textarea/contenteditable but not monitored
            // (React re-rendered it), use scoring system to check and tag it
            if (active && active.dataset.onefendMonitored !== 'true') {
                const isInputCandidate = active.isContentEditable ||
                    active instanceof HTMLTextAreaElement ||
                    active.getAttribute('role') === 'textbox';

                if (isInputCandidate && !shouldIgnoreElement(active)) {
                    active.dataset.onefendMonitored = 'true';
                }
            }

            // FALLBACK 1: If active element is body/button (lost focus), try last tracked input
            if ((!active || !active.dataset.onefendMonitored) && lastMonitoredInput && lastMonitoredInput.isConnected) {
                active = lastMonitoredInput;
            }

            // FALLBACK 2: If lastMonitoredInput is stale (React re-rendered),
            // search for current monitored input OR any plausible input with text
            if (!active || active.dataset.onefendMonitored !== 'true') {
                // Try already-monitored elements first
                const monitored = document.querySelector('[data-onefend-monitored="true"]') as HTMLElement;
                if (monitored && monitored.isConnected) {
                    active = monitored;
                } else {
                    // Last resort: find any textarea/contenteditable with text
                    const candidates = Array.from(document.querySelectorAll('textarea, [contenteditable="true"], [role="textbox"]'));
                    for (const candidate of candidates) {
                        const el = candidate as HTMLElement;
                        const candidateText = getElementText(el);
                        if (candidateText && candidateText.length >= 5 && !shouldIgnoreElement(el)) {
                            el.dataset.onefendMonitored = 'true';
                            active = el;
                            break;
                        }
                    }
                }
            }

            // Check if active element is one of ours AND has text
            if (active && active.dataset.onefendMonitored === 'true') {
                // CHECK BYPASS FLAG (to allow re-click after approval)
                if (button.getAttribute('data-onefend-bypass') === 'true') {
                    // Cleanup and allow
                    button.removeAttribute('data-onefend-bypass');
                    return;
                }

                const text = getElementText(active);
                // Threshold: Text OR Attachments
                // Threshold: Text OR Attachments
                if ((text && text.length >= 5) || pendingAttachments.length > 0) {
                    e.preventDefault();
                    e.stopImmediatePropagation();

                    // Only trigger analysis on MOUSE DOWN (preferred) or if we missed it (first event)
                    // We use lastBlockedClickTarget to avoid double-triggering on the same button
                    if (e.type === 'mousedown' || (e.type === 'click' && (!lastBlockedClickTarget || lastBlockedClickTarget !== button))) {
                        console.log(`[SecurityGateway] Intercepted Submit (${e.type}). Analyzing...`);
                        lastBlockedClickTarget = button as HTMLElement;
                        await triggerAnalysisFlow(text || '', active, 'CLICK');
                    }
                }

            }
        }
    }
};


/**
 * Initialize input monitoring for a detected platform
 */
export async function initInputMonitoring(platformConfig: PlatformConfig): Promise<void> {
    if (isMonitoring) {
        console.log('[InputMonitor] Already monitoring, skipping...');
        return;
    }

    console.log('[InputMonitor] Initializing for platform:', platformConfig.name);
    currentPlatform = platformConfig;

    // Load Settings
    const storedConfig = await getStorageItem(STORAGE_KEYS.CONFIG);
    if (storedConfig?.config?.tenantSettings) {
        currentSettings = {
            enableRegexBlocking: storedConfig.config.tenantSettings.enableRegexBlocking as boolean ?? true,
            interventionMode: (storedConfig.config.tenantSettings.interventionMode as 'BLOCKING' | 'OBSERVATION') || 'BLOCKING',
            saveEvidence: storedConfig.config.tenantSettings.saveEvidence as boolean ?? false,
            aiRateLimit: storedConfig.config.tenantSettings.aiRateLimit as number ?? 25,
        };
        console.log('[InputMonitor] Loaded Tenant Settings:', currentSettings);
    }

    // Load patterns (fallback logic preserved but simplified reading from Config if present)
    if (storedConfig?.config?.patterns && storedConfig.config.patterns.length > 0) {
        activePatterns = storedConfig.config.patterns;
    } else {
        const storedPatterns = await getStorageItem(STORAGE_KEYS.SENSITIVE_PATTERNS);
        if (storedPatterns?.patterns && storedPatterns.patterns.length > 0) {
            activePatterns = storedPatterns.patterns;
        } else {
            console.warn('[InputMonitor] No patterns available, monitoring disabled');
            return;
        }
    }

    console.log(`[InputMonitor] Loaded ${activePatterns.length} patterns`);

    // Start monitoring
    isMonitoring = true;

    // Attach Global Blockers (One-time)
    window.addEventListener('click', handleGlobalMouse, true);
    window.addEventListener('mousedown', handleGlobalMouse, true);
    window.addEventListener('mouseup', handleGlobalMouse, true);
    window.addEventListener('pointerdown', handleGlobalMouse, true);

    // Attach Global File Interceptors (Phase 18.4)
    window.addEventListener('change', handleGlobalFileSelect, true);
    window.addEventListener('drop', handleGlobalDrop, true);

    // CRITICAL: Document-level Enter key backup for editors that use stopImmediatePropagation
    // (ProseMirror on Claude, Slate on Ernie, etc.)
    // A document-level capture listener fires BEFORE any element-level capture listener,
    // so it catches Enter even when the editor blocks our per-element listener.
    document.addEventListener('keydown', handleDocumentKeydown, true);

    observeInputs();
}

/**
 * Stop monitoring and cleanup
 */
export function stopMonitoring(): void {
    console.log('[InputMonitor] Stopping monitoring...');

    // Disconnect Main Observers
    observers.forEach(observer => observer.disconnect());
    observers = [];

    // Disconnect Shadow Root Observers
    shadowObservers.forEach(observer => observer.disconnect());
    shadowObservers.clear();

    // Remove Global Blockers
    window.removeEventListener('click', handleGlobalMouse, true);
    window.removeEventListener('mousedown', handleGlobalMouse, true);
    window.removeEventListener('mouseup', handleGlobalMouse, true);
    window.removeEventListener('pointerdown', handleGlobalMouse, true);

    window.removeEventListener('change', handleGlobalFileSelect, true);
    window.removeEventListener('drop', handleGlobalDrop, true);
    document.removeEventListener('keydown', handleDocumentKeydown, true);
    isUiBlocked = false;
    lastBlockedClickTarget = null;

    // Clear Cleanup Interval
    if (cleanupInterval) {
        clearInterval(cleanupInterval);
        cleanupInterval = null;
    }

    isMonitoring = false;
    currentPlatform = null;
}

/**
 * Observe existing and new input elements
 */
/**
 * Observe existing and new input elements, including inside Shadow DOM
 */
function observeInputs(): void {
    if (!currentPlatform) return;

    // Get selectors for this platform
    // CRITICAL FIX: Merge specific selectors with generic defaults to ensure we don't miss inputs 
    // if the specific selectors are outdated. Smart Scoring will handle the noise.
    const platformSelectors = currentPlatform.selectors?.input || [];
    const defaultSelectors = [
        'textarea',
        '[contenteditable="true"]',
        'input[type="text"]',
        '[role="textbox"]'
    ];

    // Deduplicate
    const inputSelectors = Array.from(new Set([...platformSelectors, ...defaultSelectors]));

    const selectorString = inputSelectors.join(', ');

    // 1. Initial Scan (Deep)
    const existingInputs = deepQuerySelectorAll(document.body, selectorString);
    existingInputs.forEach(input => attachInputListener(input as HTMLElement));

    console.log(`[InputMonitor] Attached to ${existingInputs.length} existing inputs (Deep Scan)`);

    // 2. Continuous Monitoring (MutationObserver with Shadow Support)
    // CRITICAL: Watch attributes too, as frameworks might mount a plain div then add contenteditable/role later
    const observerConfig = {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['contenteditable', 'role', 'class', 'placeholder', 'aria-label']
    };

    const handleMutations = (mutations: MutationRecord[]) => {
        for (const mutation of mutations) {
            // Handle Attribute Analysis (for existing nodes that changed)
            if (mutation.type === 'attributes') {
                const element = mutation.target as HTMLElement;
                if (element.nodeType === Node.ELEMENT_NODE && !element.dataset.onefendMonitored) {
                    if (element.matches(selectorString)) {
                        attachInputListener(element);
                    }
                }
                continue;
            }

            // Handle Added Nodes
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    const element = node as HTMLElement;

                    // A. Check the element itself
                    if (element.matches && element.matches(selectorString)) {
                        attachInputListener(element);
                    }

                    // B. Check descendants
                    const newInputs = element.querySelectorAll(selectorString);
                    newInputs.forEach(input => attachInputListener(input as HTMLElement));

                    // C. Check for Shadow Root
                    if (element.shadowRoot) {
                        // Scan inside immediately
                        const shadowInputs = deepQuerySelectorAll(element.shadowRoot, selectorString);
                        shadowInputs.forEach(input => attachInputListener(input as HTMLElement));

                        // Observe the Shadow Root too!

                        if (!shadowObservers.has(element.shadowRoot)) {
                            const shadowObserver = new MutationObserver(handleMutations);
                            shadowObserver.observe(element.shadowRoot, observerConfig);
                            shadowObservers.set(element.shadowRoot, shadowObserver);
                        }
                    }
                }
            });
        }
    };

    const domObserver = new MutationObserver(handleMutations);
    domObserver.observe(document.body, observerConfig);
    observers.push(domObserver);

    // 3. Fallback: Periodic "Deep Sweep" & Garbage Collection
    // Some apps re-render virtual DOM without triggering expected mutation events for attributes
    cleanupInterval = window.setInterval(() => {
        // A. Garbage Collection for Disconnected Shadow Roots
        for (const [root, observer] of shadowObservers.entries()) {
            if (!root.host.isConnected) {
                // console.log('[InputMonitor] 🧹 Cleaning up disconnected Shadow Observer');
                observer.disconnect();
                shadowObservers.delete(root);
            }
        }

        // B. Deep Sweep
        const sweepInputs = deepQuerySelectorAll(document.body, selectorString);
        let newCount = 0;
        sweepInputs.forEach(input => {
            if (!input.dataset.onefendMonitored) {
                attachInputListener(input as HTMLElement);
                newCount++;
            }
        });
        if (newCount > 0) console.log(`[InputMonitor] Sweep found ${newCount} missed inputs`);
    }, 2000); // Check every 2s

    console.log('[InputMonitor] DOM observer & Shadow DOM support active');
}

/**
 * Recursively find elements including inside Shadow DOMs
 */
function deepQuerySelectorAll(root: Element | ShadowRoot | Document, selector: string, depth: number = 0): HTMLElement[] {
    const MAX_DEPTH = 20;
    const results: HTMLElement[] = [];

    // Safety brake
    if (depth > MAX_DEPTH) {
        // console.warn('[InputMonitor] Max recursion depth reached in DOM traversal');
        return results;
    }

    // 1. Search current scope
    const nodes = root.querySelectorAll(selector);
    nodes.forEach(node => results.push(node as HTMLElement));

    // 2. Find all elements with Shadow Roots in current scope
    const allElements = root.querySelectorAll('*');
    allElements.forEach(el => {
        if (el.shadowRoot) {
            results.push(...deepQuerySelectorAll(el.shadowRoot, selector, depth + 1));
        }
    });

    return results;
}

/**
 * Helper to determine if we should completely ignore an element (Privacy)
 */
// --- SCORING SYSTEM CONSTANTS ---
const NEGATIVE_SIGNALS = [
    'login', 'search', 'price', 'qty', 'quantity', 'checkout', 'shipping',
    'username', 'zip', 'address', 'coupon', 'filter', 'tracking', 'order'
];

const POSITIVE_SIGNALS = [
    // Core AI terms
    'ai', 'chat', 'bot', 'assistant', 'model', 'generate', 'gpt', 'prompt',
    'inference', 'completion', 'completions', 'chatbot', 'llm', 'neural',
    // Major chatbots
    'claude', 'copilot', 'gemini', 'deepseek', 'perplexity', 'mistral',
    'huggingface', 'poe', 'character', 'grok', 'cohere', 'reka', 'phind',
    // China/Asia platforms
    'ernie', 'wenxin', 'tongyi', 'qianwen', 'qwen', 'doubao', 'kimi',
    'moonshot', 'chatglm', 'zhipu', 'sensetime', 'sensenova', 'baichuan',
    'minimax', 'hailuo', 'xinghuo', 'xfyun', 'lingyiwanwu',
    // Code assistants
    'cursor', 'codeium', 'tabnine', 'sourcegraph', 'cody', 'windsurf', 'replit',
    // Playgrounds & infra
    'replicate', 'groq', 'fireworks', 'cerebras', 'sambanova', 'together',
    'openwebui', 'ollama', 'lmstudio', 'librechat', 'gradio', 'playground',
    'aistudio', 'notebooklm',
    // Image/media AI
    'leonardo', 'ideogram', 'firefly', 'dreamstudio', 'runway', 'stability',
    'midjourney', 'suno', 'elevenlabs', 'diffusion', 'dalle', 'flux',
    // Enterprise AI
    'jasper', 'grammarly', 'glean', 'writer',
    // Search AI
    'kagi',
    // Misc
    'pi.ai', 'heypi', 'consensus', 'elicit',
];

const MICRO_COPY_SIGNALS = [
    'ask anything', 'type a message', 'send...', 'start typing',
    'what can i help', 'how can i help', 'write a', 'ask me',
    'enter a prompt', 'describe your', 'what would you like', 'message ai',
    'chat with', 'ask ai', 'write something', 'tell me', 'explain',
    'describe an image', 'create with ai', 'ai assistant', 'ask a question',
    'search with ai', 'talk to',
];

/**
 * Calculates the probability (0-100) that an element is a GenAI input
 */
function calculateMonitoredProbability(element: HTMLElement): number {
    let score = 0;

    // --- 1. NEGATIVE SIGNALS (Strong Ignore) ---
    // Immediate disqualification for obvious non-AI fields
    if (element instanceof HTMLInputElement) {
        const ignoredTypes = ['password', 'hidden', 'email', 'tel', 'url', 'date', 'time', 'datetime-local', 'color', 'file', 'image', 'submit', 'reset', 'button', 'checkbox', 'radio'];
        if (ignoredTypes.includes(element.type)) return 0;

        // Autocomplete hints
        if (element.autocomplete && (
            element.autocomplete.includes('cc-') ||
            element.autocomplete.includes('email') ||
            element.autocomplete.includes('tel') ||
            element.autocomplete.includes('address') ||
            element.autocomplete.includes('name') ||
            element.autocomplete === 'off' // controversial, but often used in sensitive bank forms. keeping loose for now.
        )) {
            // Check specific strict ones
            if (element.autocomplete.includes('cc-') || element.autocomplete.includes('password')) return 0;
        }
    }

    // --- EARLY CONTEXT CHECK: Hostname ---
    // If we're on a known AI platform, skip negative signal checks on element attributes
    // (e.g. DeepSeek uses name="search" for its chat textarea — "search" is a negative signal
    //  but on chat.deepseek.com it's clearly the AI input)
    const hostname = window.location.hostname.toLowerCase();
    // For hostname matching, skip signals shorter than 4 chars to avoid false positives
    // (e.g. 'ai' matching inside 'mail.google.com', 'dailymail.com', etc.)
    const isKnownAIPlatform = POSITIVE_SIGNALS.some(k => k.length >= 4 && hostname.includes(k));

    // Attribute Analysis (Name, ID, Class, Aria)
    const attributesToCheck = [
        element.getAttribute('name'),
        element.id,
        element.className,
        element.getAttribute('aria-label'),
        element.getAttribute('placeholder')
    ].filter(Boolean).map(s => s!.toLowerCase());

    // If ANY usage of strict negative keywords -> 0
    // BUT skip this check on known AI platforms (hostname match overrides attribute negativity)
    if (!isKnownAIPlatform && attributesToCheck.some(attr => NEGATIVE_SIGNALS.some(neg => attr.includes(neg)))) {
        return 0;
    }

    // --- 2. POSITIVE SIGNALS (Score Boosters) ---

    // A. Element Type Base Score
    if (element.isContentEditable) {
        score += 50;
    } else if (element instanceof HTMLTextAreaElement) {
        score += 30;
    } else if (element instanceof HTMLInputElement && element.type === 'text') {
        score += 10;
    }

    // B. Contextual Signals (Page Title, URL, Meta)
    // Skip signals shorter than 4 chars to avoid 'ai' matching inside 'Gmail', 'mail', etc.
    const longSignals = POSITIVE_SIGNALS.filter(k => k.length >= 4);
    const pageTitle = document.title.toLowerCase();
    if (longSignals.some(k => pageTitle.includes(k))) {
        score += 25;
    }

    // Hostname boost (uses same isKnownAIPlatform check from above — short signals excluded)
    if (isKnownAIPlatform) {
        score += 25;
    }

    // Check Meta Tags (Description, OG Title)
    const metaTags = document.querySelectorAll('meta[name="description"], meta[property="og:title"]');
    metaTags.forEach(meta => {
        const content = (meta.getAttribute('content') || '').toLowerCase();
        if (longSignals.some(k => content.includes(k))) {
            score += 15;
        }
    });

    // C. Attribute/Micro-Copy Analysis
    // Check match against Positive Keywords in the element's attributes
    if (attributesToCheck.some(attr => longSignals.some(pos => attr.includes(pos)))) {
        score += 20;
    }

    // Check specific placeholder intent
    const placeholder = (element.getAttribute('placeholder') || element.getAttribute('data-placeholder') || '').toLowerCase();
    if (MICRO_COPY_SIGNALS.some(copy => placeholder.includes(copy))) {
        score += 20;
    }

    // Cap score
    return Math.min(score, 100);
}

/**
 * Helper to determine if we should completely ignore an element (Privacy)
 * Uses Smart Scoring System
 */
function shouldIgnoreElement(element: HTMLElement): boolean {
    const score = calculateMonitoredProbability(element);

    // Configurable Threshold (e.g., 35)
    // Logic:
    // - Localhost/Dev environments might score lower, but real SaaS usually scores high.
    // - Generic Textarea (30) + Large (15) = 45 -> PASS
    // - Generic Textarea (30) + "Search" (Negative) -> 0 -> IGNORE
    // Score examples:
    // - Gmail compose: contenteditable (50) + no AI signals = 50 -> SKIP
    // - LinkedIn post: contenteditable (50) + no AI signals = 50 -> SKIP
    // - ChatGPT: contenteditable (50) + hostname "chat" (25) = 75 -> MONITOR
    // - DeepSeek: textarea (30) + hostname "deepseek" (25) = 55 -> MONITOR
    // - Random textarea (30) + no signals = 30 -> SKIP
    // Embedded AI features (Gemini in Gmail, Copilot in Office) are caught
    // by the network interceptor, not DOM scoring.

    const THRESHOLD = 55;

    // --- PLATFORM SPECIFIC IGNORES ---
    // Notion: We WANT to monitor the AI Chat, but IGNORE the main page content editor.
    if (window.location.hostname.includes('notion.so')) {
        // If element is inside the main page body but NOT inside a floating AI menu/dialog
        // The main editor usually has ".notion-page-content" or "div[data-content-editable-leaf]"
        // The AI menu usually is a separate floating div/dialog.
        const isMainEditor = element.closest('.notion-page-content') || element.closest('.notion-scroller');
        const isAiMenu = element.closest('.notion-ai-menu') || element.closest('[role="dialog"]') || element.closest('.notion-overlay-container');

        // If it's in the editor AND NOT in an AI menu -> Ignore
        if (isMainEditor && !isAiMenu) {
            // console.log('[SmartScoring] Ignoring Notion Main Editor');
            return true;
        }
    }

    const shouldIgnore = score < THRESHOLD;

    if (shouldIgnore && score > 0) {
        // console.log(`[InputMonitor] Ignoring low score element (${score})`, element);
    } else if (!shouldIgnore) {
        // console.log(`[InputMonitor] 🎯 Tracking candidate element! Score: ${score}`, element);
    }

    return shouldIgnore;
}

/**
 * Attach event listeners to an input element
 */
function attachInputListener(element: HTMLElement): void {
    if (element.dataset.onefendMonitored === 'true') return;

    // Privacy Logic matching existing rules
    if (shouldIgnoreElement(element)) return;

    element.dataset.onefendMonitored = 'true';
    console.log('[InputMonitor] 🎯 Security Gateway Attached to:', element.tagName);

    // TRACKING: Keep track of last input used (fix for Submit button losing focus)
    const updateActive = () => { lastMonitoredInput = element; };
    element.addEventListener('focus', updateActive, true);
    element.addEventListener('click', updateActive, true);
    element.addEventListener('input', updateActive, true);

    // KEYDOWN LISTENER (Enter Key)
    element.addEventListener('keydown', async (e: KeyboardEvent) => {
        // Intercept ENTER (without Shift)
        if (e.key === 'Enter' && !e.shiftKey) {
            // 1. Check if allowed to pass (User confirmed or clean)
            if (element.getAttribute('data-onefend-bypass') === 'true') {
                // Reset flag and allow default behavior (Send)
                element.removeAttribute('data-onefend-bypass');
                console.log('🚀 Allowed (Bypass active)');
                return;
            }

            // Skip if already handled by document-level backup listener
            if ((e as any).__onefend_handled) return;

            const text = getElementText(element);

            // Min length check or Attachments
            if ((text && text.length >= 5) || pendingAttachments.length > 0) {
                // STOP everything
                e.preventDefault();
                e.stopImmediatePropagation();
                (e as any).__onefend_handled = true;

                console.log('[SecurityGateway] Intercepted Enter Key. Analyzing...');
                await triggerAnalysisFlow(text || '', element, 'ENTER');
            }
        }
    }, true); // Capture phase to be first!

    // PASTE LISTENER (Image Interception)
    element.addEventListener('paste', async (e: ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (items) {
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.startsWith('image/')) {
                    const file = items[i].getAsFile();
                    if (file) {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        console.log('[SecurityGateway] 📎 Intercepted Copy/Paste Image (Queued)');

                        pendingAttachments.push(file);

                        return;
                    }
                }
            }
        }
    }, true);
}

/**
 * Get text content from various input types
 */
function getElementText(element: HTMLElement): string {
    if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
        return element.value;
    }

    if (element.isContentEditable) {
        return element.innerText || element.textContent || '';
    }

    return '';
}

/**
 * 1. Local Regex Analysis (Fast, Synchronous-like)
 */
// [REMOVED] runRegexAnalysis - Legacy blocking logic removed for Phase 17.2 (Pre-Redaction Strategy)


/**
 * Show visual warning to user
 */
// [REMOVED] showSensitiveDataWarning - Replaced by showDecisionModal


/**
 * Log sensitive data detection event to backend
 */
// [REMOVED] logSensitiveDataEvent - Replaced by logDecisionEvent in triggerAnalysisFlow


// [REMOVED] logAiAnalysisEvent & showAiRiskWarning - cleanup of unused legacy code


// Helper to prepare file payload
async function prepareAttachmentsPayload(files: File[]): Promise<{ images: any[], documents: any[] }> {
    const images: any[] = [];
    const documents: any[] = [];

    const readFile = (file: File): Promise<{ type: string, data: string, name: string }> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const dataUrl = reader.result as string;
                const base64Data = dataUrl.split(',')[1];
                resolve({ type: file.type, data: base64Data, name: file.name });
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    try {
        const results = await Promise.all(files.map(f => readFile(f)));
        for (const res of results) {
            let mimeType = res.type;
            const ext = res.name.split('.').pop()?.toLowerCase();

            // 🛠️ FORCE PDF MIME Type based on extension (Browser detection is unreliable)
            if (ext === 'pdf') {
                mimeType = 'application/pdf';
                console.log(`[SecurityGateway] 🔧 Forced MIME type for ${res.name}: ${mimeType}`);
            }

            if (mimeType.startsWith('image/')) {
                images.push({ mimeType: mimeType, data: res.data });
            } else {
                documents.push({ mimeType: mimeType, data: res.data, filename: res.name });
            }
        }
    } catch (err) {
        console.error('Error reading attachments:', err);
    }
    return { images, documents };
}

async function triggerAnalysisFlow(text: string, element: HTMLElement, trigger: 'ENTER' | 'CLICK') {
    // 1. Redact PII (Local Regex) - TEXT ONLY
    let textToSend = text;
    const regexResult: AnalysisResult = analyzeText(text, activePatterns);
    let localRedactionHappened = false;

    if (regexResult.hasMatches) {
        console.log(`[SecurityGateway] Local patterns detected: ${regexResult.matches.length}. Applying Pre-Redaction.`);


        let redacted = text;
        activePatterns.forEach(p => {
            try {
                const re = new RegExp(p.regex, p.caseSensitive ? 'g' : 'gi');
                redacted = redacted.replace(re, `[${p.category.toUpperCase()}]`);
            } catch (e) { }
        });
        textToSend = redacted;
        localRedactionHappened = text !== textToSend;

    }

    try {
        // 2. Send to Backend (DLP + AI Analysis)

        // Prepare Payload (Text + Attachments)
        const attachments = await prepareAttachmentsPayload(pendingAttachments);


        console.log(`[Shadow Debug] 📤 Sending Analysis Request. Text: ${textToSend.length} chars. Attachments: ${pendingAttachments.length}`);

        const response = await new Promise<any>((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('Timeout')), TIMEOUTS.AI_REQUEST);

            const payload: any = {
                text: textToSend,
                context: currentPlatform?.name,
                images: attachments.images.length > 0 ? attachments.images : undefined,
                documents: attachments.documents.length > 0 ? attachments.documents : undefined
            };

            chrome.runtime.sendMessage({
                type: 'ANALYZE_TEXT',
                payload: payload
            }, (resp) => {
                clearTimeout(timer);
                resolve(resp);
            });
        });

        if (!response || !response.success || !response.data) {
            throw new Error(response?.error || 'Analysis failed');
        }

        const result: AiAnalysisResult = response.data;
        console.log('[SecurityGateway] AI Result:', result);

        if (result.multimodal) {
            console.log(`[SecurityGateway] 📦 Multimodal Confirmation: Text=${textToSend.length > 0}, Images=${result.multimodal.imageCount}, Docs=${result.multimodal.documentCount}`);
        }

        // 🔍 DEBUG: Show DLP & AI Processing Details
        if (result.debug) {
            console.log(`%c[DEBUG] Processing Pipeline:`, 'color: #3b82f6; font-weight: bold');
            console.log(`  ✓ DLP Enabled: ${result.debug.dlpEnabled ? '🛡️ YES' : '⚡ NO (Latency Optimized)'}`);
            console.log(`  ✓ DLP Called: ${result.debug.dlpCalled ? 'YES' : 'NO'}`);
            console.log(`  ✓ DLP Redacted: ${result.debug.dlpRedacted ? 'YES' : 'NO'}`);
            console.log(`  ✓ AI Called: ${result.debug.aiCalled ? 'YES' : 'NO'}`);
            console.log(`%c[DEBUG] Timing Breakdown:`, 'color: #22c55e; font-weight: bold');
            if (result.debug.timings.dlpMs !== undefined) {
                console.log(`  ⏱️  DLP API: ${result.debug.timings.dlpMs}ms`);
            }
            if (result.debug.timings.dlpImageMs !== undefined) {
                console.log(`  ⏱️  Multimodal (OCR/Redaction): ${result.debug.timings.dlpImageMs}ms`);
            }
            console.log(`  ⏱️  AI Analysis: ${result.debug.timings.aiMs}ms`);
            console.log(`  ⏱️  Total: ${result.debug.timings.totalMs}ms`);
        }

        // 3. NEW DECISION MATRIX IMPLEMENTATION
        // Check PII from both local regex AND backend DLP
        const hasPIILocal = regexResult.hasMatches;
        const hasPIIBackend = result.recommendation === 'CONFIRM_REDACTION' || (result.redactedText && result.redactedText !== textToSend);
        const hasPII = hasPIILocal || hasPIIBackend;
        const riskLevel = result.originalRisk || result.riskLevel;

        // Determine which redacted text to use
        const redactedText = result.redactedText || textToSend;

        console.log('[SecurityGateway] PII Detection:', { hasPIILocal, hasPIIBackend, hasPII, riskLevel });

        // RULE 1: LOW or MEDIUM without PII → Auto-send (no modal)
        if ((riskLevel === 'LOW' || riskLevel === 'MEDIUM') && !hasPII) {
            console.log('[SecurityGateway] Low/Medium risk without PII. Auto-sending.');
            approveAndSend(element, text, trigger);
            logDecisionEvent('ALLOWED', result, text.length, regexResult);
            return;
        }

        // RULE 2: PII detected (any risk level) → REDACTION modal
        if (hasPII) {
            showDecisionModal({
                type: 'REDACTION',
                title: 'Sensitive Data Detected',
                message: `We detected ${riskLevel} risk content with PII. Review the redacted version below.`,
                previewText: redactedText, // Show redacted text from backend or local
                originalText: text,
                riskLevel: riskLevel,
                hasPII: true,
                onConfirm: () => {
                    // Send Redacted
                    approveAndSend(element, redactedText, trigger);
                    logDecisionEvent('REDACTED_SEND', result, text.length, regexResult);
                },
                onOverride: () => {
                    // Proceed Anyway (send original)
                    approveAndSend(element, text, trigger);
                    logDecisionEvent('USER_OVERRIDE', result, text.length, regexResult);
                },
                onEdit: () => {
                    logDecisionEvent('EDIT', result, text.length, regexResult);
                    element.focus();
                },
                onCancel: () => {
                    logDecisionEvent('CLEAR_TEXT', result, text.length, regexResult);
                    clearElementValue(element);
                    pendingAttachments = [];
                    element.focus();
                }
            });
            return;
        }

        // RULE 3: HIGH or CRITICAL without PII → WARNING modal
        if (riskLevel === 'HIGH' || riskLevel === 'CRITICAL') {
            showDecisionModal({
                type: 'WARNING',
                title: 'Security Warning',
                message: `This content is classified as ${result.category} (${riskLevel} risk). Are you sure you want to share this?`,
                riskLevel: riskLevel,
                hasPII: false,
                onConfirm: () => {
                    // Proceed Anyway
                    approveAndSend(element, text, trigger);
                    logDecisionEvent('WARNED_PROCEED', result, text.length, regexResult);
                },
                onEdit: () => {
                    logDecisionEvent('EDIT', result, text.length, regexResult);
                    element.focus();
                },
                onCancel: () => {
                    logDecisionEvent('CLEAR_TEXT', result, text.length, regexResult);
                    clearElementValue(element);
                    pendingAttachments = [];
                    element.focus();
                }
            });
            return;
        }

        // RULE 4: Default fallback (shouldn't reach here, but just in case)
        approveAndSend(element, text, trigger);
        logDecisionEvent('ALLOWED', result, text.length, regexResult);

    } catch (err) {
        console.error('Analysis Error', err);
        // Fail Open or Fail Closed?
        if (localRedactionHappened && currentSettings.enableRegexBlocking) {
            // Unreachable backend but Local Regex found something -> Warning
            showDecisionModal({
                type: 'REDACTION',
                title: 'Sensitive Data Detected (Local)',
                message: 'Backend unavailable. Local protection applied.',
                previewText: textToSend,
                originalText: text,
                riskLevel: 'MEDIUM',
                onConfirm: () => approveAndSend(element, textToSend, trigger),
                onOverride: () => approveAndSend(element, text, trigger),
                onEdit: () => element.focus(),
                onCancel: () => {
                    clearElementValue(element);
                    pendingAttachments = [];
                    element.focus();
                }
            });
        } else {
            // Allow if nothing found locally (Fail Open)
            approveAndSend(element, text, trigger);
        }
    }
}


/**
 * React-compatible value setter
 */
function setNativeValue(element: HTMLElement, value: string) {
    const valueSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set;
    const prototype = Object.getPrototypeOf(element);
    const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

    if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
        prototypeValueSetter.call(element, value);
    } else if (valueSetter) {
        valueSetter.call(element, value);
    } else {
        (element as any).value = value;
    }

    element.dispatchEvent(new Event('input', { bubbles: true }));
}

function approveAndSend(element: HTMLElement, finalText: string, trigger: 'ENTER' | 'CLICK') {
    console.log('[SecurityGateway] Approving Send. Trigger:', trigger);

    // Mark text as DOM-approved so Network Interceptor skips re-analysis
    markTextAsApprovedByDOM(finalText);

    // Clear Queue
    const count = pendingAttachments.length;
    pendingAttachments = [];
    if (count > 0) console.log(`[SecurityGateway] Queue Cleared. Removed ${count} attachments.`);

    // 1. Update Content (only if changed, e.g. redaction)
    const currentText = getElementText(element);
    if (currentText !== finalText) {
        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
            setNativeValue(element, finalText);
        } else if (element.isContentEditable) {
            // For rich text editors (ProseMirror, Slate, etc.), use execCommand
            // to properly notify the editor framework instead of destroying its DOM model
            try {
                element.focus();
                // Select all content
                const selection = window.getSelection();
                const range = document.createRange();
                range.selectNodeContents(element);
                selection?.removeAllRanges();
                selection?.addRange(range);
                // Insert replacement text (editor-safe)
                document.execCommand('insertText', false, finalText);
            } catch {
                // Fallback: direct update + input event
                element.textContent = finalText;
                element.dispatchEvent(new Event('input', { bubbles: true }));
            }
        } else {
            element.textContent = finalText;
            element.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    // 2. Re-trigger Event with Explicit Bypass
    if (trigger === 'ENTER') {
        const enterEvent = new KeyboardEvent('keydown', {
            key: 'Enter', code: 'Enter', keyCode: 13, which: 13,
            bubbles: true, cancelable: true, view: window
        });

        // Critical: Use setAttribute for reliability across listeners
        element.setAttribute('data-onefend-bypass', 'true');

        // Dispatch with small delay to ensure attribute is seen and potential event loops cleared
        setTimeout(() => {
            element.dispatchEvent(enterEvent);
        }, 10);

        // Note: Attribute cleanup happens in the listener itself
    } else if (trigger === 'CLICK') {
        if (lastBlockedClickTarget) {
            lastBlockedClickTarget.setAttribute('data-onefend-bypass', 'true');
            lastBlockedClickTarget.click();
            lastBlockedClickTarget = null;
        }
    }
}

const calculateResidualRisk = (originalRisk: string, userAction: string) => {
    // 1. If user CLEARED or EDITED, the risk is effectively neutralized -> LOW
    if (userAction === 'CLEAR_TEXT' || userAction === 'EDIT') return 'LOW';

    // 2. If user sent REDACTED content (Mitigation applied)
    if (userAction === 'REDACTED_SEND') {
        if (originalRisk === 'CRITICAL') return 'HIGH'; // Serious attempt, but mitigated
        if (originalRisk === 'HIGH') return 'MEDIUM';   // High risk mitigated
        if (originalRisk === 'MEDIUM') return 'LOW';    // Hygiene fix
        return 'LOW';
    }

    // 3. If user OVERRODE (Sent Original), risk remains (or scales up if needed)
    if (userAction === 'USER_OVERRIDE') return originalRisk;

    // Default
    return originalRisk;
};

async function logDecisionEvent(action: string, result: any, length: number, regexResult?: any) {
    // Calculate Final Risk based on Mitigation
    const finalRisk = calculateResidualRisk(result.originalRisk || result.riskLevel, action);

    console.log(`[SecurityGateway] Event Log Debug: Action=${action}, Original=${result.originalRisk || result.riskLevel}, Final=${finalRisk}`);

    // Get auth data for deviceId
    const authData = await chrome.storage.local.get(['auth']);
    if (!authData.auth || !authData.auth.deviceId) {
        console.error('[SecurityGateway] Cannot log event: No deviceId found');
        return;
    }

    // Extract conversation ID
    const conversationId = extractConversationId();

    // Extract PII types from regex matches
    const piiTypes: string[] = [];
    if (regexResult?.hasMatches && regexResult.matches) {
        regexResult.matches.forEach((match: any) => {
            if (match.patternName && !piiTypes.includes(match.patternName)) {
                piiTypes.push(match.patternName);
            }
        });
    }

    // Combine PII types with AI category if both exist
    const dataTypes = piiTypes.length > 0 ? piiTypes : (result.category ? [result.category] : ['Unknown']);

    // Send event with actual user action (now supported by backend PolicyAction enum)
    chrome.runtime.sendMessage({
        type: 'LOG_CONVERSATION_EVENT',
        payload: {
            deviceId: authData.auth.deviceId,
            domain: window.location.hostname,
            platform: currentPlatform?.name || 'Unknown',
            conversationId: conversationId || 'unknown',
            action: action, // Send actual user action (REDACTED_SEND, USER_OVERRIDE, etc.)
            riskLevel: finalRisk, // Use calculated Residual Risk
            dataTypes: dataTypes,
            sensitiveDataDetected: piiTypes.length > 0 || (action !== 'ALLOWED' && action !== 'CLEAR_TEXT' && action !== 'EDIT'),
            inputLength: length,
            analysisSource: regexResult?.hasMatches ? 'regex' : 'AI_GATEWAY',
            confidence: result.confidenceScore || 0.95,
            patternMatches: (regexResult?.matches && regexResult.matches.length > 0) ? { matches: regexResult.matches } : {},
            aiCategory: result.category,
            aiRiskLevel: result.originalRisk || result.riskLevel,
            aiSummary: result.summary || 'Security analysis completed',
            userOverride: action === 'USER_OVERRIDE',
        },
    });
}

/**
 * Extract conversation ID from URL (platform-specific logic)
 */
function extractConversationId(): string | undefined {
    // ChatGPT: /c/conversation-id
    const chatgptMatch = window.location.pathname.match(/\/c\/([a-f0-9-]+)/);
    if (chatgptMatch) return chatgptMatch[1];

    // Claude: /chat/conversation-id
    const claudeMatch = window.location.pathname.match(/\/chat\/([a-f0-9-]+)/);
    if (claudeMatch) return claudeMatch[1];

    // Gemini: query param
    const urlParams = new URLSearchParams(window.location.search);
    const geminiId = urlParams.get('conversation_id');
    if (geminiId) return geminiId;

    // Generic fallback: use pathname as ID
    return window.location.pathname;
}

/**
 * UNIFIED DECISION MODAL
 */
// ...
interface DecisionModalProps {
    type: 'REDACTION' | 'WARNING' | 'BLOCK';
    title: string;
    message: string;
    previewText?: string;
    originalText?: string;
    riskLevel: string;
    hasPII?: boolean; // Flag to indicate if PII was detected
    onConfirm?: () => void;
    onOverride?: () => void;
    onEdit?: () => void;
    onCancel: () => void;
}

function escapeHtml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function showDecisionModal(props: DecisionModalProps) {
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

    // Fixed modal dimensions with max height
    card.style.cssText = `
        background: #111827; color: white; width: 560px; max-height: 600px;
        border-radius: 16px; padding: 0;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        border: 1px solid rgba(255, 255, 255, 0.1);
        font-family: system-ui, sans-serif;
        border-left: 4px solid ${accentColor};
        display: flex; flex-direction: column;
    `;

    // Standardized button styles with fixed dimensions
    const btnBase = `min-width: 120px; height: 40px; border-radius: 8px; cursor: pointer; font-weight: 500; font-size: 14px; transition: all 0.2s;`;
    const clearBtnStyle = `${btnBase} background: transparent; border: 1px solid #374151; color: #9ca3af;`;
    const secondaryBtnStyle = `${btnBase} background: rgba(255,255,255,0.05); border: 1px solid #374151; color: #e5e7eb;`;
    const primaryBtnStyle = `${btnBase} background: ${accentColor}; border: none; color: white; font-weight: 600; box-shadow: 0 4px 6px -1px ${accentColor}40;`;

    // Standardized button layout per scenario
    let buttonsHtml = '';

    if (props.type === 'REDACTION' && props.hasPII) {
        // PII detected: Show both Send Redacted and Proceed Anyway
        buttonsHtml = `
            <button id="sai-cancel-btn" style="${clearBtnStyle}">Clear Text</button>
            <button id="sai-edit-btn" style="${secondaryBtnStyle}">Edit</button>
            <button id="sai-override-btn" style="${secondaryBtnStyle}">Proceed Anyway</button>
            <button id="sai-confirm-btn" style="${primaryBtnStyle}">Send Redacted</button>
        `;
    } else if (props.type === 'REDACTION' && !props.hasPII) {
        // No PII, just redaction (e.g., AI category): Only Send Redacted
        buttonsHtml = `
            <button id="sai-cancel-btn" style="${clearBtnStyle}">Clear Text</button>
            <button id="sai-edit-btn" style="${secondaryBtnStyle}">Edit</button>
            <button id="sai-confirm-btn" style="${primaryBtnStyle}">Send Redacted</button>
        `;
    } else if (props.type === 'WARNING' || !props.hasPII) {
        // No PII or explicit WARNING: Only Proceed Anyway
        buttonsHtml = `
            <button id="sai-cancel-btn" style="${clearBtnStyle}">Clear Text</button>
            <button id="sai-edit-btn" style="${secondaryBtnStyle}">Edit</button>
            <button id="sai-confirm-btn" style="${primaryBtnStyle}">Proceed Anyway</button>
        `;
    } else if (props.type === 'BLOCK') {
        buttonsHtml = `
            <button id="sai-edit-btn" style="${secondaryBtnStyle}">Edit</button>
            <button id="sai-cancel-btn" style="${primaryBtnStyle}">Clear Text</button>
        `;
    }

    // Icon selection
    let iconSvg = '';
    if (props.type === 'BLOCK') {
        iconSvg = '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>';
    } else if (props.type === 'WARNING') {
        iconSvg = '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>';
    } else if (props.type === 'REDACTION') {
        if (props.riskLevel === 'CRITICAL') {
            iconSvg = '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>';
        } else if (props.riskLevel === 'HIGH') {
            iconSvg = '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>';
        } else {
            iconSvg = '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>';
        }
    }

    // Modal content with scrollable preview
    card.innerHTML = `
        <div style="padding: 24px 20px 20px 20px;">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                <div style="background: ${accentColor}20; padding: 10px; border-radius: 12px;">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${accentColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        ${iconSvg}
                    </svg>
                </div>
                <h2 style="margin: 0; font-size: 18px; font-weight: 600;">${props.title}</h2>
            </div>

            <p style="margin: 0 0 20px 0; color: #9ca3af; line-height: 1.5; font-size: 14px;">
                ${props.message}
            </p>

            ${props.previewText ? `
                <div style="background: #1f2937; padding: 12px; border-radius: 8px; margin-bottom: 0; border: 1px solid #374151; max-height: 200px; overflow-y: auto; overflow-x: hidden;">
                    <div style="font-size: 11px; text-transform: uppercase; color: #6b7280; margin-bottom: 8px; font-weight: 600;">Redacted Content Preview</div>
                    <div style="font-family: monospace; font-size: 13px; color: #ef4444; white-space: pre-wrap; word-break: break-word;">${escapeHtml(props.previewText)}</div>
                </div>
            ` : ''}
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; padding: 0 20px 24px 20px;">
            ${buttonsHtml}
        </div>
    `;

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    // Event Handlers
    const confirmBtn = document.getElementById('sai-confirm-btn');
    if (confirmBtn) {
        confirmBtn.onclick = (e) => {
            e.stopPropagation();
            overlay.remove();
            props.onConfirm?.();
        };
    }

    const cancelBtn = document.getElementById('sai-cancel-btn');
    if (cancelBtn) {
        cancelBtn.onclick = (e) => {
            e.stopPropagation();
            overlay.remove();
            props.onCancel();
        };
    }

    const editBtn = document.getElementById('sai-edit-btn');
    if (editBtn) {
        editBtn.onclick = (e) => {
            e.stopPropagation();
            overlay.remove();
            props.onEdit?.();
        };
    }

    const overrideBtn = document.getElementById('sai-override-btn');
    if (overrideBtn) {
        overrideBtn.onclick = (e) => {
            e.stopPropagation();
            overlay.remove();
            props.onOverride?.();
        };
    }
}

/**
 * Helper to clear element value safely
 * Uses execCommand for contenteditable to avoid breaking Slate/ProseMirror
 */
function clearElementValue(element: HTMLElement) {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        setNativeValue(element, '');
    } else if (element.isContentEditable) {
        try {
            element.focus();
            const selection = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(element);
            selection?.removeAllRanges();
            selection?.addRange(range);
            document.execCommand('delete', false);
        } catch {
            element.textContent = '';
            element.dispatchEvent(new Event('input', { bubbles: true }));
        }
    } else {
        element.textContent = '';
        element.dispatchEvent(new Event('input', { bubbles: true }));
    }
}

// --- FILE INTERCEPTION LOGIC (Phase 18.4) ---

// --- FILE INTERCEPTION LOGIC (Phase 18.4 - Optimistic Scan-on-Send) ---


async function handleGlobalFileSelect(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target.type !== 'file') return;

    const files = target.files;
    if (!files || files.length === 0) return;

    // QUEUE ONLY.
    console.log('[SecurityGateway] 📎 Intercepted File Selection (Queued):', files[0].name);

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isDuplicate = pendingAttachments.some(f => f.name === file.name && f.size === file.size && f.lastModified === file.lastModified);
        if (!isDuplicate) {
            pendingAttachments.push(file);
        } else {
            console.log('[SecurityGateway] Skipping duplicate attachment (Select):', file.name);
        }
    }

}

async function handleGlobalDrop(e: DragEvent) {
    if (!e.dataTransfer || !e.dataTransfer.files || e.dataTransfer.files.length === 0) return;

    // QUEUE ONLY.
    const files = e.dataTransfer.files;
    console.log('[SecurityGateway] 📎 Intercepted File Drop (Queued):', files[0].name);

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isDuplicate = pendingAttachments.some(f => f.name === file.name && f.size === file.size && f.lastModified === file.lastModified);
        if (!isDuplicate) {
            pendingAttachments.push(file);
        } else {
            console.log('[SecurityGateway] Skipping duplicate attachment (Drop):', file.name);
        }
    }

}


/**
 * Try to identify which file corresponds to the clicked remove button
 * by scanning the surrounding DOM for the filename.
 */
function findFileIndexToRemove(button: HTMLElement, files: File[]): number {
    if (files.length === 0) return -1;
    if (files.length === 1) return 0; // Only one file, easy decision.

    try {
        // Collect text from the button's vicinity (parent container)
        // We go up 3-4 levels to find the "chip" container that holds both name and button
        let contextText = '';
        let current: HTMLElement | null = button.parentElement;

        // Scan up to 4 levels
        for (let i = 0; i < 4; i++) {
            if (!current) break;
            contextText += ' ' + (current.innerText || '') + ' ' + (current.getAttribute('aria-label') || '') + ' ' + (current.title || '');
            current = current.parentElement;
        }

        contextText = contextText.toLowerCase();

        // Check for exact matches first
        for (let i = 0; i < files.length; i++) {
            if (contextText.includes(files[i].name.toLowerCase())) {
                return i;
            }
        }

        // Check for partial matches (first 8 chars) for truncated filenames
        for (let i = 0; i < files.length; i++) {
            const partial = files[i].name.substring(0, 8).toLowerCase();
            if (partial.length >= 4 && contextText.includes(partial)) {
                return i;
            }
        }
    } catch (e) {
        console.warn('Smart removal logic failed', e);
    }

    // FALLBACK 2: POSITIONAL MATCH (The "User Suggestion" Logic)
    // If text match failed (e.g. images), try to map the button index directly to the file queue index.
    try {
        // 1. Define scope: Look within the closest relevant container to avoid global pollution
        const container = button.closest('form') || button.closest('[role="main"]') || document.body;

        // 2. Find all potential "Remove" buttons in the container
        const allButtons = Array.from(container.querySelectorAll('button, [role="button"]'));
        // Re-use isRemoveButton to filter exactly the same type of buttons we intercept
        const removeButtons = allButtons.filter(btn => isRemoveButton(btn as HTMLElement));

        // 3. SAFETY CHECK: The number of buttons MUST match the number of queued files.
        // If they don't match, the UI state is desynced from our queue, so we shouldn't guess.
        if (removeButtons.length === files.length) {
            const myIndex = removeButtons.indexOf(button);
            if (myIndex !== -1) {
                console.log(`[SecurityGateway] 📍 Positional Match Success: Button Index ${myIndex} maps to File '${files[myIndex].name}'`);
                return myIndex;
            }
        } else {
            console.log(`[SecurityGateway] ⚠️ Positional Match Aborted: Visible Remove Buttons (${removeButtons.length}) != Queue Size (${files.length})`);
        }

    } catch (e) {
        console.warn('Positional logic failed', e);
    }

    return -1; // Not found, fallback to "Fail Safe" (Keep All)
}

function isUploadButton(element: HTMLElement): boolean {
    const label = (element.getAttribute('aria-label') || '').toLowerCase();
    const testId = (element.getAttribute('data-testid') || '').toLowerCase();
    const id = (element.id || '').toLowerCase();
    const innerText = (element.innerText || '').toLowerCase();

    const hasPopup = element.getAttribute('aria-haspopup');

    // Generic check for Menu triggers (usually Upload/Options, rarely Submit)
    if (hasPopup === 'menu' || hasPopup === 'true') {
        // Double check it's not a send button with options (rare, but possible)
        if (!label.includes('send') && !label.includes('enviar')) {
            return true;
        }
    }

    return label.includes('attach') ||
        label.includes('upload') ||
        label.includes('adjuntar') ||
        label.includes('subir') ||
        label.includes('import') ||
        label.includes('añadir') ||
        label.includes('add') ||
        (label.includes('abrir') && label.includes('menu')) || // Gemini
        (label.includes('alternar') && label.includes('men')) || // Claude (Alternar menú)

        testId.includes('attach') ||
        testId.includes('upload') ||
        testId.includes('composer-plus') || // ChatGPT

        id.includes('composer-plus') ||

        // Google Material Icons inside button
        innerText.includes('add_2') ||
        innerText.includes('attach_file');
}
