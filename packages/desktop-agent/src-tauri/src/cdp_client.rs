use anyhow::{Context, Result};
use chromiumoxide::{Browser, BrowserConfig, Page};
use futures::StreamExt;
use std::sync::Arc;
use tracing::{debug, error, info, warn};

/// Chrome DevTools Protocol client for injecting code into ChatGPT Desktop
pub struct CdpClient {
    browser: Option<Arc<Browser>>,
    connected: bool,
    port: u16,
    bridge_initialized: bool,
    script_injected: bool,
}

#[derive(serde::Deserialize)]
struct VersionResponse {
    #[serde(rename = "webSocketDebuggerUrl")]
    web_socket_debugger_url: String,
}

impl CdpClient {
    pub fn new(port: u16) -> Self {
        Self {
            browser: None,
            connected: false,
            port,
            bridge_initialized: false,
            script_injected: false,
        }
    }

    pub fn is_script_injected(&self) -> bool {
        self.script_injected
    }

    pub fn set_script_injected(&mut self, val: bool) {
        self.script_injected = val;
    }

    /// Connect to ChatGPT Desktop via CDP (port 9222 by default)
    // SECURITY NOTE: CDP port is accessible to all local processes.
    // Consider using --remote-debugging-pipe instead of --remote-debugging-port for production.
    pub async fn connect(&mut self) -> Result<()> {
        warn!("CDP connection to port {} - this port is accessible to all local processes. Consider restricting access.", self.port);
        let http_url = format!("http://127.0.0.1:{}/json/version", self.port);
        info!("Fetching CDP WebSocket URL from {}...", http_url);

        // Fetch WebSocket URL
        let client = reqwest::Client::new();
        let resp = client.get(&http_url)
            .send()
            .await
            .context("Failed to contact ChatGPT CDP endpoint. Is it running with --remote-debugging-port=9222?")?
            .json::<VersionResponse>()
            .await
            .context("Failed to parse CDP version response")?;

        let ws_url = resp.web_socket_debugger_url;
        info!("Connecting to WebSocket: {}", ws_url);

        // Create browser config - connect to existing
        match Browser::connect(ws_url.clone()).await {
            Ok((browser, mut handler)) => {
                let browser = Arc::new(browser);
                self.browser = Some(browser.clone());
                self.connected = true;

                // Spawn the handler in a background task to process CDP events
                tokio::spawn(async move {
                    while let Some(h) = handler.next().await {
                        if h.is_err() {
                            debug!("CDP Handler error (can be ignored on shutdown): {:?}", h);
                            break;
                        }
                    }
                });

                info!("✅ Successfully connected to ChatGPT Desktop CDP session");
                Ok(())
            }
            Err(e) => {
                anyhow::bail!("Failed to connect to CDP WebSocket: {}", e);
            }
        }
    }

    // ... (rest of the file remains similar) ...

    /// Get the target page (tab) to inject code into
    /// Get the target page (tab) to inject code into
    async fn get_target_page(&mut self) -> Result<Page> {
        if self.browser.is_none() {
            self.connected = false;
            anyhow::bail!("Not connected (browser invalid)");
        }

        let browser = self.browser.as_ref().unwrap();

        // Retry loop to find a valid page
        let mut attempts = 0;
        while attempts < 10 {
            match browser.pages().await {
                Ok(pages) => {
                    info!("Found {} targets:", pages.len());
                    let mut best_page = None;

                    for (i, page) in pages.iter().enumerate() {
                        let url = page.url().await?.unwrap_or_else(|| "empty".to_string());
                        info!("Target #{}: URL='{}'", i, url);

                        // Heuristic: Prefer http/https URLs (actual content) over empty/chrome-extension
                        if url.starts_with("http") && best_page.is_none() {
                            best_page = Some(page.clone());
                        }
                    }

                    if let Some(page) = best_page.or_else(|| pages.first().cloned()) {
                        let final_url = page.url().await?.unwrap_or_default();
                        info!("Selected Target: {}", final_url);
                        return Ok(page);
                    }

                    // Connection OK, but no pages yet. Wait.
                    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
                    attempts += 1;
                }
                Err(e) => {
                    // Critical error (e.g. WebSocket disconnected)
                    error!("Lost connection to CDP: {}. Resetting...", e);
                    self.connected = false;
                    self.browser = None;
                    self.bridge_initialized = false;
                    self.script_injected = false;
                    anyhow::bail!("Lost connection to CDP")
                }
            }
        }

        anyhow::bail!("No suitable page found to inject code (timeout)")
    }

