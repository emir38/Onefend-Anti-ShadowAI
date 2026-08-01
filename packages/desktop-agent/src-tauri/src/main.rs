// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod api_client;
mod cdp_client;
mod config;
mod injector;
mod installer;
mod monitor;
mod process_detector;
mod proxy;
mod queue;
mod tray;

use api_client::{ApiClient, DeviceInfo, HeartbeatRequest, PolicyConfig, RegisterDeviceRequest};
use cdp_client::CdpClient;
use config::AgentConfig;
use injector::Injector;
use installer::{cleanup_legacy_wrappers, EnvInstaller};
use monitor::Monitor;
use process_detector::{AiTarget, DetectedAiProcess, ProcessDetector};
use proxy::{get_ca_cert_pem, install_ca_to_system_trust, run_proxy, ProxyContext, PROXY_PORT};
use queue::{EventQueue, QueueWorker};
use std::sync::{Arc, Mutex, RwLock};
use tauri::{AppHandle, Manager, State};
use tokio::sync::mpsc;
use tracing::{debug, error, info, warn};

/// Global state for the application
#[derive(Clone)]
struct AppState {
    detector: Arc<Mutex<ProcessDetector>>,
    /// CDP client for ChatGPT Desktop (port 9222)
    cdp_client: Arc<tokio::sync::Mutex<CdpClient>>,
    /// CDP client for Claude Desktop (port 9223)
    cdp_client_claude: Arc<tokio::sync::Mutex<CdpClient>>,
    config: Arc<Mutex<AgentConfig>>,
    /// Tracks which AI targets are currently running
    chatgpt_detected: Arc<Mutex<bool>>,
    claude_desktop_detected: Arc<Mutex<bool>>,
    claude_code_detected: Arc<Mutex<bool>>,
    cursor_detected: Arc<Mutex<bool>>,
    windsurf_detected: Arc<Mutex<bool>>,
    antigravity_detected: Arc<Mutex<bool>>,
    /// True once the HTTPS proxy is running and ready
    proxy_active: Arc<Mutex<bool>>,
    api_client: Arc<RwLock<ApiClient>>,
    policy: Arc<Mutex<Option<PolicyConfig>>>,
    bridge_tx: mpsc::Sender<String>,
    last_launch_time: Arc<Mutex<Option<std::time::Instant>>>,
    queue: Arc<Mutex<EventQueue>>,
    hitl_channels: Arc<
        Mutex<
            std::collections::HashMap<String, tokio::sync::oneshot::Sender<proxy::ProxyDecision>>,
        >,
    >,
    /// Tauri AppHandle shared with the proxy for emitting HITL events
    app_handle_proxy: Arc<Mutex<Option<tauri::AppHandle>>>,
    /// Pending HITL request payload — JS polls this via check_hitl_pending()
    pending_hitl: Arc<Mutex<Option<serde_json::Value>>>,
}

#[tauri::command]
async fn get_status(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let (identifier, is_configured) = {
        let config = state.config.lock().unwrap();
        (
            config.identifier.clone(),
            config.is_configured(),
        )
    };

    let chatgpt_detected = *state.chatgpt_detected.lock().unwrap();
    let claude_desktop_detected = *state.claude_desktop_detected.lock().unwrap();
    let claude_code_detected = *state.claude_code_detected.lock().unwrap();
    let cursor_detected = *state.cursor_detected.lock().unwrap();
    let windsurf_detected = *state.windsurf_detected.lock().unwrap();
    let antigravity_detected = *state.antigravity_detected.lock().unwrap();
    let proxy_active = *state.proxy_active.lock().unwrap();
    let cdp_connected = state.cdp_client.lock().await.is_connected();
    let cdp_claude_connected = state.cdp_client_claude.lock().await.is_connected();
    let policy_loaded = state.policy.lock().unwrap().is_some();

    let any_detected = chatgpt_detected || claude_desktop_detected || claude_code_detected
        || cursor_detected || windsurf_detected || antigravity_detected;

    Ok(serde_json::json!({
        "active": any_detected,
        "identifier": identifier,
        "monitoring": any_detected,
        "targets": {
            "chatgpt_desktop": { "detected": chatgpt_detected, "cdp_connected": cdp_connected },
            "claude_desktop":  { "detected": claude_desktop_detected, "cdp_connected": cdp_claude_connected },
            "claude_code_cli": { "detected": claude_code_detected, "proxy_active": proxy_active },
            "cursor_ide":      { "detected": cursor_detected, "proxy_active": proxy_active },
            "windsurf_ide":    { "detected": windsurf_detected, "proxy_active": proxy_active },
            "antigravity_ide": { "detected": antigravity_detected, "proxy_active": proxy_active },
        },
        "configured": is_configured,
        "policy_loaded": policy_loaded,
        "last_refresh": chrono::Utc::now().to_rfc3339(),
    }))
}

#[tauri::command]
async fn get_config(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let config = state.config.lock().unwrap();
    Ok(serde_json::json!({
        "api_base_url": config.api_base_url,
        "configured": config.is_configured(),
    }))
}

