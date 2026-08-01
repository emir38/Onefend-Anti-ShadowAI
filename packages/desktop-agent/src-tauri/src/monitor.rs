use crate::api_client::{AnalyzeRequest, AnalyzeResponse, ApiClient, LogEventRequest};
use crate::cdp_client::CdpClient;
use crate::config::AgentConfig;
use crate::queue::EventQueue;
use anyhow::{Context, Result};
use std::sync::{Arc, Mutex, RwLock};
use tokio::sync::mpsc;
use tracing::{debug, error, info};

/// Manage the bidirectional bridge between JS and Rust
pub struct Monitor;

impl Monitor {
    pub async fn start_bridge_loop(
        mut rx: mpsc::Receiver<String>,
        cdp_client: Arc<tokio::sync::Mutex<CdpClient>>,
        api_client: Arc<RwLock<ApiClient>>,
        config: Arc<Mutex<AgentConfig>>,
        queue: Arc<Mutex<EventQueue>>,
    ) {
        info!("BRIDGE: Listening for messages...");

        while let Some(msg) = rx.recv().await {
            // Process message in a separate task
            let cdp_clone = cdp_client.clone();
            let api_clone = api_client.clone();
            let config_clone = config.clone();
            let queue_clone = queue.clone();

            tokio::spawn(async move {
                if let Err(e) =
                    Self::handle_message(msg, cdp_clone, api_clone, config_clone, queue_clone).await
                {
                    error!("BRIDGE: Error handling message: {}", e);
                }
            });
        }
        info!("BRIDGE: Listener stopped");
    }

    async fn handle_message(
        msg: String,
        cdp_client: Arc<tokio::sync::Mutex<CdpClient>>,
        api_client: Arc<RwLock<ApiClient>>,
        config: Arc<Mutex<AgentConfig>>,
        queue: Arc<Mutex<EventQueue>>,
    ) -> Result<()> {
        #[derive(serde::Deserialize)]
        struct RawBridgeMessage {
            #[serde(default = "default_type")]
            #[serde(rename = "type")]
            msg_type: String,
            id: String,
            payload: serde_json::Value,
        }

        fn default_type() -> String {
            "ANALYZE".to_string()
        }

        let raw: RawBridgeMessage =
            serde_json::from_str(&msg).context("Failed to parse bridge message")?;

        // Get token
        let token = {
            let cfg = config.lock().unwrap();
            cfg.device_token.clone().unwrap_or_default()
        };

        if token.is_empty() {
            return Err(anyhow::anyhow!("Device not registered"));
        }

        match raw.msg_type.as_str() {
            "ANALYZE" => {
                let request: AnalyzeRequest =
                    serde_json::from_value(raw.payload).context("Invalid Analyze payload")?;
                debug!("BRIDGE: Analyzing prompt for request ID: {}", raw.id);

                let client = api_client.read().unwrap().clone();
                let result = client.analyze_prompt(&token, request).await;

                // Construct response
                let (response, error) = match result {
                    Ok(mut resp) => {
                        // Normalize 'action' for frontend if missing
                        if resp.action.is_none() {
                            let rec = resp.recommendation.as_deref().unwrap_or("ALLOW");
                            let action = if rec.contains("BLOCK") {
                                "BLOCK"
                            } else if rec.contains("WARN") {
                                "WARN"
                            } else if rec.contains("REDACT") {
                                "REDACT"
                            } else {
                                "ALLOW"
                            };
                            resp.action = Some(action.to_string());
                        }
                        (Some(resp), None)
                    }
                    Err(e) => {
                        error!("Analysis failed: {}", e);
                        (None, Some(e.to_string()))
                    }
                };

                // Send back to JS
                #[derive(serde::Serialize)]
                struct BridgeResponse<T> {
                    #[serde(rename = "type")]
                    msg_type: String,
                    id: String,
                    response: Option<T>,
                    error: Option<String>,
                }

                let bridge_resp = BridgeResponse {
                    msg_type: "ONEFEND_RESPONSE".to_string(),
                    id: raw.id,
                    response,
                    error,
                };

                let json_resp = serde_json::to_string(&bridge_resp)?;
                let script = format!("window.postMessage({}, '*')", json_resp);

                let mut client = cdp_client.lock().await;
                if client.is_connected() {
                    client.inject_code(&script).await?;
                } else {
                    error!("Cannot send response, CDP disconnected");
                }
            }
            "LOG_EVENT" => {
                let request: LogEventRequest = match serde_json::from_value(raw.payload.clone()) {
                    Ok(req) => req,
                    Err(e) => {
                        error!(
                            "BRIDGE: Invalid LogEvent payload: {} | Payload: {}",
                            e, raw.payload
                        );
                        return Err(anyhow::anyhow!("Invalid LogEvent payload"));
                    }
                };
                debug!("BRIDGE: Logging event for ID: {}", raw.id);

                // 🔒 CRITICAL: Enqueue to persistent storage FIRST
                // This guarantees the event is saved to disk before any network attempt
                let queue_guard = queue.lock().unwrap();
                if let Err(e) = queue_guard.enqueue(request) {
                    error!(
                        "❌ CRITICAL: Failed to enqueue event to persistent storage: {}",
                        e
                    );
                    return Err(e);
                }
                drop(queue_guard);

                info!("✅ Event queued to persistent storage (ID: {})", raw.id);

                // The QueueWorker will handle the actual network transmission
                // No direct API call here - this prevents data loss if backend is down
            }
            _ => {
                error!("Unknown message type: {}", raw.msg_type);
            }
        }

        Ok(())
    }
}