    /// Inject JavaScript code into the active page
    pub async fn inject_code(&mut self, code: &str) -> Result<String> {
        let script = format!(
            r#"
            (async () => {{
                try {{
                    const result = (function() {{
                        {} // Execute the code
                    }})();
                    
                    if (result === "ALREADY_INSTALLED") return "ALREADY_INSTALLED";
                    return "INJECTION_SUCCESS";
                }} catch (e) {{
                    console.error("Onefend Injection Error:", e);
                    return "INJECTION_ERROR: " + e.toString();
                }}
            }})()
            "#,
            code
        );

        for attempt in 0..2 {
            if !self.connected {
                if attempt > 0 {
                    info!(
                        "🔄 connection lost, attempting instant reconnect (attempt {}/2)...",
                        attempt + 1
                    );
                    if let Err(e) = self.connect().await {
                        error!("Instant reconnect failed: {}", e);
                        // Don't bail yet, maybe next loop tick? No, loop is short.
                        // Just break loop to fail.
                        break;
                    }
                } else {
                    anyhow::bail!("Not connected to browser. Call connect() first");
                }
            }

            // Attempt to get page
            match self.get_target_page().await {
                Ok(page) => {
                    info!("Injecting {} bytes...", code.len());
                    match page.evaluate(script.as_str()).await {
                        Ok(result) => {
                            let result_str = result
                                .value()
                                .and_then(|v| v.as_str())
                                .unwrap_or("undefined")
                                .to_string();
                            if result_str.starts_with("INJECTION_ERROR") {
                                error!("Injection failed inside browser: {}", result_str);
                            } else {
                                info!("✅ Code injection successful");
                            }
                            return Ok(result_str);
                        }
                        Err(e) => {
                            error!(
                                "Failed to execute script via CDP: {}. Resetting connection.",
                                e
                            );
                            self.connected = false;
                            self.browser = None;
                            self.bridge_initialized = false;
                            self.script_injected = false;
                            // Continue loop to try reconnecting
                        }
                    }
                }
                Err(e) => {
                    error!("Failed to get target page: {}. Resetting...", e);
                    self.connected = false;
                    self.browser = None;
                    self.bridge_initialized = false;
                    self.script_injected = false;
                }
            }

            if attempt < 1 {
                tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
            }
        }

        anyhow::bail!("Failed to inject code after retries")
    }

    /// Set up the bridge for JS -> Rust communication
    pub async fn setup_bridge(&mut self, tx: tokio::sync::mpsc::Sender<String>) -> Result<()> {
        if !self.connected {
            anyhow::bail!("Not connected to browser");
        }

        // Guard: Only set up bridge once per connection
        if self.bridge_initialized {
            return Ok(());
        }

        let page = self.get_target_page().await?;

        // 1. Enable Runtime & Console Logs (CRITICAL for Bridge events)
        debug!("Enabling Runtime domain on target page...");
        if let Err(e) = page
            .execute(chromiumoxide::cdp::js_protocol::runtime::EnableParams::default())
            .await
        {
            warn!("Failed to enable Runtime: {}", e);
        } else {
            // Subscribe to Console Logs
            match page
                .event_listener::<chromiumoxide::cdp::js_protocol::runtime::EventConsoleApiCalled>()
                .await
            {
                Ok(mut events) => {
                    tokio::spawn(async move {
                        while let Some(event) = events.next().await {
                            let args = event
                                .args
                                .iter()
                                .map(|arg| {
                                    arg.value
                                        .as_ref()
                                        .and_then(|v| v.as_str())
                                        .unwrap_or("?")
                                        .to_string()
                                })
                                .collect::<Vec<_>>()
                                .join(" ");

                            let msg = format!("[BROWSER] {}", args);
                            match event.r#type {
                                 chromiumoxide::cdp::js_protocol::runtime::ConsoleApiCalledType::Warning => warn!("{}", msg),
                                 chromiumoxide::cdp::js_protocol::runtime::ConsoleApiCalledType::Error => error!("{}", msg),
                                 _ => info!("{}", msg),
                             }
                        }
                    });
                    info!("✅ Console Log Forwarding enabled on target page");
                }
                Err(e) => warn!("Failed to subscribe to console events: {}", e),
            }
        }

        // 2. Add binding "shadowOnefendBridge"
        debug!("Adding shadowOnefendBridge binding...");

        if let Err(e) = page
            .execute(
                chromiumoxide::cdp::js_protocol::runtime::AddBindingParams::new(
                    "shadowOnefendBridge",
                ),
            )
            .await
        {
            self.connected = false;
            self.browser = None;
            anyhow::bail!("Failed to add binding: {}", e);
        }

        // Listen for events
        let mut events = match page
            .event_listener::<chromiumoxide::cdp::js_protocol::runtime::EventBindingCalled>()
            .await
        {
            Ok(e) => e,
            Err(e) => {
                self.connected = false;
                self.browser = None;
                anyhow::bail!("Failed to subscribe to binding events: {}", e);
            }
        };

        info!("✅ Bridge setup complete. Listening for messages...");

        tokio::spawn(async move {
            while let Some(event) = events.next().await {
                if event.name == "shadowOnefendBridge" {
                    debug!("Received bridge message: {}", event.payload);
                    if let Err(e) = tx.send(event.payload.clone()).await {
                        error!("Failed to forward bridge message: {}", e);
                        break;
                    }
                }
            }
        });

        self.bridge_initialized = true;
        Ok(())
    }

    /// Check if connected
    pub fn is_connected(&self) -> bool {
        self.connected
    }
}