#[tauri::command]
async fn register_device(
    app_handle: AppHandle,
    state: State<'_, AppState>,
    enrollment_token: String,
    identifier: String,
) -> Result<serde_json::Value, String> {
    info!("Attempting to register device (User: {})...", identifier);

    let hostname = sysinfo::System::host_name().unwrap_or("unknown".to_string());
    let os = std::env::consts::OS.to_string();
    let arch = std::env::consts::ARCH.to_string();

    let request = RegisterDeviceRequest {
        enrollment_token,
        identifier: identifier.clone(),
        device_info: DeviceInfo {
            hostname,
            os,
            arch,
            version: "0.1.0".to_string(),
            agent_type: "desktop-agent".to_string(),
        },
    };

    let client = state.api_client.read().unwrap().clone();

    let response = client
        .register_device(request)
        .await
        .map_err(|e| format!("API Error: {}", e))?;

    {
        let mut config = state.config.lock().unwrap();
        config.device_token = Some(response.token.clone());
        config.device_id = Some(response.device_id.clone());
        config.identifier = Some(identifier.clone());

        let config_path = app_handle
            .path()
            .app_data_dir()
            .map_err(|e| e.to_string())?
            .join("config.json");
        config
            .save_to_disk(&config_path)
            .map_err(|e| e.to_string())?;
        info!("Configuration saved to {:?}", config_path);
    }

    info!("✅ Device registered successfully.");

    Ok(serde_json::json!({
        "success": true
    }))
}

#[tauri::command]
async fn reset_config(app_handle: AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    info!("🗑️ Resetting configuration (Logout)...");

    // 1. Clear memory
    {
        let mut config = state.config.lock().unwrap();
        config.device_token = None;
        config.enrollment_token = None;
        config.device_id = None;
        // Keep api_base_url to avoid connection issues after reset
    }

    // 2. Delete file
    if let Ok(path) = app_handle.path().app_data_dir() {
        let config_path = path.join("config.json");
        if config_path.exists() {
            std::fs::remove_file(&config_path).map_err(|e| e.to_string())?;
            info!("Deleted config file at {:?}", config_path);
        }
    }

    Ok(())
}

/// HITL: Called by the frontend after the user makes a decision.
/// `request_id` is the unique ID for the pending request.
/// `action` is "ALLOW", "BLOCK", or "REDACT".
/// `redacted_text` is only used when action == "REDACT".
#[tauri::command]
async fn resolve_hitl(
    handle: AppHandle,
    state: State<'_, AppState>,
    request_id: String,
    action: String,
    redacted_text: Option<String>,
    reason: Option<String>,
) -> Result<(), String> {
    info!(
        "[HITL] User resolved request {}: action={}",
        request_id, action
    );

    let decision = match action.as_str() {
        "ALLOW" => proxy::ProxyDecision::Allow,
        "BLOCK" => proxy::ProxyDecision::Block {
            reason: reason.unwrap_or_else(|| "User blocked via dashboard".to_string()),
        },
        "REDACT" => proxy::ProxyDecision::Redact {
            redacted_text: redacted_text.clone().unwrap_or_default(),
        },
        other => {
            warn!("[HITL] Unknown action: {}. Defaulting to ALLOW.", other);
            proxy::ProxyDecision::Allow
        }
    };

    // Resolve ALL pending HITL requests with the same decision.
    // Claude Code sends multiple concurrent API requests; the user's
    // decision on one applies to all of them so we don't block the CLI.
    {
        let mut channels = state.hitl_channels.lock().unwrap();
        let all_ids: Vec<String> = channels.keys().cloned().collect();
        for id in all_ids {
            if let Some(tx) = channels.remove(&id) {
                let d = decision.clone();
                info!("[HITL] Auto-resolving {} with {:?}", id, d);
                let _ = tx.send(d);
            }
        }
    }

    // Log USER_OVERRIDE event when user clicks "Proceed Anyway"
    // (ALLOW via HITL means user overrode a risk warning)
    if action == "ALLOW" {
        let (device_token, device_id) = {
            let config = state.config.lock().unwrap();
            (config.device_token.clone(), config.device_id.clone())
        };
        if let (Some(token), Some(dev_id)) = (device_token, device_id) {
            let event = api_client::LogEventRequest {
                device_id: dev_id,
                platform: "claude-code-cli".to_string(),
                action: "USER_OVERRIDE".to_string(),
                risk_level: "HIGH".to_string(),
                sensitive_data_detected: true,
                data_types: vec!["AI_PROMPT".to_string()],
                input_length: 0,
                analysis_source: "proxy".to_string(),
                confidence: 1.0,
                user_override: Some(true),
                justification: None,
                evidence: None,
                ai_category: None,
                ai_risk_level: None,
                ai_summary: None,
                domain: Some("api.anthropic.com".to_string()),
                conversation_id: Some("cli-session".to_string()),
                pattern_matches: serde_json::json!({}),
            };
            let client = state.api_client.read().unwrap().clone();
            if let Err(e) = client.log_event(&token, event).await {
                warn!("[HITL] Failed to log USER_OVERRIDE event: {}", e);
            } else {
                info!("[HITL] USER_OVERRIDE event logged");
            }
        }
    }

    // Force close the popup window regardless of state (it may be a timeout hit)
    if let Some(popup) = handle.get_webview_window("hitl-popup") {
        let _ = popup.close();
        info!("[HITL] Closed popup window.");
    }

    Ok(())
}

/// POLLING: Called by the frontend every 500ms to check for a pending HITL request.
/// Returns the request payload if one exists, or null if nothing is pending.
/// Clears the pending request after returning it (one-shot delivery).
#[tauri::command]
fn check_hitl_pending(state: State<'_, AppState>) -> Option<serde_json::Value> {
    let mut pending = state.pending_hitl.lock().unwrap();
    pending.take() // Returns and clears in one atomic step
}

