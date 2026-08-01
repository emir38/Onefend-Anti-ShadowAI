/**
 * Network Interceptor - MAIN WORLD Script
 *
 * This script runs in the page's MAIN world (not the extension's isolated world).
 * It patches window.fetch and XMLHttpRequest to intercept requests to known AI
 * platform API endpoints (ChatGPT, Claude, Gemini, etc.).
 *
 * Communication with the content script (isolated world) happens via window.postMessage().
 *
 * IMPORTANT: No chrome.* APIs are available here. No ES module imports.
 * This file MUST be completely self-contained.
 */

(function () {
  'use strict';

  // Guard: Prevent double injection
  if ((window as any).__ONEFEND_NET_INTERCEPTOR) return;
  (window as any).__ONEFEND_NET_INTERCEPTOR = true;

  // ============================================================================
  // Types (inline, since we can't import)
  // ============================================================================

  interface PlatformEndpoint {
    id: string;
    patterns: string[];
    bodyType: 'json' | 'text';
  }

  interface AnalysisResult {
    action: 'ALLOW' | 'BLOCK' | 'MODIFY';
    modifiedBody?: string;
  }

  // ============================================================================
  // Default Platform API Endpoints
  // Updated remotely via postMessage from the content script
  // ============================================================================

  let platformEndpoints: PlatformEndpoint[] = [
    // --- Major Chatbots ---
    {
      id: 'chatgpt',
      patterns: ['/backend-api/conversation', '/backend-api/f/conversation'],
      bodyType: 'json',
    },
    {
      id: 'claude',
      patterns: ['/chat_conversations/', '/api/append_message'],
      bodyType: 'json',
    },
    {
      id: 'deepseek',
      patterns: ['/api/v0/chat/completion', '/api/v0/chat/completions'],
      bodyType: 'json',
    },
    {
      id: 'gemini',
      patterns: ['generativelanguage.googleapis.com', '/batchexecute'],
      bodyType: 'text',
    },
    {
      id: 'copilot',
      patterns: ['/turing/conversation/', '/sydney/'],
      bodyType: 'json',
    },
    {
      id: 'grok',
      patterns: ['/2/grok/add_response.json'],
      bodyType: 'json',
    },
    {
      id: 'perplexity',
      patterns: ['/api/query', '/api/search'],
      bodyType: 'json',
    },
    {
      id: 'poe',
      patterns: ['/api/gql_POST'],
      bodyType: 'json',
    },
    {
      id: 'character',
      patterns: ['/chat/turn/generate/'],
      bodyType: 'json',
    },
    {
      id: 'meta-ai',
      patterns: ['/api/graphql/'],
      bodyType: 'json',
    },
    // --- China/Asia ---
    {
      id: 'ernie',
      patterns: ['/eb/chat/', '/erniebot/chat', '/wenxin/chat'],
      bodyType: 'json',
    },
    {
      id: 'tongyi',
      patterns: ['/dialog/conversation'],
      bodyType: 'json',
    },
    {
      id: 'doubao',
      patterns: ['/samantha/chat/completion', '/api/chat/msg'],
      bodyType: 'json',
    },
    {
      id: 'kimi',
      patterns: ['/api/chat/completions'],
      bodyType: 'json',
    },
    {
      id: 'chatglm',
      patterns: ['/chatglm/backend-api/assistant/stream'],
      bodyType: 'json',
    },
    // --- Generic OpenAI-compatible (catches Together, Groq, Fireworks, Cerebras,
    //     SambaNova, Open WebUI, Mistral, and many more) ---
    // IMPORTANT: Must be LAST — specific patterns above take priority
    {
      id: 'openai-compatible',
      patterns: ['/v1/chat/completions', '/v1/completions', '/v1/responses'],
      bodyType: 'json',
    },
  ];

  // ============================================================================
  // State
  // ============================================================================

  const pendingAnalyses = new Map<
    string,
    {
      resolve: (result: AnalysisResult) => void;
      timeout: ReturnType<typeof setTimeout>;
    }
  >();

  let interceptorEnabled = true;
  const ANALYSIS_TIMEOUT = 300000; // 5 minutes — must be long enough for user to respond to modals

  // ============================================================================
  // Message Handler (Responses from Content Script - Isolated World)
  // ============================================================================

  window.addEventListener('message', (event: MessageEvent) => {
    if (event.source !== window) return;
    if (!event.data || typeof event.data.type !== 'string') return;

    switch (event.data.type) {
      case 'ONEFEND_NET_RESPONSE': {
        const { requestId, action, modifiedBody } = event.data;
        const pending = pendingAnalyses.get(requestId);
        if (pending) {
          clearTimeout(pending.timeout);
          pendingAnalyses.delete(requestId);
          pending.resolve({ action: action || 'ALLOW', modifiedBody });
        }
        break;
      }

      case 'ONEFEND_NET_CONFIG': {
        if (Array.isArray(event.data.endpoints)) {
          platformEndpoints = event.data.endpoints;
        }
        if (typeof event.data.enabled === 'boolean') {
          interceptorEnabled = event.data.enabled;
        }
        break;
      }
    }
  });

  // ============================================================================
  // URL Matching
  // ============================================================================

  function matchEndpoint(url: string, method?: string): PlatformEndpoint | null {
    // Prevent unused param warning
    void method;

    if (!interceptorEnabled) return null;

    // 🛑 STRICT EXCLUSION LIST: Never intercept telemetry or analytics
    const excludeList = [
      'google-analytics.com',
      'doubleclick.net',
      'googletagmanager.com',
      '/log',
      '/v1/event',
      '/v1/bcevent',
      'play.google.com/log',
      'stats.g.doubleclick.net',
    ];

    for (const exclude of excludeList) {
      if (url.includes(exclude)) return null;
    }

    for (const endpoint of platformEndpoints) {
      for (const pattern of endpoint.patterns) {
        if (url.includes(pattern)) return endpoint;
      }
    }
    return null;
  }

  // ============================================================================
  // Text Extraction from Request Bodies
  // ============================================================================

  function extractText(bodyStr: string, endpoint: PlatformEndpoint): string {
    // Super quick sanity check: If it looks purely like telemetry encoded query params, drop it
    if (bodyStr.startsWith('f.req=') && bodyStr.indexOf('[[["') === -1) {
      return '';
    }

    if (endpoint.bodyType === 'text') {
      // Further sanity check for Gemini batchexecute to avoid analytics payloads
      if (endpoint.id === 'gemini') {
        if (bodyStr.indexOf('[[["') === -1 && bodyStr.indexOf('CreateSnippet') === -1) return '';
      }
      return bodyStr.substring(0, 10000);
    }

    try {
      const body = JSON.parse(bodyStr);
      return extractFromJSON(body, endpoint);
    } catch {
      return '';
    }
  }

  function extractFromJSON(body: any, endpoint: PlatformEndpoint): string {
    // ChatGPT: messages[last user].content.parts.join(' ')
    if (endpoint.id === 'chatgpt' && body.messages) {
      for (let i = body.messages.length - 1; i >= 0; i--) {
        const msg = body.messages[i];
        if (msg?.author?.role === 'user' || msg?.role === 'user') {
          if (msg.content?.parts && Array.isArray(msg.content.parts)) {
            return msg.content.parts.filter((p: any) => typeof p === 'string').join(' ');
          }
          if (typeof msg.content === 'string') return msg.content;
        }
      }
    }

    // Claude: prompt, content, or messages[last user].content
    if (endpoint.id === 'claude') {
      // Check prompt first but skip if empty (Claude may send empty prompt with messages)
      if (typeof body.prompt === 'string' && body.prompt.length > 0) return body.prompt;
      if (typeof body.content === 'string' && body.content.length > 0) return body.content;
      if (body.messages && Array.isArray(body.messages)) {
        const lastUser = [...body.messages].reverse().find((m: any) => m.role === 'user');
        if (lastUser) {
          if (typeof lastUser.content === 'string') return lastUser.content;
          if (Array.isArray(lastUser.content)) {
            return lastUser.content
              .filter((c: any) => c.type === 'text')
              .map((c: any) => c.text)
              .join(' ');
          }
        }
      }
    }

    // Copilot
    if (endpoint.id === 'copilot') {
      if (body.message) return body.message;
      if (body.messages?.length) {
        const last = body.messages[body.messages.length - 1];
        if (last?.text) return last.text;
        if (typeof last?.content === 'string') return last.content;
      }
    }

    // Grok (xAI)
    if (endpoint.id === 'grok') {
      if (body.responses && Array.isArray(body.responses)) {
        const last = body.responses[body.responses.length - 1];
        if (last?.message) return last.message;
      }
    }

    // Meta AI (GraphQL)
    if (endpoint.id === 'meta-ai') {
      // GraphQL: look for message_text in variables
      if (body.variables?.message_text) return body.variables.message_text;
      if (body.variables?.input?.message?.text) return body.variables.input.message.text;
    }

    // Poe (GraphQL)
    if (endpoint.id === 'poe') {
      if (body.variables?.query) return body.variables.query;
      if (body.variables?.message) return body.variables.message;
    }

    // OpenAI-compatible format (covers DeepSeek, Kimi, Tongyi, Doubao, ChatGLM,
    // Together, Groq, Fireworks, Cerebras, SambaNova, Open WebUI, Mistral, etc.)
    if (body.messages && Array.isArray(body.messages)) {
      const lastUser = [...body.messages].reverse().find((m: any) => m.role === 'user');
      if (lastUser) {
        if (typeof lastUser.content === 'string') return lastUser.content;
        if (Array.isArray(lastUser.content)) {
          return lastUser.content
            .filter((c: any) => c.type === 'text')
            .map((c: any) => c.text)
            .join(' ');
        }
      }
    }

    // Generic fallback: try common field names
    for (const field of ['text', 'message', 'prompt', 'content', 'query', 'input', 'msg']) {
      if (body[field] && typeof body[field] === 'string') return body[field];
    }

    return '';
  }

  // ============================================================================
  // Analysis Request (Main World → Content Script)
  // ============================================================================

  function requestAnalysis(
    url: string,
    bodyStr: string,
    extractedText: string,
    platformId: string,
  ): Promise<AnalysisResult> {
    return new Promise((resolve) => {
      const requestId = `net_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      const timeout = setTimeout(() => {
        if (pendingAnalyses.has(requestId)) {
          pendingAnalyses.delete(requestId);
          console.warn('[Onefend:Net] Analysis timeout — failing open');
          resolve({ action: 'ALLOW' });
        }
      }, ANALYSIS_TIMEOUT);

      pendingAnalyses.set(requestId, { resolve, timeout });

      window.postMessage(
        {
          type: 'ONEFEND_NET_INTERCEPT',
          requestId,
          url,
          body: bodyStr,
          extractedText,
          platformId,
          timestamp: Date.now(),
        },
        window.location.origin,
      );
    });
  }

  // ============================================================================
  // Fetch Interception
  // ============================================================================

  const originalFetch = window.fetch.bind(window);

  (window as any).fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
    let targetUrl = '';
    if (typeof input === 'string') targetUrl = input;
    else if (input instanceof Request) targetUrl = input.url;
    else if (input instanceof URL) targetUrl = input.toString();

    const endpoint = matchEndpoint(targetUrl, init?.method);
    if (!endpoint) return originalFetch(input, init);

    // Extract body
    let bodyStr = '';
    try {
      if (input instanceof Request) {
        bodyStr = await input.clone().text();
      } else if (init?.body) {
        if (typeof init.body === 'string') bodyStr = init.body;
      }
    } catch {
      return originalFetch(input, init);
    }

    if (!bodyStr || bodyStr.length < 5) return originalFetch(input, init);

    const text = extractText(bodyStr, endpoint);
    if (!text || text.length < 5) return originalFetch(input, init);

    console.log(`[Onefend:Net] Fetch intercepted → ${endpoint.id}`);

    const result = await requestAnalysis(targetUrl, bodyStr, text, endpoint.id);

    if (result.action === 'BLOCK') {
      console.log('[Onefend:Net] Request BLOCKED');
      return new Response(JSON.stringify({ error: 'Blocked by security policy' }), {
        status: 403,
        statusText: 'Blocked',
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (result.action === 'MODIFY' && result.modifiedBody) {
      console.log('[Onefend:Net] Request body MODIFIED (redacted)');
      if (input instanceof Request) {
        input = new Request(input.url, {
          method: input.method,
          headers: input.headers,
          body: result.modifiedBody,
          mode: input.mode,
          credentials: input.credentials,
          cache: input.cache,
          redirect: input.redirect,
          referrer: input.referrer,
          integrity: input.integrity,
        });
      } else if (init) {
        init = { ...init, body: result.modifiedBody };
      }
    }

    return originalFetch(input, init);
  };

  // ============================================================================
  // XHR Interception
  // ============================================================================

  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method: string, url: string | URL, ...rest: any[]) {
    (this as any)._onefendUrl = typeof url === 'string' ? url : url.toString();
    return originalXHROpen.apply(this, [method, url, ...rest] as any);
  };

  XMLHttpRequest.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null) {
    const url: string = (this as any)._onefendUrl || '';
    const endpoint = matchEndpoint(url, (this as any)._method);

    if (!endpoint || !body || typeof body !== 'string' || body.length < 5) {
      return originalXHRSend.apply(this, [body] as any);
    }

    const text = extractText(body, endpoint);
    if (!text || text.length < 5) {
      return originalXHRSend.apply(this, [body] as any);
    }

    console.log(`[Onefend:Net] XHR intercepted → ${endpoint.id}`);

    requestAnalysis(url, body, text, endpoint.id)
      .then((result) => {
        if (result.action === 'BLOCK') {
          console.log('[Onefend:Net] XHR BLOCKED — simulating error response');
          // Simulate a completed failed request instead of abort()
          // This makes the app (DeepSeek, etc.) think the request failed
          // and resets its UI, instead of hanging until its own timeout
          try {
            Object.defineProperty(this, 'status', { value: 403, writable: false, configurable: true });
            Object.defineProperty(this, 'statusText', { value: 'Blocked by security policy', writable: false, configurable: true });
            Object.defineProperty(this, 'response', { value: '{"error":"Blocked by security policy"}', writable: false, configurable: true });
            Object.defineProperty(this, 'responseText', { value: '{"error":"Blocked by security policy"}', writable: false, configurable: true });
            Object.defineProperty(this, 'readyState', { value: 4, writable: false, configurable: true });
            this.dispatchEvent(new Event('readystatechange'));
            this.dispatchEvent(new ProgressEvent('error'));
            this.dispatchEvent(new ProgressEvent('loadend'));
          } catch {
            // Fallback: if property override fails, use abort
            this.abort();
          }
          return;
        }
        const finalBody =
          result.action === 'MODIFY' && result.modifiedBody ? result.modifiedBody : body;
        originalXHRSend.call(this, finalBody);
      })
      .catch(() => {
        originalXHRSend.call(this, body); // Fail open
      });
  };

  // ============================================================================
  // Startup Signal
  // ============================================================================

  console.log('[Onefend:Net] 🌐 Network Interceptor Active');

  // Notify content script we're ready
  window.postMessage({ type: 'ONEFEND_NET_INTERCEPTOR_READY' }, window.location.origin);
})();