/// DEV/TEST: Store a fake HITL request so the polling loop picks it up.
///
/// `scenario` can be: "BLOCK", "REDACT", "WARNING"
#[tauri::command]
async fn test_hitl(
    app_handle: AppHandle,
    state: State<'_, AppState>,
    scenario: String,
) -> Result<serde_json::Value, String> {
    use std::time::{SystemTime, UNIX_EPOCH};
    let request_id = format!(
        "test-{:x}",
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos()
    );

    let payload = match scenario.to_uppercase().as_str() {
        "BLOCK" => serde_json::json!({
            "requestId":    request_id,
            "type":         "BLOCK",
            "originalText": "sk-ant-api-abc123... please summarize this document",
            "redactedText": null,
            "blockReason":  "API key detected in prompt — hard block by policy",
            "warnCategory": null,
            "warnRiskLevel": null,
            "platform":     "Claude Code CLI (test)",
        }),
        "REDACT" => serde_json::json!({
            "requestId":    request_id,
            "type":         "REDACT",
            "originalText": "My email is john.doe@acme.com and my SSN is 123-45-6789. Summarize this.",
            "redactedText": "My email is [EMAIL_ADDRESS] and my SSN is [SSN]. Summarize this.",
            "blockReason":  null,
            "warnCategory": null,
            "warnRiskLevel": null,
            "platform":     "Claude Code CLI (test)",
        }),
        "WARNING" => serde_json::json!({
            "requestId":    request_id,
            "type":         "WARNING",
            "originalText": "Here is our internal Q3 revenue breakdown: $4.2M from LATAM...",
            "redactedText": null,
            "blockReason":  null,
            "warnCategory": "Financial Data",
            "warnRiskLevel": "HIGH",
            "platform":     "Claude Code CLI (test)",
        }),
        _ => {
            return Err(format!(
                "Unknown scenario '{}'. Use: BLOCK, REDACT, WARNING",
                scenario
            ))
        }
    };

    // Register a real oneshot channel so resolve_hitl works end-to-end.
    let (tx, rx) = tokio::sync::oneshot::channel::<proxy::ProxyDecision>();
    state
        .hitl_channels
        .lock()
        .unwrap()
        .insert(request_id.clone(), tx);

    // Store payload and spawn the popup window.
    *state.pending_hitl.lock().unwrap() = Some(payload);
    proxy::spawn_hitl_popup(&app_handle);

    info!(
        "[TEST-HITL] Stored HITL request '{}' — popup spawned.",
        request_id
    );

    // Fire-and-forget: log the user's decision when it arrives.
    let id = request_id.clone();
    tokio::spawn(async move {
        match tokio::time::timeout(std::time::Duration::from_secs(120), rx).await {
            Ok(Ok(decision)) => info!("[TEST-HITL] User resolved '{}': {:?}", id, decision),
            Ok(Err(_)) => info!("[TEST-HITL] Channel dropped for '{}'", id),
            Err(_) => info!("[TEST-HITL] Timeout for '{}'", id),
        }
    });

    Ok(serde_json::json!({
        "requestId": request_id,
        "scenario":  scenario,
        "status":    "popup spawned"
    }))
}

/// Helper function to attempt CDP connection and injection for a specific Electron target.
/// Claude Code CLI is NOT handled here -- it uses the HTTPS proxy channel,
/// which is managed directly in `monitoring_loop()`.
async fn try_connect_and_inject_for(state: AppState, target: AiTarget) {
    match target {
        AiTarget::ChatGptDesktop => try_connect_and_inject(state, AiTarget::ChatGptDesktop).await,
        AiTarget::ClaudeDesktop => try_connect_and_inject(state, AiTarget::ClaudeDesktop).await,
        // All proxy-based targets (CLI + IDE AI tools) use the HTTPS proxy channel.
        // Proxy startup and env injection happen in monitoring_loop() / setup.
        AiTarget::ClaudeCodeCli
        | AiTarget::CursorIde
        | AiTarget::WindsurfIde
        | AiTarget::VsCodeWithAi
        | AiTarget::AntigravityIde => {}
    }
}

/// Attempt CDP connection and JS injection for an Electron AI target
async fn try_connect_and_inject(state: AppState, target: AiTarget) {
    // 🛑 STOP: Do not touch the app if the agent isn't enrolled yet.
    let is_configured = state.config.lock().unwrap().is_configured();
    if !is_configured {
        return;
    }

    if !target.is_electron() {
        warn!(
            "try_connect_and_inject called for non-Electron target {:?}. Skipping.",
            target
        );
        return;
    }

    // Select the right CDP client based on target
    let using_claude_client = target == AiTarget::ClaudeDesktop;
    let mut client = if using_claude_client {
        state.cdp_client_claude.lock().await
    } else {
        state.cdp_client.lock().await
    };

    // 1. Ensure Connected
    if !client.is_connected() {
        if let Err(e) = client.connect().await {
            warn!(
                "⚠️ Failed to connect to CDP: {}. Checking if relaunch is needed...",
                e
            );

            // SMART RELAUNCH LOGIC
            let needs_relaunch_check: Option<DetectedAiProcess> = {
                // Grace period: don't kill if we just launched
                let last_launch = *state.last_launch_time.lock().unwrap();
                if let Some(time) = last_launch {
                    if time.elapsed() < std::time::Duration::from_secs(60) {
                        debug!("⏳ Recently launched (<60s), skipping kill/relaunch...");
                        return;
                    }
                }

                let mut detector = state.detector.lock().unwrap();
                let processes = detector.scan_ai_processes();
                let found = processes.into_iter().find(|p| p.target == target);

                if let Some(p) = found {
                    if p.has_debug_flag() {
                        debug!(
                            "{} already running with debug flags. Skipping kill.",
                            target.display_name()
                        );
                        None
                    } else {
                        Some(p)
                    }
                } else {
                    None
                }
            };

            if let Some(process) = needs_relaunch_check {
                info!(
                    "🔄 SMART RELAUNCH: {} running without debug flags (PID {}). Restarting...",
                    process.target.display_name(),
                    process.pid
                );

                let killed = {
                    let mut detector = state.detector.lock().unwrap();
                    detector.kill_process(process.pid)
                };

                if killed {
                    let relaunched = {
                        let detector = state.detector.lock().unwrap();
                        detector.relaunch_with_debug_port(&process)
                    };

                    if relaunched {
                        *state.last_launch_time.lock().unwrap() = Some(std::time::Instant::now());

                        let app_name = process.target.display_name();
                        info!("⏳ Waiting for {} to initialize CDP...", app_name);
                        let mut retries = 0;
                        while retries < 10 {
                            std::thread::sleep(std::time::Duration::from_secs(2));
                            if let Ok(_) = client.connect().await {
                                info!("✅ Re-connected to {} after relaunch!", app_name);
                                break;
                            }
                            retries += 1;
                            info!("... waiting for CDP ({}/10)", retries);
                        }

                        if !client.is_connected() {
                            error!("❌ Failed to connect to {} after relaunch.", app_name);
                            return;
                        }
                    }
                }
            }

            return;
        }
        info!("✅ CDP Connection established");
    }

    // 2. Generate and Inject Policy Script (only once per connection)
    if !client.is_script_injected() {
        let policy_script = {
            let policy_lock = state.policy.lock().unwrap();
            let config_lock = state.config.lock().unwrap(); // Use Mutex lock
            let device_id = config_lock
                .device_id
                .clone() // Access directly
                .unwrap_or_else(|| "unknown-device".to_string());
            drop(config_lock); // Release the lock early

            if let Some(policy) = &*policy_lock {
                Injector::generate_policy_script(policy, &device_id)
            } else {
                let default = PolicyConfig::default();
                Injector::generate_policy_script(&default, &device_id)
            }
        };

        match client.inject_code(&policy_script).await {
            Ok(result) => {
                debug!("✅ Policy script injected (result: {})", result);
                client.set_script_injected(true);
            }
            Err(e) => error!("❌ Injection failed: {}", e),
        }
    }

    // 3. Setup Bridge (only once per connection)
    if let Err(e) = client.setup_bridge(state.bridge_tx.clone()).await {
        debug!("ℹ️ Bridge setup note: {}", e);
    }
}

/// Background heartbeat task (Policy Sync)
async fn heartbeat_loop(state: AppState) {
    tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;

    info!("💓 Heartbeat service started");
    let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(30));
    let mut heartbeat_count: u64 = 0;
    // Token renewal: check every 6 hours (720 heartbeats * 30s)
    const TOKEN_RENEWAL_INTERVAL: u64 = 720;
    // Renew if expiring within 7 days
    const TOKEN_RENEWAL_BUFFER_SECS: i64 = 7 * 24 * 60 * 60;

    loop {
        interval.tick().await;
        heartbeat_count += 1;

        let (device_token, configured) = {
            let config = state.config.lock().unwrap();
            (config.device_token.clone(), config.is_configured())
        };

        if !configured || device_token.is_none() {
            debug!("Heartbeat skipped: Agent not configured yet");
            continue;
        }

        let token = device_token.unwrap();

        // ── Token renewal check (every 6 hours) ─────────────────────────
        if heartbeat_count % TOKEN_RENEWAL_INTERVAL == 0 {
            if let Some(exp) = jwt_expiration(&token) {
                let now = chrono::Utc::now().timestamp();
                let remaining = exp - now;
                if remaining < TOKEN_RENEWAL_BUFFER_SECS {
                    info!(
                        "[TokenRenewal] Token expires in {}h — attempting renewal",
                        remaining / 3600
                    );
                    let client = state.api_client.read().unwrap().clone();
                    match client.renew_token(&token).await {
                        Ok(Some(new_token)) => {
                            let mut config = state.config.lock().unwrap();
                            config.device_token = Some(new_token);
                            // Save to disk
                            let path = std::env::var("HOME")
                                .map(std::path::PathBuf::from)
                                .unwrap_or_else(|_| std::env::temp_dir())
                                .join(".local/share/com.onefend.desktop-agent/config.json");
                            if let Err(e) = config.save_to_disk(&path) {
                                warn!("[TokenRenewal] Failed to save renewed token: {}", e);
                            }
                            info!("[TokenRenewal] Token renewed successfully");
                        }
                        Ok(None) => {
                            debug!("[TokenRenewal] Token still valid, no renewal needed");
                        }
                        Err(e) => {
                            warn!("[TokenRenewal] Renewal failed: {}", e);
                        }
                    }
                }
            }
        }

        // ── Heartbeat / config sync ──────────────────────────────────────
        let hostname = sysinfo::System::host_name().unwrap_or("unknown".to_string());

        let req = HeartbeatRequest {
            hostname,
            status: "active".to_string(),
            version: "0.1.0".to_string(),
        };

        let client = state.api_client.read().unwrap().clone();

        match client.send_heartbeat(&token, req).await {
            Ok(resp) => {
                let mut policy_lock = state.policy.lock().unwrap();
                let prev_policy = policy_lock.clone();
                let new_policy = Some(resp.policies);

                if prev_policy != new_policy {
                    info!(
                        "Policies downloaded and updated. Re-applying to all active targets..."
                    );
                    *policy_lock = new_policy;
                    drop(policy_lock);

                    for target in [AiTarget::ChatGptDesktop, AiTarget::ClaudeDesktop] {
                        let state_clone = state.clone();
                        let t = target.clone();
                        tokio::spawn(async move {
                            try_connect_and_inject(state_clone, t).await;
                        });
                    }
                } else {
                    debug!("Heartbeat synced (no changes).");
                }
            }
            Err(e) => {
                error!("Heartbeat failed: {}", e);
            }
        }
    }
}

/// Extract the `exp` claim from a JWT token without verifying the signature.
fn jwt_expiration(token: &str) -> Option<i64> {
    let parts: Vec<&str> = token.split('.').collect();
    if parts.len() != 3 {
        return None;
    }
    // JWT payload is base64url-encoded
    let payload = parts[1];
    // Add padding if needed
    let padded = match payload.len() % 4 {
        2 => format!("{}==", payload),
        3 => format!("{}=", payload),
        _ => payload.to_string(),
    };
    let decoded = base64_decode_urlsafe(&padded)?;
    let json: serde_json::Value = serde_json::from_slice(&decoded).ok()?;
    json.get("exp").and_then(|v| v.as_i64())
}

/// Simple base64url decode (JWT uses URL-safe base64 without padding).
fn base64_decode_urlsafe(input: &str) -> Option<Vec<u8>> {
    let standard = input.replace('-', "+").replace('_', "/");
    // Use a simple decoder
    let mut result = Vec::new();
    let chars: Vec<u8> = standard.bytes().collect();
    let decode_char = |c: u8| -> Option<u8> {
        match c {
            b'A'..=b'Z' => Some(c - b'A'),
            b'a'..=b'z' => Some(c - b'a' + 26),
            b'0'..=b'9' => Some(c - b'0' + 52),
            b'+' => Some(62),
            b'/' => Some(63),
            b'=' => None,
            _ => None,
        }
    };

    for chunk in chars.chunks(4) {
        let vals: Vec<Option<u8>> = chunk.iter().map(|&c| decode_char(c)).collect();
        if let (Some(a), Some(b)) = (vals.get(0).copied().flatten(), vals.get(1).copied().flatten()) {
            result.push((a << 2) | (b >> 4));
            if let Some(Some(c)) = vals.get(2) {
                result.push((b << 4) | (c >> 2));
                if let Some(Some(d)) = vals.get(3) {
                    result.push((c << 6) | d);
                }
            }
        }
    }
    Some(result)
}

/// Background monitoring task — scans for all AI targets every 5 seconds
async fn monitoring_loop(state: AppState) {
    let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(5));

    // Patch OS shortcuts on startup (best-effort, adds debug port flags)
    {
        let detector = state.detector.lock().unwrap();
        #[cfg(any(target_os = "windows", target_os = "linux"))]
        if let Err(e) = detector.patch_shortcuts() {
            warn!("⚠️ Failed to patch shortcuts: {}", e);
        }
    }

    loop {
        interval.tick().await;

        // Scan for ALL AI processes in one pass
        let detected_processes = {
            let mut detector = state.detector.lock().unwrap();
            detector.scan_ai_processes()
        };

        let chatgpt_now = detected_processes.iter().any(|p| p.target == AiTarget::ChatGptDesktop);
        let claude_desktop_now = detected_processes.iter().any(|p| p.target == AiTarget::ClaudeDesktop);
        let claude_code_now = detected_processes.iter().any(|p| p.target == AiTarget::ClaudeCodeCli);
        let cursor_now = detected_processes.iter().any(|p| p.target == AiTarget::CursorIde);
        let windsurf_now = detected_processes.iter().any(|p| p.target == AiTarget::WindsurfIde);
        let antigravity_now = detected_processes.iter().any(|p| p.target == AiTarget::AntigravityIde);

        // ── ChatGPT Desktop ───────────────────────────────────────────────────
        {
            let prev = { *state.chatgpt_detected.lock().unwrap() };
            *state.chatgpt_detected.lock().unwrap() = chatgpt_now;

            if chatgpt_now {
                if !prev {
                    info!("✓ ChatGPT Desktop detected — starting CDP monitoring");
                }
                let state_clone = state.clone();
                tokio::spawn(async move {
                    try_connect_and_inject(state_clone, AiTarget::ChatGptDesktop).await;
                });
            } else if prev {
                info!("ChatGPT Desktop closed — CDP monitoring paused");
            }
        }

        // ── Claude Desktop ────────────────────────────────────────────────────
        {
            let prev = { *state.claude_desktop_detected.lock().unwrap() };
            *state.claude_desktop_detected.lock().unwrap() = claude_desktop_now;

            if claude_desktop_now {
                if !prev {
                    info!("✓ Claude Desktop detected — starting CDP monitoring (port 9223)");
                }
                let state_clone = state.clone();
                tokio::spawn(async move {
                    try_connect_and_inject(state_clone, AiTarget::ClaudeDesktop).await;
                });
            } else if prev {
                info!("Claude Desktop closed — CDP monitoring paused");
            }
        }

        // ── Claude Code CLI ───────────────────────────────────────────────────
        // Claude Code is monitored via HTTPS proxy + shell env injection.
        // No binary wrapping needed -- the proxy runs unconditionally and
        // env vars are set in the user's shell profile.
        {
            let prev = { *state.claude_code_detected.lock().unwrap() };
            *state.claude_code_detected.lock().unwrap() = claude_code_now;

            if claude_code_now && !prev {
                info!("✓ Claude Code CLI active — traffic routed through HTTPS proxy");
            } else if !claude_code_now && prev {
                info!("Claude Code CLI closed — proxy remains active for next session");
            }
        }

        // ── IDE AI Targets (proxy-based, detection only) ─────────────────────
        // These IDEs route through the same HTTPS proxy as Claude Code.
        // We only track detection state for dashboard reporting.
        {
            let prev = *state.cursor_detected.lock().unwrap();
            *state.cursor_detected.lock().unwrap() = cursor_now;
            if cursor_now && !prev {
                info!("✓ Cursor IDE detected — traffic routed through HTTPS proxy");
            } else if !cursor_now && prev {
                info!("Cursor IDE closed");
            }
        }
        {
            let prev = *state.windsurf_detected.lock().unwrap();
            *state.windsurf_detected.lock().unwrap() = windsurf_now;
            if windsurf_now && !prev {
                info!("✓ Windsurf/Codeium IDE detected — traffic routed through HTTPS proxy");
            } else if !windsurf_now && prev {
                info!("Windsurf IDE closed");
            }
        }
        {
            let prev = *state.antigravity_detected.lock().unwrap();
            *state.antigravity_detected.lock().unwrap() = antigravity_now;
            if antigravity_now && !prev {
                info!("✓ Antigravity IDE detected — limited monitoring (custom protocol)");
            } else if !antigravity_now && prev {
                info!("Antigravity IDE closed");
            }
        }
    }
}

fn main() {
    // Install rustls CryptoProvider (required for HTTPS proxy TLS operations)
    rustls::crypto::ring::default_provider()
        .install_default()
        .expect("Failed to install rustls CryptoProvider");

    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .init();

    info!("🔒 Onefend Desktop Agent starting...");

    // ── Load config from disk eagerly ────────────────────────────────────────
    // This ensures the ApiClient starts with the correct URL (not localhost).
    // The config path mirrors what Tauri's app_data_dir() will return.
    let config_path = {
        #[cfg(target_os = "windows")]
        {
            std::env::var("APPDATA")
                .map(std::path::PathBuf::from)
                .unwrap_or_else(|_| std::env::temp_dir())
                .join("com.onefend.desktop-agent")
                .join("config.json")
        }
        #[cfg(not(target_os = "windows"))]
        {
            std::env::var("HOME")
                .map(std::path::PathBuf::from)
                .unwrap_or_else(|_| std::env::temp_dir())
                .join(".local")
                .join("share")
                .join("com.onefend.desktop-agent")
                .join("config.json")
        }
    };

    let initial_config =
        AgentConfig::load_from_disk(&config_path).unwrap_or_else(|_| AgentConfig::default());

    info!("🌐 API URL: {}", initial_config.api_base_url);

    let api_client = Arc::new(RwLock::new(ApiClient::new(
        initial_config.api_base_url.clone(),
    )));

    let (bridge_tx, bridge_rx) = mpsc::channel(100);

    // Initialize EventQueue in a standard location
    // We'll use the system's temp directory initially, then replace in setup
    // Actually, let's use a fixed location that works cross-platform
    let queue_path = if cfg!(target_os = "windows") {
        std::env::var("APPDATA")
            .map(|p| {
                std::path::PathBuf::from(p)
                    .join("Onefend")
                    .join("events.db")
            })
            .unwrap_or_else(|_| std::env::temp_dir().join("onefend_events.db"))
    } else {
        std::env::var("HOME")
            .map(|p| {
                std::path::PathBuf::from(p)
                    .join(".onefend")
                    .join("events.db")
            })
            .unwrap_or_else(|_| std::env::temp_dir().join("onefend_events.db"))
    };

    // Create parent directory if it doesn't exist
    if let Some(parent) = queue_path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }

    let event_queue = Arc::new(Mutex::new(
        EventQueue::new(&queue_path).expect("Failed to create event queue"),
    ));

    info!("📦 Event queue initialized at {:?}", queue_path);

    let app_state = AppState {
        detector: Arc::new(Mutex::new(ProcessDetector::new())),
        cdp_client: Arc::new(tokio::sync::Mutex::new(CdpClient::new(9222))), // ChatGPT Desktop
        cdp_client_claude: Arc::new(tokio::sync::Mutex::new(CdpClient::new(9223))), // Claude Desktop
        config: Arc::new(Mutex::new(initial_config)),
        chatgpt_detected: Arc::new(Mutex::new(false)),
        claude_desktop_detected: Arc::new(Mutex::new(false)),
        claude_code_detected: Arc::new(Mutex::new(false)),
        cursor_detected: Arc::new(Mutex::new(false)),
        windsurf_detected: Arc::new(Mutex::new(false)),
        antigravity_detected: Arc::new(Mutex::new(false)),
        proxy_active: Arc::new(Mutex::new(false)),
        api_client: api_client.clone(),
        policy: Arc::new(Mutex::new(None)),
        bridge_tx,
        last_launch_time: Arc::new(Mutex::new(None)),
        queue: event_queue.clone(),
        hitl_channels: Arc::new(Mutex::new(std::collections::HashMap::new())),
        app_handle_proxy: Arc::new(Mutex::new(None)),
        pending_hitl: Arc::new(Mutex::new(None)),
    };

    // Spawn QueueWorker immediately
    let worker = QueueWorker::new(event_queue.clone(), api_client.clone());
    let worker_config = app_state.config.clone();

    tauri::async_runtime::spawn(async move {
        worker.start(worker_config).await;
    });

    info!("🔄 Event queue worker started");

    // Spawn Monitor Loop
    let monitor_cdp = app_state.cdp_client.clone();
    let monitor_api = app_state.api_client.clone();
    let monitor_config = app_state.config.clone();
    let monitor_queue = app_state.queue.clone();

    tauri::async_runtime::spawn(async move {
        Monitor::start_bridge_loop(
            bridge_rx,
            monitor_cdp,
            monitor_api,
            monitor_config,
            monitor_queue,
        )
        .await;
    });

    let state_clone = app_state.clone();
    tauri::async_runtime::spawn(async move {
        monitoring_loop(state_clone).await;
    });

    let state_clone2 = app_state.clone();
    tauri::async_runtime::spawn(async move {
        heartbeat_loop(state_clone2).await;
    });

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_autostart::init(tauri_plugin_autostart::MacosLauncher::LaunchAgent, Some(vec!["--autostart"])))
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            info!("Second instance launched. Showing the main window...");
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.show();
                let _ = w.set_focus();
            }
        }))
        .on_window_event(|window, event| match event {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                // If it's the HITL popup, let it close normally.
                if window.label() == "hitl-popup" {
                    return;
                }
                
                info!("🛑 CloseRequested for '{}'. Hiding window...", window.label());
                let w = window.clone();
                api.prevent_close();
                tauri::async_runtime::spawn(async move {
                    tokio::time::sleep(std::time::Duration::from_millis(50)).await;
                    let _ = w.hide();
                });
            }
            _ => {}
        })
        .manage(app_state.clone())
        .invoke_handler(tauri::generate_handler![
            get_status,
            get_config,
            register_device,
            reset_config,
            resolve_hitl,
            check_hitl_pending,
            test_hitl
        ])
        .setup(move |app| {
            use tauri_plugin_autostart::ManagerExt;
            info!("✅ Tauri app initialized");

            // Initialize System Tray
            if let Err(e) = tray::create_tray(app) {
                error!("⚠️ Failed to create system tray: {}", e);
            }

            // Parse args to check if we are autostarting
            let args: Vec<String> = std::env::args().collect();
            let is_autostart = args.iter().any(|a| a == "--autostart");

            if is_autostart {
                info!("Starting silently via OS Autostart.");
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.hide();
                }
            } else {
                info!("Manual launch detected. Dashboard is visible.");
            }

            // Automatically enable start-on-boot when the app runs
            if let Err(e) = app.autolaunch().enable() {
                warn!("⚠️ Failed to enable autostart: {}", e);
            } else {
                info!("✅ Autostart enabled");
            }

            // Store the AppHandle so the proxy can emit HITL events to the frontend
            *app_state.app_handle_proxy.lock().unwrap() = Some(app.handle().clone());
            
            if let Ok(path) = app.path().app_data_dir() {
                let config_path = path.join("config.json");
                match AgentConfig::load_from_disk(&config_path) {
                    Ok(loaded_config) => {
                        // STRICT VALIDATION: Check for empty strings even if Some()
                        let has_empty_fields = loaded_config.device_token.as_ref().map(|s| s.trim().is_empty()).unwrap_or(false);
                        
                        // If it claims to be configured but has empty fields, force reset
                        if loaded_config.is_configured() && has_empty_fields { 
                             warn!("⚠️ Invalid configuration detected (empty fields). Deleting config file...");
                             if let Err(e) = std::fs::remove_file(&config_path) {
                                  error!("Failed to delete invalid config: {}", e);
                             }
                             // Load default instead
                             *app_state.config.lock().unwrap() = AgentConfig::default();
                        } else {
                            if config_path.exists() {
                                info!("📂 Configuration loaded from {:?}", config_path);
                            } else {
                                info!("ℹ️ No config file found. Using defaults.");
                            }
                            
                            {
                                let mut client = app_state.api_client.write().unwrap();
                                client.set_base_url(loaded_config.api_base_url.clone());
                            }
                            *app_state.config.lock().unwrap() = loaded_config.clone();

                            // ACTIVE VALIDATION: Spawn a background task to verify credentials immediately.
                            if loaded_config.is_configured() {
                                let client = app_state.api_client.read().unwrap().clone();
                                let token = loaded_config.device_token.clone().unwrap();
                                let state_val = app_state.clone();
                                let app_handle_val = app.app_handle().clone();

                                tauri::async_runtime::spawn(async move {
                                    info!("🕵️ Verifying credentials with server...");
                                    let hostname = sysinfo::System::host_name().unwrap_or("unknown".to_string());
                                    let req = HeartbeatRequest {
                                        hostname,
                                        status: "startup_check".to_string(),
                                        version: "0.1.0".to_string(),
                                    };

                                    if let Err(e) = client.send_heartbeat(&token, req).await {
                                        warn!("❌ Startup validation failed (Invalid Token?): {}. NUKING CONFIG.", e);
                                        
                                        // 1. Reset Memory
                                        let mut config = state_val.config.lock().unwrap();
                                        config.device_token = None;
                                        config.enrollment_token = None;
                                        
                                        // 2. Delete File
                                        if let Ok(path) = app_handle_val.path().app_data_dir() {
                                            let config_path = path.join("config.json");
                                            if let Err(err) = std::fs::remove_file(&config_path) {
                                                error!("Failed to delete invalid config: {}", err);
                                            } else {
                                                info!("🗑️ Invalid config deleted.");
                                            }
                                        }
                                    } else {
                                        info!("✅ Credentials verified. Proceeding.");
                                    }
                                });
                            }
                        }
                    },
                    Err(e) => {
                        info!("ℹ️ No configuration found at {:?} (using defaults): {}", config_path, e);
                    }
                }
            } else {
                warn!("⚠️ Could not resolve app data directory");
            }
            // Auto-enrollment for development/testing
            if let Ok(auto_token) = std::env::var("AUTO_ENROLL_TOKEN") {
                if std::env::var("AUTO_ENROLL_CONFIRM").unwrap_or_default() != "true" {
                    warn!("AUTO_ENROLL_TOKEN set but AUTO_ENROLL_CONFIRM is not 'true'. Skipping auto-enrollment.");
                } else {
                let is_configured = app_state.config.lock().unwrap().is_configured();
                if !is_configured {
                    warn!("Auto-enrolling device via AUTO_ENROLL_TOKEN environment variable");
                    let hostname = sysinfo::System::host_name().unwrap_or("unknown".to_string());
                    let os = std::env::consts::OS.to_string();
                    let arch = std::env::consts::ARCH.to_string();
                    
                    let request = RegisterDeviceRequest {
                        enrollment_token: auto_token,
                        identifier: "auto-enrolled@system.local".to_string(),
                        device_info: DeviceInfo {
                            hostname,
                            os,
                            arch,
                            version: "0.1.0".to_string(),
                            agent_type: "desktop-agent-auto".to_string(),
                        },
                    };
                    
                    let client = app_state.api_client.read().unwrap().clone();
                    let app_handle_clone = app.app_handle().clone();
                    let state_clone = app_state.clone();
                    
                    tauri::async_runtime::spawn(async move {
                        match client.register_device(request).await {
                            Ok(response) => {
                                info!("✅ Auto-registered successfully");
                                let mut config = state_clone.config.lock().unwrap();
                                config.device_token = Some(response.token);
                                
                                if let Ok(config_path) = app_handle_clone.path().app_data_dir() {
                                    let path = config_path.join("config.json");
                                    if let Err(e) = config.save_to_disk(&path) {
                                        error!("Failed to save auto-enrolled config: {}", e);
                                    }
                                }
                            },
                            Err(e) => {
                                error!("❌ Auto-enrollment failed: {}", e);
                            }
                        }
                    });
                }
                } // else (AUTO_ENROLL_CONFIRM)
            }

            info!("✅ Background services started (Monitoring + Heartbeat)");

            // ── Claude Code: env injection + proxy startup ─────────────────────
            // Instead of wrapping binaries (fragile with symlinks and updates),
            // we inject HTTPS_PROXY + NODE_EXTRA_CA_CERTS via the user's shell
            // profile. The proxy runs unconditionally at startup.
            {
                // Step 0: Clean up any old wrapper-based installations
                cleanup_legacy_wrappers();

                let ca_pem = get_ca_cert_pem().unwrap_or_default();
                if ca_pem.is_empty() {
                    warn!("[Installer] CA cert not ready yet");
                } else {
                    // Install env injection (shell profile + env snippet)
                    match EnvInstaller::install(&ca_pem) {
                        Ok(true)  => info!("[Installer] Environment injection installed"),
                        Ok(false) => info!("[Installer] Environment injection already up-to-date"),
                        Err(e)    => warn!("[Installer] Env injection failed: {}", e),
                    }
                }

                // Start the HTTPS proxy unconditionally (it only intercepts
                // api.anthropic.com; all other traffic is passed through).
                let already_active = *app_state.proxy_active.lock().unwrap();
                if !already_active {
                    let session_id = format!(
                        "cli-{}",
                        std::time::SystemTime::now()
                            .duration_since(std::time::UNIX_EPOCH)
                            .unwrap_or_default()
                            .as_millis()
                    );
                    let proxy_ctx = ProxyContext {
                        api_client:    app_state.api_client.clone(),
                        config:        app_state.config.clone(),
                        queue:         app_state.queue.clone(),
                        app_handle:    app_state.app_handle_proxy.lock().unwrap().clone(),
                        hitl_channels: app_state.hitl_channels.clone(),
                        pending_hitl:  app_state.pending_hitl.clone(),
                        policy:        app_state.policy.clone(),
                        session_id,
                    };
                    *app_state.proxy_active.lock().unwrap() = true;
                    if let Err(e) = install_ca_to_system_trust() {
                        warn!("[Proxy] CA system install failed (best-effort): {}", e);
                    }
                    tauri::async_runtime::spawn(async move {
                        if let Err(e) = run_proxy(proxy_ctx).await {
                            error!("[Proxy] Proxy server error: {}", e);
                        }
                    });
                    info!("[Proxy] HTTPS proxy started on port {}", PROXY_PORT);
                }
            }

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|_app_handle, event| match event {
            tauri::RunEvent::ExitRequested { api, .. } => {
                // Keep the app running in the background when all windows are closed
                api.prevent_exit();
            }
            _ => {}
        });
}
