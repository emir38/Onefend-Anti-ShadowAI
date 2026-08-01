use std::net::SocketAddr;
/// proxy.rs — Transparent HTTPS Proxy for Claude Code CLI interception
///
/// Architecture:
///   Claude Code ──CONNECT api.anthropic.com:443──► ProxyServer (localhost:8899)
///   ProxyServer ──TLS handshake (MitM CA cert)──► Claude Code
///   ProxyServer ──TLS connection──────────────────► api.anthropic.com (real)
///
/// Interception flow:
///   1. CONNECT received  → accept tunnel, negotiate TLS with Claude Code
///   2. HTTP/1.1 request  → read body, parse JSON messages[]
///   3. Send to Onefend backend for analysis
///   4. ALLOW  → forward original request + stream response
///   5. BLOCK  → return 403 JSON error, do NOT forward
///   6. REDACT → mutate messages[], forward modified request
use std::sync::{Arc, RwLock};

use anyhow::{Context, Result};
use once_cell::sync::OnceCell;
use rcgen::{
    BasicConstraints, CertificateParams, DistinguishedName, DnType, IsCa, KeyPair, KeyUsagePurpose,
};
use rustls::{ClientConfig, RootCertStore, ServerConfig};
use rustls_native_certs;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};
use tokio_rustls::{TlsAcceptor, TlsConnector};
use tracing::{debug, error, info, warn};

use crate::api_client::{AnalyzeRequest, AnalyzeResponse, ApiClient, LogEventRequest, PolicyConfig, TenantPattern};
use crate::config::AgentConfig;
use crate::queue::EventQueue;
use tauri::{Emitter, Manager};

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

pub const PROXY_PORT: u16 = 8899;

/// Intercept traffic to known AI API domains. Everything else is forwarded blindly.
const INTERCEPT_PORT: u16 = 443;

/// Runtime TLS failure blacklist.
/// When a MitM TLS handshake fails (cert pinning), the domain is added here.
/// Subsequent connections to blacklisted domains get passthrough instead of MitM.
/// This lets the tool recover on retry without user intervention.
static TLS_BLACKLIST: once_cell::sync::Lazy<std::sync::Mutex<std::collections::HashSet<String>>> =
    once_cell::sync::Lazy::new(|| std::sync::Mutex::new(std::collections::HashSet::new()));

/// Known AI API platforms and their wire format.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AiApiFormat {
    /// Anthropic Messages API: { messages: [{role, content}], model, ... }
    Anthropic,
    /// OpenAI Chat Completions API: { messages: [{role, content}], model, ... }
    OpenAi,
}

/// How the proxy should handle a known AI domain.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum InterceptMode {
    /// Full MitM: decrypt TLS, read body, analyze, decide (allow/block/redact).
    /// Requires the client to trust our CA cert (works with NODE_EXTRA_CA_CERTS).
    FullIntercept(AiApiFormat),
    /// Log-only passthrough: record that AI traffic was detected but don't
    /// break TLS. Used for tools with certificate pinning.
    LogOnly,
}

/// Match a CONNECT domain against known AI API endpoints.
fn classify_domain(host: &str) -> Option<InterceptMode> {
    match host {
        // Anthropic (Claude Code CLI, Claude VS Code extension)
        // Full intercept works because Claude tools respect NODE_EXTRA_CA_CERTS.
        "api.anthropic.com" => Some(InterceptMode::FullIntercept(AiApiFormat::Anthropic)),

        // OpenAI direct (Cline, Continue, generic OpenAI clients)
        // These are Node.js extensions that respect NODE_EXTRA_CA_CERTS.
        "api.openai.com" => Some(InterceptMode::FullIntercept(AiApiFormat::OpenAi)),

        // Codeium / Windsurf (JSON API endpoints)
        // Attempts full intercept; falls back to passthrough if cert pinning detected.
        "api.codeium.com" | "server.codeium.com" | "inference.codeium.com" => Some(InterceptMode::FullIntercept(AiApiFormat::OpenAi)),

        _ => None,
    }
}

/// Return a human-readable platform label for a given intercepted domain.
fn platform_label(host: &str) -> &'static str {
    match host {
        "api.anthropic.com" => "claude",
        "api.openai.com" => "openai",
        "api.codeium.com" | "server.codeium.com" | "inference.codeium.com" => "windsurf-codeium",
        _ => "unknown-ai",
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// CA Certificate (persistent — survives agent restarts)
// ─────────────────────────────────────────────────────────────────────────────

struct CaState {
    /// DER-encoded CA certificate (for export / system install)
    pub cert_der: Vec<u8>,
    /// PEM-encoded CA certificate (for display / system install tools)
    pub cert_pem: String,
    /// PEM-encoded CA private key
    pub key_pem: String,
}

static CA: OnceCell<CaState> = OnceCell::new();

/// Directory where the CA cert+key are persisted.
fn ca_storage_dir() -> std::path::PathBuf {
    #[cfg(target_os = "windows")]
    {
        std::env::var("APPDATA")
            .map(std::path::PathBuf::from)
            .unwrap_or_else(|_| std::env::temp_dir())
            .join("Onefend")
    }
    #[cfg(not(target_os = "windows"))]
    {
        std::env::var("HOME")
            .map(std::path::PathBuf::from)
            .unwrap_or_else(|_| std::env::temp_dir())
            .join(".config")
            .join("onefend")
    }
}

/// Load CA from disk or generate a new one and persist it.
///
/// The CA cert+key are saved to ~/.config/onefend/proxy_ca.{crt,key}
/// so that NODE_EXTRA_CA_CERTS remains valid across agent restarts.
/// Without persistence, restarting the agent invalidates the CA cert
/// that running AI tools (Claude Code, VS Code, etc.) have cached.
fn get_or_create_ca() -> Result<&'static CaState> {
    CA.get_or_try_init(|| {
        let dir = ca_storage_dir();
        let cert_path = dir.join("proxy_ca.crt");
        let key_path = dir.join("proxy_ca.key");

        // Try loading from disk first
        if cert_path.exists() && key_path.exists() {
            let cert_pem = std::fs::read_to_string(&cert_path)
                .context("Failed to read persisted CA cert")?;
            let key_pem = std::fs::read_to_string(&key_path)
                .context("Failed to read persisted CA key")?;

            // Parse PEM to extract DER
            let cert_der = pem_to_der(&cert_pem)
                .context("Failed to decode persisted CA cert PEM")?;

            info!("[Proxy] Loaded persisted CA certificate from {:?}", cert_path);

            return Ok(CaState {
                cert_der,
                cert_pem,
                key_pem,
            });
        }

        // Generate new CA
        info!("[Proxy] Generating new CA certificate (will persist to disk)...");

        let mut params = CertificateParams::default();
        let mut dn = DistinguishedName::new();
        dn.push(DnType::CommonName, "Onefend Desktop Agent CA");
        dn.push(DnType::OrganizationName, "Onefend Security");
        params.distinguished_name = dn;
        params.is_ca = IsCa::Ca(BasicConstraints::Unconstrained);
        params.key_usages = vec![KeyUsagePurpose::KeyCertSign, KeyUsagePurpose::CrlSign];

        let key_pair = KeyPair::generate()?;
        let cert = params.self_signed(&key_pair)?;

        let cert_der = cert.der().to_vec();
        let cert_pem = cert.pem();
        let key_pem = key_pair.serialize_pem();

        // Persist to disk
        if let Err(e) = std::fs::create_dir_all(&dir) {
            warn!("[Proxy] Failed to create CA storage dir: {}", e);
        }
        if let Err(e) = std::fs::write(&cert_path, &cert_pem) {
            warn!("[Proxy] Failed to persist CA cert: {}", e);
        }
        if let Err(e) = std::fs::write(&key_path, &key_pem) {
            warn!("[Proxy] Failed to persist CA key: {}", e);
        }
        // Restrict key file permissions (Unix only)
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let _ = std::fs::set_permissions(&key_path, std::fs::Permissions::from_mode(0o600));
        }

        info!("[Proxy] CA certificate generated and persisted to {:?}", cert_path);

        Ok(CaState {
            cert_der,
            cert_pem,
            key_pem,
        })
    })
}

/// Decode a PEM certificate to raw DER bytes.
fn pem_to_der(pem: &str) -> Result<Vec<u8>> {
    let pem = pem.trim();
    let b64: String = pem
        .lines()
        .filter(|line| !line.starts_with("-----"))
        .collect::<Vec<_>>()
        .join("");

    // Simple base64 decode (standard alphabet)
    let mut result = Vec::new();
    let chars: Vec<u8> = b64.bytes().collect();
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
    Ok(result)
}

// ─────────────────────────────────────────────────────────────────────────────
// Public-facing CA export (for system trust store installation)
// ─────────────────────────────────────────────────────────────────────────────

/// Return the DER-encoded CA cert so it can be written to disk
/// and installed in the OS/browser trust store.
pub fn get_ca_cert_der() -> Result<Vec<u8>> {
    Ok(get_or_create_ca()?.cert_der.clone())
}

/// Return the PEM-encoded CA cert.
/// Used by the wrapper installer to set NODE_EXTRA_CA_CERTS.
pub fn get_ca_cert_pem() -> Result<String> {
    Ok(get_or_create_ca()?.cert_pem.clone())
}

/// Install the CA certificate into the system trust store.
/// Returns Ok(()) on success or a descriptive error.
pub fn install_ca_to_system_trust() -> Result<()> {
    let ca = get_or_create_ca()?;
    let cert_path = std::env::temp_dir().join("onefend_agent_ca.crt");
    std::fs::write(&cert_path, &ca.cert_pem).context("Failed to write CA cert to temp file")?;

    #[cfg(target_os = "linux")]
    {
        // Try update-ca-certificates (Debian/Ubuntu) or update-ca-trust (RHEL/Fedora)
        let dest = "/usr/local/share/ca-certificates/onefend_agent_ca.crt";
        if std::path::Path::new("/usr/sbin/update-ca-certificates").exists() {
            std::fs::copy(&cert_path, dest)
                .context("Failed to copy CA cert — run agent as root or with sudo")?;
            let _ = std::process::Command::new("update-ca-certificates").status();
            info!("[Proxy] CA installed via update-ca-certificates");
        } else if std::path::Path::new("/usr/bin/update-ca-trust").exists() {
            let dest_trust = "/etc/pki/ca-trust/source/anchors/onefend_agent_ca.crt";
            std::fs::copy(&cert_path, dest_trust)
                .context("Failed to copy CA cert to pki trust anchors")?;
            let _ = std::process::Command::new("update-ca-trust").status();
            info!("[Proxy] CA installed via update-ca-trust");
        } else {
            warn!(
                "[Proxy] No system CA update tool found. Install {:?} manually.",
                cert_path
            );
        }
    }

    #[cfg(target_os = "macos")]
    {
        let status = std::process::Command::new("security")
            .args([
                "add-trusted-cert",
                "-d",
                "-r",
                "trustRoot",
                "-k",
                "/Library/Keychains/System.keychain",
                cert_path.to_str().unwrap_or(""),
            ])
            .status()
            .context("Failed to run 'security add-trusted-cert'")?;

        if status.success() {
            info!("[Proxy] CA installed in macOS System Keychain");
        } else {
            warn!("[Proxy] 'security add-trusted-cert' failed — may need admin rights");
        }
    }

    #[cfg(target_os = "windows")]
    {
        let status = std::process::Command::new("certutil")
            .args(["-addstore", "-f", "ROOT", cert_path.to_str().unwrap_or("")])
            .status()
            .context("Failed to run certutil")?;

        if status.success() {
            info!("[Proxy] CA installed in Windows ROOT store");
        } else {
            warn!("[Proxy] certutil failed — may need admin rights");
        }
    }

    Ok(())
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared proxy context (passed to each connection handler)
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Clone)]
pub struct ProxyContext {
    pub api_client: Arc<RwLock<ApiClient>>,
    pub config: Arc<std::sync::Mutex<AgentConfig>>,
    pub queue: Arc<std::sync::Mutex<EventQueue>>,
    pub app_handle: Option<tauri::AppHandle>,
    pub hitl_channels: Arc<
        std::sync::Mutex<
            std::collections::HashMap<String, tokio::sync::oneshot::Sender<ProxyDecision>>,
        >,
    >,
    /// Shared with AppState — proxy stores HITL payloads here; JS polls via check_hitl_pending()
    pub pending_hitl: Arc<std::sync::Mutex<Option<serde_json::Value>>>,
    /// Shared policy config (updated by heartbeat loop every 30s)
    pub policy: Arc<std::sync::Mutex<Option<PolicyConfig>>>,
    /// Unique session ID for this proxy instance (generated at startup)
    pub session_id: String,
}

// ─────────────────────────────────────────────────────────────────────────────
// Proxy Server
// ─────────────────────────────────────────────────────────────────────────────

/// Start the HTTPS proxy and block until the server shuts down.
/// Call this in a `tokio::spawn` task.
pub async fn run_proxy(ctx: ProxyContext) -> Result<()> {
    // Ensure CA exists
    get_or_create_ca()?;

    let addr: SocketAddr = format!("127.0.0.1:{}", PROXY_PORT)
        .parse()
        .context("Invalid proxy bind address")?;

    let listener = TcpListener::bind(addr)
        .await
        .context(format!("Failed to bind proxy to {}", addr))?;

    info!("[Proxy] Listening on {}", addr);

    loop {
        match listener.accept().await {
            Ok((stream, peer)) => {
                info!("[Proxy] Accepted connection from {}", peer);
                let ctx_clone = ctx.clone();
                tokio::spawn(async move {
                    if let Err(e) = handle_connection(stream, ctx_clone).await {
                        warn!("[Proxy] Connection error: {}", e);
                    }
                });
            }
            Err(e) => {
                error!("[Proxy] Accept error: {}", e);
            }
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Connection handler — parses HTTP CONNECT then routes
// ─────────────────────────────────────────────────────────────────────────────

async fn handle_connection(mut stream: TcpStream, ctx: ProxyContext) -> Result<()> {
    // Read the CONNECT request (plain HTTP before TLS)
    let mut buf = [0u8; 4096];
    let n = stream
        .read(&mut buf)
        .await
        .context("Failed to read CONNECT")?;
    let request = String::from_utf8_lossy(&buf[..n]);

    // Parse: "CONNECT api.anthropic.com:443 HTTP/1.1"
    let (host, port) = match parse_connect_request(&request) {
        Some(hp) => hp,
        None => {
            // Some apps send plain HTTP (GET/POST) instead of CONNECT when
            // HTTP_PROXY is set. Log the first line for debugging and drop.
            let first_line = request.lines().next().unwrap_or("(empty)");
            debug!("[Proxy] Ignoring non-CONNECT request: {}", &first_line[..first_line.len().min(120)]);
            return Ok(());
        }
    };

    info!("[Proxy] CONNECT {}:{}", host, port);

    // ── Proxy authentication (optional, enabled via ONEFEND_PROXY_TOKEN) ──
    if let Ok(expected_token) = std::env::var("ONEFEND_PROXY_TOKEN") {
        let auth_value = request
            .lines()
            .find(|line| line.to_lowercase().starts_with("proxy-authorization:"))
            .and_then(|line| line.splitn(2, ':').nth(1))
            .map(|v| v.trim())
            .unwrap_or("");
        let expected = format!("Bearer {}", expected_token);
        if auth_value != expected {
            warn!("[Proxy] Rejected CONNECT to {}:{}: invalid or missing proxy token", host, port);
            stream
                .write_all(b"HTTP/1.1 407 Proxy Authentication Required\r\nProxy-Authenticate: Bearer\r\n\r\n")
                .await
                .ok();
            return Ok(());
        }
    }

    if let Some(mode) = classify_domain(&host) {
        // Check TLS blacklist: if a previous MitM attempt failed for this domain,
        // skip interception and passthrough directly (the tool will work on retry).
        let is_blacklisted = TLS_BLACKLIST.lock().unwrap().contains(&host);

        match mode {
            InterceptMode::FullIntercept(api_format) if port == INTERCEPT_PORT && !is_blacklisted => {
                // ── Full MitM interception ─────────────────────────────────
                info!("[Proxy] Intercepting {} (format: {:?})", host, api_format);
                stream
                    .write_all(b"HTTP/1.1 200 Connection Established\r\n\r\n")
                    .await?;
                handle_intercepted_tunnel(stream, host, port, api_format, ctx).await
            }
            InterceptMode::FullIntercept(_) if is_blacklisted => {
                // ── Blacklisted: TLS handshake failed before, passthrough ──
                let platform = platform_label(&host);
                info!("[Proxy] [{}] AI traffic detected (passthrough, cert-pinned): {}", platform, host);
                stream
                    .write_all(b"HTTP/1.1 200 Connection Established\r\n\r\n")
                    .await?;
                passthrough_tunnel(stream, &host, port).await
            }
            InterceptMode::LogOnly => {
                // ── Log-only passthrough ───────────────────────────────────
                let platform = platform_label(&host);
                info!("[Proxy] [{}] AI traffic detected (log-only passthrough): {}", platform, host);
                stream
                    .write_all(b"HTTP/1.1 200 Connection Established\r\n\r\n")
                    .await?;
                passthrough_tunnel(stream, &host, port).await
            }
            _ => {
                // Known domain but wrong port
                stream
                    .write_all(b"HTTP/1.1 200 Connection Established\r\n\r\n")
                    .await?;
                passthrough_tunnel(stream, &host, port).await
            }
        }
    } else {
        // ── Pass-through: unknown host, forward blindly ───────────────────
        stream
            .write_all(b"HTTP/1.1 200 Connection Established\r\n\r\n")
            .await?;
        passthrough_tunnel(stream, &host, port).await
    }
}

/// Parse "CONNECT host:port HTTP/1.x" → (host, port)
fn parse_connect_request(req: &str) -> Option<(String, u16)> {
    let first_line = req.lines().next()?;
    let parts: Vec<&str> = first_line.split_whitespace().collect();
    if parts.len() < 2 || parts[0] != "CONNECT" {
        return None;
    }
    let host_port: Vec<&str> = parts[1].rsplitn(2, ':').collect();
    if host_port.len() != 2 {
        return None;
    }
    let port: u16 = host_port[0].parse().ok()?;
    let host = host_port[1].to_string();
    Some((host, port))
}

// ─────────────────────────────────────────────────────────────────────────────
// Intercepted tunnel — full MitM TLS + body analysis
// ─────────────────────────────────────────────────────────────────────────────

async fn handle_intercepted_tunnel(
    client_stream: TcpStream,
    host: String,
    port: u16,
    api_format: AiApiFormat,
    ctx: ProxyContext,
) -> Result<()> {
    let _ = client_stream.set_nodelay(true);

    // 1. TLS handshake with client
    let server_config = build_server_tls_config(&host).context("Failed to build server TLS config")?;
    let acceptor = TlsAcceptor::from(Arc::new(server_config));
    let tls_client = match acceptor.accept(client_stream).await {
        Ok(tls) => tls,
        Err(e) => {
            // TLS handshake failed -- likely certificate pinning.
            // Blacklist this domain so future connections get passthrough.
            let platform = platform_label(&host);
            warn!(
                "[Proxy] [{}] TLS handshake failed for {} ({}). Blacklisting for passthrough.",
                platform, host, e
            );
            TLS_BLACKLIST.lock().unwrap().insert(host);
            return Ok(());
        }
    };

    // 2. Connect to real server (same as pure relay that was proven to work)
    let addr = {
        let addrs: Vec<std::net::SocketAddr> = tokio::net::lookup_host(format!("{}:{}", host, port))
            .await.context("DNS resolution failed")?.collect();
        let ipv4 = addrs.iter().find(|a| a.is_ipv4());
        ipv4.or(addrs.first()).copied().context("DNS returned no addresses")?
    };
    let server_tcp = TcpStream::connect(addr).await.context("TCP connect failed")?;
    let _ = server_tcp.set_nodelay(true);
    let connector = TlsConnector::from(Arc::new(build_client_tls_config()?));
    let server_name = rustls::pki_types::ServerName::try_from(host.to_string()).context("Invalid server name")?;
    let tls_server = connector.connect(server_name, server_tcp).await.context("TLS handshake with server failed")?;

    // 3. Split both TLS streams
    let (mut client_read, mut client_write) = tokio::io::split(tls_client);
    let (mut server_read, mut server_write) = tokio::io::split(tls_server);

    // 4. Read the first HTTP request for analysis
    let request_buf = read_full_http_request(&mut client_read)
        .await
        .context("Failed to read full HTTP request")?;
    if request_buf.is_empty() {
        return Ok(());
    }

    info!("[Proxy] Intercepted request to {}: {} bytes", host, request_buf.len());

    // 5. Analyze the request (extract prompt, PII check, backend AI)
    let request_str = String::from_utf8_lossy(&request_buf).to_string();
    let (_headers_str, body_str) = split_http_headers_body(&request_str);
    let prompt_text = match api_format {
        AiApiFormat::Anthropic => extract_prompt_from_anthropic_body(&body_str),
        AiApiFormat::OpenAi => extract_prompt_from_openai_body(&body_str),
    };

    let platform = platform_label(&host);

    if let Some(ref text) = prompt_text {
        info!("[Proxy] [{}] Extracted prompt ({} chars): \"{}\"", platform, text.len(), &text[..text.len().min(120)]);
    }

    let (intervention_mode, tenant_patterns) = {
        let policy = ctx.policy.lock().unwrap();
        match policy.as_ref() {
            Some(p) => (p.intervention_mode.clone(), p.tenant_patterns.clone()),
            None => ("BLOCKING".to_string(), vec![]),
        }
    };

    let (decision, local_result, backend_resp) = if let Some(text) = &prompt_text {
        let local = analyze_locally_with_patterns(text, &tenant_patterns);
        if local.has_matches {
            info!("[Proxy] Local PII detected: {} match(es)", local.matches.len());
        }
        let (backend_decision, resp) = analyze_with_backend_full(&ctx, text).await;
        let decision = apply_decision_matrix(&local, &backend_decision, &resp);
        info!("[Proxy] Decision: {:?}", decision);
        let final_decision = if intervention_mode == "OBSERVATION" {
            decision
        } else {
            analyze_and_decide(&ctx, text, decision).await
        };
        (final_decision, Some(local), resp)
    } else {
        (ProxyDecision::Allow, None, None)
    };

    // 6. Handle decision
    match decision {
        ProxyDecision::Block { reason } => {
            warn!("[Proxy] BLOCKED: {}", reason);
            let error_body = serde_json::json!({"type":"error","error":{"type":"permission_error","message":format!("Blocked: {}", reason)}}).to_string();
            let response = format!("HTTP/1.1 403 Forbidden\r\nContent-Type: application/json\r\nContent-Length: {}\r\n\r\n{}", error_body.len(), error_body);
            client_write.write_all(response.as_bytes()).await?;
            if let Some(text) = &prompt_text {
                log_event(&ctx, if reason.contains("cancelled") { "CLEAR_TEXT" } else { "BLOCK" }, text, &backend_resp, &local_result, platform, &host).await;
            }
            return Ok(());
        }
        ProxyDecision::Redact { .. } => {
            info!("[Proxy] REDACTING request");
            if let Some(text) = &prompt_text {
                log_event(&ctx, "REDACTED_SEND", text, &backend_resp, &local_result, platform, &host).await;
            }
            let redacted_body = match api_format {
                AiApiFormat::Anthropic => rebuild_anthropic_body(&body_str, ""),
                AiApiFormat::OpenAi => rebuild_openai_body(&body_str, ""),
            };
            let redacted_req = rebuild_http_request(&_headers_str, &redacted_body);
            server_write.write_all(redacted_req.as_bytes()).await?;
            server_write.flush().await?;
        }
        ProxyDecision::Allow | ProxyDecision::Warn { .. } => {
            if matches!(decision, ProxyDecision::Warn { .. }) {
                if let Some(text) = &prompt_text {
                    log_event(&ctx, "WARNED_PROCEED", text, &backend_resp, &local_result, platform, &host).await;
                }
            }
            // Forward ORIGINAL bytes untouched
            server_write.write_all(&request_buf).await?;
            server_write.flush().await?;
        }
    }

    // 7. Bidirectional relay (same as pure relay that works)
    // This handles the streaming response AND any additional requests
    // on the same connection.
    let client_to_server = tokio::io::copy(&mut client_read, &mut server_write);
    let server_to_client = tokio::io::copy(&mut server_read, &mut client_write);

    tokio::select! {
        r = client_to_server => { if let Err(e) = r { debug!("[Proxy] client->server ended: {}", e); } }
        r = server_to_client => { if let Err(e) = r { debug!("[Proxy] server->client ended: {}", e); } }
    }

    Ok(())
}

// ─────────────────────────────────────────────────────────────────────────────
// Pass-through tunnel (non-intercepted hosts)
// ─────────────────────────────────────────────────────────────────────────────

async fn passthrough_tunnel(mut client: TcpStream, host: &str, port: u16) -> Result<()> {
    let _ = client.set_nodelay(true);
    let addr = {
        let addrs: Vec<std::net::SocketAddr> = tokio::net::lookup_host(format!("{}:{}", host, port))
            .await.context(format!("DNS resolution failed for {}", host))?.collect();
        let ipv4 = addrs.iter().find(|a| a.is_ipv4());
        ipv4.or(addrs.first()).copied()
            .context(format!("DNS returned no addresses for {}", host))?
    };
    let mut server = TcpStream::connect(addr)
        .await
        .context(format!("Failed to connect to {}", addr))?;
    let _ = server.set_nodelay(true);
    tokio::io::copy_bidirectional(&mut client, &mut server).await?;
    Ok(())
}

// ─────────────────────────────────────────────────────────────────────────────
// TLS helpers
// ─────────────────────────────────────────────────────────────────────────────

/// Build a rustls `ServerConfig` using a dynamically generated cert for `domain`.
fn build_server_tls_config(domain: &str) -> Result<ServerConfig> {
    let ca = get_or_create_ca()?;

    // Re-create the CA key pair from PEM (rcgen 0.13 doesn't support parsing
    // CertificateParams from an existing PEM, so we re-derive from key + re-sign)
    let ca_key_pair = KeyPair::from_pem(&ca.key_pem).context("Failed to parse CA key pair")?;

    // Build a fresh CA cert from params (same key = same public key fingerprint)
    let mut ca_params = CertificateParams::default();
    let mut dn = DistinguishedName::new();
    dn.push(DnType::CommonName, "Onefend Desktop Agent CA");
    dn.push(DnType::OrganizationName, "Onefend Security");
    ca_params.distinguished_name = dn;
    ca_params.is_ca = IsCa::Ca(BasicConstraints::Unconstrained);
    ca_params.key_usages = vec![KeyUsagePurpose::KeyCertSign, KeyUsagePurpose::CrlSign];
    let ca_cert = ca_params
        .self_signed(&ca_key_pair)
        .context("Failed to self-sign CA cert for leaf signing")?;

    // Generate leaf cert for the target domain
    let mut leaf_params = CertificateParams::new(vec![domain.to_string()])
        .context("Failed to create leaf cert params")?;
    leaf_params.is_ca = IsCa::NoCa;

    let leaf_key = KeyPair::generate()?;
    let leaf_cert = leaf_params
        .signed_by(&leaf_key, &ca_cert, &ca_key_pair)
        .context("Failed to sign leaf cert")?;

    // Build the rustls cert chain
    let cert_der = rustls::pki_types::CertificateDer::from(leaf_cert.der().to_vec());
    let key_der = rustls::pki_types::PrivateKeyDer::try_from(leaf_key.serialize_der())
        .map_err(|e| anyhow::anyhow!("Invalid key DER: {:?}", e))?;

    let config = ServerConfig::builder()
        .with_no_client_auth()
        .with_single_cert(vec![cert_der], key_der)
        .context("Failed to build ServerConfig")?;

    Ok(config)
}

/// Build a rustls `ClientConfig` that trusts our CA (for connecting to the real server).
fn build_client_tls_config() -> Result<ClientConfig> {
    let ca = get_or_create_ca()?;

    let ca_cert = rustls::pki_types::CertificateDer::from(ca.cert_der.clone());

    let mut root_store = RootCertStore::empty();
    // Add system roots first (so non-intercepted connections still work)
    let native_certs = rustls_native_certs::load_native_certs();
    for cert in native_certs.certs {
        let _ = root_store.add(cert); // ignore individual failures
    }
    // Add our own CA
    root_store
        .add(ca_cert)
        .context("Failed to add Onefend CA to root store")?;

    let config = ClientConfig::builder()
        .with_root_certificates(root_store)
        .with_no_client_auth();

    Ok(config)
}

// ─────────────────────────────────────────────────────────────────────────────
// Forward request to real server and relay response back
// ─────────────────────────────────────────────────────────────────────────────

async fn forward_and_relay<W>(
    client_writer: &mut W,
    host: &str,
    port: u16,
    request_bytes: &[u8],
) -> Result<()>
where
    W: AsyncWriteExt + Unpin,
{
    let client_config = build_client_tls_config()?;
    let connector = TlsConnector::from(Arc::new(client_config));

    // Async DNS with IPv4 preference (avoids hanging on broken IPv6)
    let addr = {
        let addrs: Vec<std::net::SocketAddr> = tokio::net::lookup_host(format!("{}:{}", host, port))
            .await.context("DNS resolution failed")?.collect();
        let ipv4 = addrs.iter().find(|a| a.is_ipv4());
        ipv4.or(addrs.first()).copied().context("DNS returned no addresses")?
    };
    let server_stream = TcpStream::connect(addr)
        .await
        .context("Failed to TCP-connect to real server")?;
    let _ = server_stream.set_nodelay(true);

    let server_name =
        rustls::pki_types::ServerName::try_from(host.to_string()).context("Invalid server name")?;

    let tls_server = connector
        .connect(server_name, server_stream)
        .await
        .context("TLS handshake with real server failed")?;

    let (mut server_reader, mut server_writer) = tokio::io::split(tls_server);

    // Send request to real server
    server_writer
        .write_all(request_bytes)
        .await
        .context("Failed to write request to real server")?;
    server_writer.flush().await?;

    // Stream response back using tokio::io::copy (same mechanism as the pure
    // relay that was proven to work). This avoids the write_all+flush loop
    // that caused streaming stalls due to per-chunk TLS record overhead.
    tokio::io::copy(&mut server_reader, client_writer)
        .await
        .context("Failed to relay response")?;

    Ok(())
}

// ─────────────────────────────────────────────────────────────────────────────
// Full HTTP request reader
// ─────────────────────────────────────────────────────────────────────────────

/// Read a complete HTTP request (headers + body) from a TLS stream.
///
/// Claude Code sends large requests (system prompts, tool results, file contents)
/// that can span hundreds of KB. A single `read()` call is not enough -- we must:
///   1. Accumulate data until the header/body delimiter (`\r\n\r\n`) is found.
///   2. Parse `Content-Length` from headers.
///   3. Keep reading until we have exactly that many body bytes.
///
/// Returns the full raw request bytes (headers + body).
async fn read_full_http_request<R: tokio::io::AsyncRead + Unpin>(
    reader: &mut R,
) -> Result<Vec<u8>> {
    let mut buf = Vec::with_capacity(8192);
    let mut tmp = [0u8; 16384];
    let mut header_end: Option<usize>;

    // Phase 1: read until we have the full header block
    loop {
        let n = reader.read(&mut tmp).await.context("read headers")?;
        if n == 0 {
            // Connection closed before we got headers -- nothing to do
            return Ok(Vec::new());
        }
        buf.extend_from_slice(&tmp[..n]);

        // Look for the header/body delimiter
        if let Some(pos) = find_header_end(&buf) {
            header_end = Some(pos);
            break;
        }

        // Safety valve: headers should never exceed 64 KB
        if buf.len() > 65536 {
            anyhow::bail!("HTTP headers exceeded 64 KB without delimiter");
        }
    }

    let hdr_end = header_end.unwrap(); // byte offset of first body byte
    let header_bytes = &buf[..hdr_end];
    let headers_str = String::from_utf8_lossy(header_bytes);

    // Parse Content-Length (case-insensitive)
    let content_length: usize = headers_str
        .lines()
        .find(|line| line.to_lowercase().starts_with("content-length:"))
        .and_then(|line| line.split(':').nth(1))
        .and_then(|val| val.trim().parse().ok())
        .unwrap_or(0);

    // Phase 2: read remaining body bytes if we don't have them yet
    let body_received = buf.len() - hdr_end;
    let remaining = content_length.saturating_sub(body_received);

    if remaining > 0 {
        // Cap at 16 MB to prevent OOM on malformed requests
        if content_length > 16 * 1024 * 1024 {
            anyhow::bail!(
                "Content-Length {} exceeds 16 MB safety limit",
                content_length
            );
        }
        buf.reserve(remaining);
        let mut left = remaining;
        while left > 0 {
            let to_read = left.min(tmp.len());
            let n = reader
                .read(&mut tmp[..to_read])
                .await
                .context("read body")?;
            if n == 0 {
                warn!(
                    "[Proxy] Connection closed with {} body bytes remaining",
                    left
                );
                break;
            }
            buf.extend_from_slice(&tmp[..n]);
            left -= n;
        }
    }

    debug!(
        "[Proxy] Read full request: {} header bytes + {} body bytes (Content-Length: {})",
        hdr_end,
        buf.len() - hdr_end,
        content_length
    );

    Ok(buf)
}

/// Find the byte offset where the HTTP body starts (after `\r\n\r\n`).
fn find_header_end(buf: &[u8]) -> Option<usize> {
    buf.windows(4)
        .position(|w| w == b"\r\n\r\n")
        .map(|pos| pos + 4)
}

// ─────────────────────────────────────────────────────────────────────────────
// HTTP parsing helpers
// ─────────────────────────────────────────────────────────────────────────────

fn split_http_headers_body(raw: &str) -> (String, String) {
    if let Some(idx) = raw.find("\r\n\r\n") {
        let headers = raw[..idx + 4].to_string();
        let body = raw[idx + 4..].to_string();
        (headers, body)
    } else if let Some(idx) = raw.find("\n\n") {
        let headers = raw[..idx + 2].to_string();
        let body = raw[idx + 2..].to_string();
        (headers, body)
    } else {
        (raw.to_string(), String::new())
    }
}

fn rebuild_http_request(headers: &str, new_body: &str) -> String {
    // Update Content-Length header
    let headers_updated = headers
        .lines()
        .map(|line| {
            if line.to_lowercase().starts_with("content-length:") {
                format!("Content-Length: {}", new_body.len())
            } else {
                line.to_string()
            }
        })
        .collect::<Vec<_>>()
        .join("\r\n");

    format!(
        "{}\r\n\r\n{}",
        headers_updated.trim_end_matches("\r\n"),
        new_body
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// AI API body parsing (Anthropic + OpenAI formats)
// ─────────────────────────────────────────────────────────────────────────────

/// Extract the last user message text from an Anthropic API request body.
///
/// Anthropic format (POST /v1/messages):
/// ```json
/// { "messages": [{"role":"user","content":"<text>"}], "model": "...", ... }
/// ```
/// Content can be a string or an array of content blocks [{type:"text", text:"..."}]
fn extract_prompt_from_anthropic_body(body: &str) -> Option<String> {
    if body.trim().is_empty() {
        return None;
    }

    let json: serde_json::Value = serde_json::from_str(body).ok()?;
    let messages = json.get("messages")?.as_array()?;

    // Extract the LAST user message that contains user-typed text.
    // Messages can contain tool_result blocks (file reads, command output) alongside
    // text blocks. We extract ALL text blocks from the message, ignoring tool_results.
    // This is important for VS Code extensions which mix tool context with user prompts.
    for msg in messages.iter().rev() {
        if msg.get("role").and_then(|r| r.as_str()) == Some("user") {
            let raw = match msg.get("content") {
                Some(serde_json::Value::String(s)) => {
                    if s.trim().is_empty() {
                        continue;
                    }
                    s.clone()
                }
                Some(serde_json::Value::Array(parts)) => {
                    // Extract only "type":"text" blocks, skipping tool_result/tool_use/image
                    let mut texts = Vec::new();
                    for part in parts {
                        if part.get("type").and_then(|t| t.as_str()) == Some("text") {
                            if let Some(text) = part.get("text").and_then(|t| t.as_str()) {
                                texts.push(text.to_string());
                            }
                        }
                    }
                    if texts.is_empty() {
                        continue;
                    }
                    texts.join("\n")
                }
                _ => continue,
            };

            // Strip <system-reminder>...</system-reminder> blocks injected by Claude Code
            let cleaned = strip_system_reminders(&raw);
            let cleaned = cleaned.trim();
            if !cleaned.is_empty() {
                return Some(cleaned.to_string());
            }
        }
    }

    None
}

/// Remove `<system-reminder>...</system-reminder>` blocks from user messages.
/// Claude Code injects these as context (tool lists, skills, dates) that are
/// not part of the user's actual prompt and should not be analyzed or displayed.
fn strip_system_reminders(text: &str) -> String {
    let re = regex::Regex::new(r"(?s)<system-reminder>.*?</system-reminder>").unwrap();
    let result = re.replace_all(text, "");
    result.to_string()
}

/// Extract the last user message from an OpenAI Chat Completions request body.
///
/// OpenAI format (POST /v1/chat/completions):
/// ```json
/// { "messages": [{"role":"user","content":"Hello"}], "model": "gpt-4", ... }
/// ```
/// Used by: Cline, Continue, Cursor (BYOK), Windsurf/Codeium JSON endpoints.
/// Content is always a string (OpenAI doesn't use content block arrays for user messages).
fn extract_prompt_from_openai_body(body: &str) -> Option<String> {
    if body.trim().is_empty() {
        return None;
    }

    let json: serde_json::Value = serde_json::from_str(body).ok()?;
    let messages = json.get("messages")?.as_array()?;

    // Get the last user message
    for msg in messages.iter().rev() {
        if msg.get("role").and_then(|r| r.as_str()) == Some("user") {
            match msg.get("content") {
                Some(serde_json::Value::String(s)) => {
                    let trimmed = s.trim();
                    if !trimmed.is_empty() {
                        return Some(trimmed.to_string());
                    }
                }
                // Some OpenAI-compatible APIs also support content arrays
                Some(serde_json::Value::Array(parts)) => {
                    let mut texts = Vec::new();
                    for part in parts {
                        if part.get("type").and_then(|t| t.as_str()) == Some("text") {
                            if let Some(text) = part.get("text").and_then(|t| t.as_str()) {
                                let trimmed = text.trim();
                                if !trimmed.is_empty() {
                                    texts.push(trimmed.to_string());
                                }
                            }
                        }
                    }
                    if !texts.is_empty() {
                        return Some(texts.join("\n"));
                    }
                }
                _ => continue,
            }
        }
    }

    None
}

/// Rebuild an Anthropic API JSON body with PII redacted in ALL user messages.
///
/// Claude Code sends the full conversation history with every request.
/// If we only redact the last message, prior turns still contain PII in plain text.
/// This function runs local PII redaction on every user message in the body.
fn rebuild_anthropic_body(original_body: &str, _redacted_last: &str) -> String {
    let mut json: serde_json::Value = match serde_json::from_str(original_body) {
        Ok(v) => v,
        Err(_) => return original_body.to_string(),
    };

    if let Some(messages) = json.get_mut("messages").and_then(|m| m.as_array_mut()) {
        for msg in messages.iter_mut() {
            if msg.get("role").and_then(|r| r.as_str()) != Some("user") {
                continue;
            }
            match msg.get_mut("content") {
                Some(serde_json::Value::String(s)) => {
                    let result = analyze_locally(s);
                    if result.has_matches {
                        *s = result.redacted_text;
                    }
                }
                Some(serde_json::Value::Array(parts)) => {
                    for part in parts.iter_mut() {
                        if part.get("type").and_then(|t| t.as_str()) == Some("text") {
                            if let Some(text_val) = part.get("text").and_then(|t| t.as_str()) {
                                let result = analyze_locally(text_val);
                                if result.has_matches {
                                    part["text"] = serde_json::Value::String(result.redacted_text);
                                }
                            }
                        }
                    }
                }
                _ => {}
            }
        }
    }

    // Also redact the system prompt if it contains PII (unlikely but defensive)
    if let Some(system) = json.get_mut("system") {
        if let Some(s) = system.as_str() {
            let result = analyze_locally(s);
            if result.has_matches {
                *json.get_mut("system").unwrap() = serde_json::Value::String(result.redacted_text);
            }
        }
    }

    serde_json::to_string(&json).unwrap_or_else(|_| original_body.to_string())
}

/// Rebuild an OpenAI Chat Completions JSON body with PII redacted in ALL user messages.
///
/// OpenAI format has simpler content (always string), so redaction is straightforward.
fn rebuild_openai_body(original_body: &str, _redacted_last: &str) -> String {
    let mut json: serde_json::Value = match serde_json::from_str(original_body) {
        Ok(v) => v,
        Err(_) => return original_body.to_string(),
    };

    if let Some(messages) = json.get_mut("messages").and_then(|m| m.as_array_mut()) {
        for msg in messages.iter_mut() {
            if msg.get("role").and_then(|r| r.as_str()) != Some("user") {
                continue;
            }
            match msg.get_mut("content") {
                Some(serde_json::Value::String(s)) => {
                    let result = analyze_locally(s);
                    if result.has_matches {
                        *s = result.redacted_text;
                    }
                }
                // Some OpenAI-compatible APIs support content arrays
                Some(serde_json::Value::Array(parts)) => {
                    for part in parts.iter_mut() {
                        if part.get("type").and_then(|t| t.as_str()) == Some("text") {
                            if let Some(text_val) = part.get("text").and_then(|t| t.as_str()) {
                                let result = analyze_locally(text_val);
                                if result.has_matches {
                                    part["text"] = serde_json::Value::String(result.redacted_text);
                                }
                            }
                        }
                    }
                }
                _ => {}
            }
        }
    }

    serde_json::to_string(&json).unwrap_or_else(|_| original_body.to_string())
}

// ─────────────────────────────────────────────────────────────────────────────
// HITL Popup Window
// ─────────────────────────────────────────────────────────────────────────────

/// Spawn a dedicated always-on-top popup window for the HITL decision.
/// If one is already open, close and destroy it first to avoid label conflicts.
///
/// On Wayland (Ubuntu/GNOME), background apps cannot steal focus or force
/// always-on-top. We also fire a system notification via notify-send so the
/// user always sees that a decision is pending.
pub fn spawn_hitl_popup(handle: &tauri::AppHandle) {
    use tauri::WebviewWindowBuilder;

    // If a popup already exists, just bring it to front -- don't recreate.
    // This avoids the flash caused by concurrent requests destroying and
    // re-creating the window within milliseconds.
    if let Some(existing) = handle.get_webview_window("hitl-popup") {
        let _ = existing.show();
        let _ = existing.set_focus();
        let _ = existing.request_user_attention(Some(tauri::UserAttentionType::Critical));
        info!("[HITL] Popup already open, brought to front.");
        return;
    }

    // Fire a system notification (works on Wayland where focus-stealing doesn't)
    #[cfg(target_os = "linux")]
    {
        let _ = std::process::Command::new("notify-send")
            .args([
                "--app-name=Onefend",
                "--urgency=critical",
                "--icon=dialog-warning",
                "Onefend - Action Required",
                "Sensitive data detected in your prompt. Review the Onefend popup to proceed.",
            ])
            .spawn();
    }

    match WebviewWindowBuilder::new(
        handle,
        "hitl-popup",
        tauri::WebviewUrl::App("hitl.html".into()),
    )
    .title("Onefend — Action Required")
    .inner_size(480.0, 380.0)
    .resizable(false)
    .always_on_top(true)
    .center()
    .focused(true)
    .visible(true)
    .build()
    {
        Ok(window) => {
            let _ = window.show();
            let _ = window.set_focus();
            let _ = window.set_always_on_top(true);
            let _ = window.request_user_attention(Some(tauri::UserAttentionType::Critical));
            info!("[HITL] Popup window spawned.");
        }
        Err(e) => {
            warn!(
                "[HITL] Failed to create popup window: {}. Falling back to main window.",
                e
            );
            if let Some(main_win) = handle.get_webview_window("main") {
                let _ = main_win.show();
                let _ = main_win.set_focus();
                let _ = main_win.request_user_attention(Some(tauri::UserAttentionType::Critical));
            }
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Decision types
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone)]
pub enum ProxyDecision {
    Allow,
    Block {
        reason: String,
    },
    Redact {
        redacted_text: String,
    },
    /// HIGH/CRITICAL risk but no PII — show warning, user can still proceed
    Warn {
        category: String,
        risk_level: String,
    },
}

// ─────────────────────────────────────────────────────────────────────────────
// Backend integration
// ─────────────────────────────────────────────────────────────────────────────

/// Call the backend for AI analysis and return both the raw response and preliminary decision.
/// Does NOT show HITL -- that's handled by the caller after applying the decision matrix.
async fn analyze_with_backend_full(
    ctx: &ProxyContext,
    text: &str,
) -> (ProxyDecision, Option<AnalyzeResponse>) {
    let (device_token, configured) = {
        let config = ctx.config.lock().unwrap();
        (config.device_token.clone(), config.is_configured())
    };

    if !configured {
        debug!("[Proxy] Agent not configured — allowing request");
        return (ProxyDecision::Allow, None);
    }

    let token = match device_token {
        Some(t) => t,
        None => return (ProxyDecision::Allow, None),
    };

    let client = ctx.api_client.read().unwrap().clone();
    let request = AnalyzeRequest {
        text: text.to_string(),
        context: Some("Claude Code CLI".to_string()),
        images: vec![],
        documents: vec![],
    };

    match client.analyze_prompt(&token, request).await {
        Ok(response) => {
            let decision = backend_action_to_decision(&response, text);
            (decision, Some(response))
        }
        Err(e) => {
            warn!("[Proxy] Analysis call failed ({}). Using local analysis only.", e);
            (ProxyDecision::Allow, None)
        }
    }
}

/// Convert backend AnalyzeResponse to a preliminary ProxyDecision.
/// This is just the backend's opinion -- the final decision comes from apply_decision_matrix().
fn backend_action_to_decision(resp: &AnalyzeResponse, original_text: &str) -> ProxyDecision {
    info!(
        "[Proxy] Backend response: action={:?} risk_level={:?} category={:?} has_redacted_text={}",
        resp.action,
        resp.risk_level,
        resp.category,
        resp.redacted_text.is_some()
    );

    let action = resp
        .action
        .as_deref()
        .or(resp.recommendation.as_deref())
        .unwrap_or("ALLOW");

    match action {
        a if a.contains("BLOCK") => ProxyDecision::Block {
            reason: resp.reason.clone().unwrap_or_else(|| "Policy violation".to_string()),
        },
        a if a.contains("REDACT") => ProxyDecision::Redact {
            redacted_text: resp.redacted_text.clone().unwrap_or_else(|| original_text.to_string()),
        },
        _ => ProxyDecision::Allow, // WARN/ALLOW -- matrix will decide
    }
}

/// Decision matrix: combines local PII analysis + backend AI response.
/// Mirrors the extension's 4-rule matrix in monitor.ts / network-bridge.ts.
fn apply_decision_matrix(
    local: &LocalAnalysisResult,
    backend_decision: &ProxyDecision,
    backend_resp: &Option<AnalyzeResponse>,
) -> ProxyDecision {
    // If backend says BLOCK, always block (hard policy enforcement)
    if matches!(backend_decision, ProxyDecision::Block { .. }) {
        return backend_decision.clone();
    }

    // Determine PII from both sources
    let has_pii_local = local.has_matches;
    let has_pii_backend = backend_resp.as_ref().map_or(false, |r| {
        r.recommendation.as_deref() == Some("CONFIRM_REDACTION")
            || r.redacted_text.is_some()
    });
    let has_pii = has_pii_local || has_pii_backend;

    // Risk level from backend
    let risk_level = backend_resp
        .as_ref()
        .and_then(|r| r.risk_level.as_deref())
        .unwrap_or("LOW");

    let category = backend_resp
        .as_ref()
        .and_then(|r| r.category.as_deref())
        .unwrap_or("Unknown");

    // Determine best redacted text: prefer backend, fallback to local
    let redacted_text = backend_resp
        .as_ref()
        .and_then(|r| r.redacted_text.clone())
        .unwrap_or_else(|| local.redacted_text.clone());

    // RULE 1: LOW/MEDIUM risk + no PII → Auto-allow (no modal)
    if (risk_level == "LOW" || risk_level == "MEDIUM") && !has_pii {
        return ProxyDecision::Allow;
    }

    // RULE 2: PII detected (any risk level) → Redact modal
    if has_pii {
        return ProxyDecision::Redact { redacted_text };
    }

    // RULE 3: HIGH/CRITICAL risk + no PII → Warn modal
    if risk_level == "HIGH" || risk_level == "CRITICAL" {
        return ProxyDecision::Warn {
            category: category.to_string(),
            risk_level: risk_level.to_string(),
        };
    }

    // RULE 4: Default → Allow
    ProxyDecision::Allow
}

/// Full analysis + HITL flow. Combines backend analysis with decision matrix,
/// then escalates to Human-in-the-Loop popup if needed.
async fn analyze_and_decide(
    ctx: &ProxyContext,
    text: &str,
    decision: ProxyDecision,
) -> ProxyDecision {
    // For ALLOW: no human interaction needed.
    if matches!(decision, ProxyDecision::Allow) {
        return decision;
    }

    // For BLOCK / REDACT / WARN: escalate to HITL popup.
    let Some(_app_handle) = ctx.app_handle.as_ref() else {
        warn!("[HITL] No app_handle — enforcing decision automatically without UI.");
        return decision;
    };

    // Generate a unique request ID for this HITL round-trip.
    let request_id = {
        use std::time::{SystemTime, UNIX_EPOCH};
        let t = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos();
        format!("hitl-{:x}", t)
    };

    let (modal_type, redacted_text, block_reason, warn_category, warn_risk) =
        match &decision {
            ProxyDecision::Block { reason } => ("BLOCK", None, Some(reason.clone()), None, None),
            ProxyDecision::Redact { redacted_text } => {
                ("REDACT", Some(redacted_text.clone()), None, None, None)
            }
            ProxyDecision::Warn {
                category,
                risk_level,
            } => (
                "WARNING",
                None,
                None,
                Some(category.clone()),
                Some(risk_level.clone()),
            ),
            ProxyDecision::Allow => unreachable!(),
        };

    // Register the oneshot channel BEFORE emitting the event to avoid races.
    let (tx, rx) = tokio::sync::oneshot::channel::<ProxyDecision>();
    ctx.hitl_channels
        .lock()
        .unwrap()
        .insert(request_id.clone(), tx);

    // Payload mirrors the modal props used in extension/injector.rs.
    let payload = serde_json::json!({
        "requestId":    request_id,
        "type":         modal_type,
        "originalText": text,
        "redactedText": redacted_text,
        "blockReason":  block_reason,
        "warnCategory": warn_category,
        "warnRiskLevel": warn_risk,
        "platform":     "Claude Code CLI",
    });

    // Store in pending_hitl — popup JS polls this on load via check_hitl_pending().
    *ctx.pending_hitl.lock().unwrap() = Some(payload);

    // Spawn a native popup window (always-on-top) so the CLI user sees it immediately.
    if let Some(ref handle) = ctx.app_handle {
        spawn_hitl_popup(handle);
    }

    info!(
        "[HITL] HTTP request {} suspended — waiting up to 30s for user decision...",
        request_id
    );

    // Suspend this async task until the user responds or we time out.
    // Timeout is 30s (down from 90s) to avoid long hangs in Claude Code.
    // On timeout or channel drop, ALLOW the request to prevent blocking the user.
    match tokio::time::timeout(std::time::Duration::from_secs(30), rx).await {
        Ok(Ok(user_decision)) => {
            info!("[HITL] User resolved {}: {:?}", request_id, user_decision);
            user_decision
        }
        Ok(Err(_)) => {
            warn!(
                "[HITL] Oneshot channel dropped for {}. Allowing request to prevent hang.",
                request_id
            );
            ProxyDecision::Allow
        }
        Err(_) => {
            warn!(
                "[HITL] Timeout for {}. Allowing request to prevent hang.",
                request_id
            );
            ctx.hitl_channels.lock().unwrap().remove(&request_id);
            ProxyDecision::Allow
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Local PII analysis engine (mirrors extension regexEngine.ts)
// ─────────────────────────────────────────────────────────────────────────────

/// A single PII match found by local regex analysis.
#[derive(Debug, Clone, serde::Serialize)]
pub struct LocalMatch {
    pub pattern_name: String,
    pub category: String,
    pub severity: String,
    pub masked_text: String,
}

/// Result of local PII analysis on a text.
#[derive(Debug, Clone)]
pub struct LocalAnalysisResult {
    pub has_matches: bool,
    pub matches: Vec<LocalMatch>,
    pub redacted_text: String,
}

/// Pattern definition for local PII detection.
struct PiiPattern {
    name: &'static str,
    category: &'static str,
    severity: &'static str,
    regex: &'static str,
    replacement: &'static str,
    /// If true, run Luhn validation on the match
    luhn_check: bool,
}

const PII_PATTERNS: &[PiiPattern] = &[
    PiiPattern {
        name: "Credit Card",
        category: "Financial",
        severity: "CRITICAL",
        regex: r"\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{1,7}\b",
        replacement: "[CREDIT_CARD_NUMBER]",
        luhn_check: true,
    },
    PiiPattern {
        name: "US Social Security Number",
        category: "PII",
        severity: "CRITICAL",
        regex: r"\b\d{3}[\s\-]\d{2}[\s\-]\d{4}\b",
        replacement: "[SSN]",
        luhn_check: false,
    },
    PiiPattern {
        name: "Email Address",
        category: "PII",
        severity: "HIGH",
        regex: r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b",
        replacement: "[EMAIL_ADDRESS]",
        luhn_check: false,
    },
    PiiPattern {
        name: "Phone Number",
        category: "PII",
        severity: "MEDIUM",
        regex: r"\b(\+?1[\s\-]?)?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{4}\b",
        replacement: "[PHONE_NUMBER]",
        luhn_check: false,
    },
    PiiPattern {
        name: "API Key",
        category: "Credentials",
        severity: "CRITICAL",
        regex: r"\b(sk-[a-zA-Z0-9\-_]{20,}|key-[a-zA-Z0-9\-_]{20,}|AKIA[0-9A-Z]{16})\b",
        replacement: "[API_KEY]",
        luhn_check: false,
    },
    PiiPattern {
        name: "IBAN",
        category: "Financial",
        severity: "HIGH",
        regex: r"\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}([A-Z0-9]?){0,16}\b",
        replacement: "[IBAN]",
        luhn_check: false,
    },
    PiiPattern {
        name: "IPv4 Address",
        category: "Infrastructure",
        severity: "MEDIUM",
        regex: r"\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b",
        replacement: "[IP_ADDRESS]",
        luhn_check: false,
    },
];

/// Run local PII analysis on text. Returns match metadata + redacted text.
/// This runs BEFORE the backend call so the decision matrix can use local
/// PII detection even when the backend is slow or unavailable.
///
/// Uses hardcoded PII_PATTERNS + optional tenant patterns from the backend.
fn analyze_locally(text: &str) -> LocalAnalysisResult {
    analyze_locally_with_patterns(text, &[])
}

/// Check if a matched string is a false positive for the given pattern.
/// Returns true if the match should be IGNORED (it's not real PII).
fn is_false_positive(pattern_name: &str, matched_text: &str, full_text: &str) -> bool {
    match pattern_name {
        "Email Address" => {
            // Ignore emails that look like code references: user@example.com, noreply@, etc.
            let lower = matched_text.to_lowercase();
            lower.ends_with("@example.com")
                || lower.ends_with("@example.org")
                || lower.ends_with("@example.net")
                || lower.ends_with("@localhost")
                || lower.ends_with("@test.com")
                || lower.contains("noreply@")
                || lower.contains("no-reply@")
                || lower.contains("user@")
                || lower.contains("foo@")
                || lower.contains("bar@")
                || lower.contains("test@")
                || lower.contains("admin@")
                || lower.contains("placeholder")
        }
        "Phone Number" => {
            // Require at least one separator (space, dash, paren) to avoid matching
            // plain 10-digit numbers that appear in code (timestamps, IDs, ports, etc.)
            let has_separator = matched_text.contains('-')
                || matched_text.contains(' ')
                || matched_text.contains('(')
                || matched_text.starts_with('+');
            if !has_separator {
                return true; // 10 consecutive digits without separators = not a phone
            }
            // Ignore if surrounded by code-like context (hex, dots, colons)
            if let Some(pos) = full_text.find(matched_text) {
                let before = if pos > 0 { full_text.as_bytes().get(pos - 1).copied() } else { None };
                let after = full_text.as_bytes().get(pos + matched_text.len()).copied();
                // Adjacent to hex chars, dots, colons = likely not a phone
                if matches!(before, Some(b'x') | Some(b'X') | Some(b'.') | Some(b':'))
                    || matches!(after, Some(b'.') | Some(b':') | Some(b'x') | Some(b'X'))
                {
                    return true;
                }
            }
            false
        }
        "IPv4 Address" => {
            // Ignore private/reserved IP ranges and common non-sensitive IPs
            let lower = matched_text.to_string();
            lower.starts_with("127.")
                || lower.starts_with("0.")
                || lower.starts_with("10.")
                || lower.starts_with("192.168.")
                || lower.starts_with("172.16.")
                || lower.starts_with("172.17.")
                || lower.starts_with("172.18.")
                || lower.starts_with("172.19.")
                || lower.starts_with("172.2")
                || lower.starts_with("172.3")
                || lower == "255.255.255.255"
                || lower == "255.255.255.0"
                || lower == "0.0.0.0"
        }
        "US Social Security Number" => {
            // SSN cannot start with 000, 666, or 9xx
            let digits: String = matched_text.chars().filter(|c| c.is_ascii_digit()).collect();
            if digits.len() == 9 {
                let area: u32 = digits[..3].parse().unwrap_or(0);
                if area == 0 || area == 666 || area >= 900 {
                    return true;
                }
                // Middle group cannot be 00, last group cannot be 0000
                let group: u32 = digits[3..5].parse().unwrap_or(0);
                let serial: u32 = digits[5..9].parse().unwrap_or(0);
                if group == 0 || serial == 0 {
                    return true;
                }
            }
            false
        }
        "IBAN" => {
            // IBAN must be at least 15 chars; ignore short matches that are likely random strings
            matched_text.len() < 15
        }
        _ => false,
    }
}

/// Full local analysis with optional tenant-specific patterns from the backend.
fn analyze_locally_with_patterns(text: &str, tenant_patterns: &[TenantPattern]) -> LocalAnalysisResult {
    let mut matches = Vec::new();
    let mut redacted = text.to_string();

    // Phase 1: Run hardcoded PII patterns
    for pat in PII_PATTERNS {
        let re = match regex::Regex::new(pat.regex) {
            Ok(r) => r,
            Err(_) => continue,
        };

        let found: Vec<String> = re
            .find_iter(&redacted)
            .map(|m| m.as_str().to_string())
            .collect();

        let mut pattern_had_real_match = false;
        for matched_text in &found {
            if pat.luhn_check {
                let digits: String = matched_text.chars().filter(|c| c.is_ascii_digit()).collect();
                if !validate_luhn(&digits) {
                    continue;
                }
            }

            // Skip false positives
            if is_false_positive(pat.name, matched_text, text) {
                debug!("[Proxy] Skipping false positive for '{}': {}", pat.name, mask_sensitive(matched_text));
                continue;
            }

            pattern_had_real_match = true;
            matches.push(LocalMatch {
                pattern_name: pat.name.to_string(),
                category: pat.category.to_string(),
                severity: pat.severity.to_string(),
                masked_text: mask_sensitive(matched_text),
            });
        }

        // Only redact if there were real (non-false-positive) matches for this pattern
        if pattern_had_real_match {
            redacted = re.replace_all(&redacted, pat.replacement).to_string();
        }
    }

    // Phase 2: Run tenant-specific patterns from the backend
    for tp in tenant_patterns {
        let mut flags = String::new();
        if !tp.case_sensitive {
            flags.push('i');
        }
        if tp.multiline {
            flags.push('m');
        }

        let pattern = if flags.is_empty() {
            tp.regex.clone()
        } else {
            format!("(?{}){}", flags, tp.regex)
        };

        let re = match regex::Regex::new(&pattern) {
            Ok(r) => r,
            Err(e) => {
                debug!("[Proxy] Invalid tenant pattern '{}': {}", tp.name, e);
                continue;
            }
        };

        let found: Vec<String> = re
            .find_iter(&redacted)
            .map(|m| m.as_str().to_string())
            .collect();

        for matched_text in &found {
            matches.push(LocalMatch {
                pattern_name: tp.name.clone(),
                category: tp.category.clone(),
                severity: tp.severity.clone(),
                masked_text: mask_sensitive(matched_text),
            });
        }

        let replacement = format!("[{}]", tp.name.to_uppercase().replace(' ', "_"));
        redacted = re.replace_all(&redacted, replacement.as_str()).to_string();
    }

    LocalAnalysisResult {
        has_matches: !matches.is_empty(),
        matches,
        redacted_text: redacted,
    }
}

/// Luhn algorithm for credit card validation (matches extension's validateLuhn).
fn validate_luhn(digits: &str) -> bool {
    if digits.len() < 13 || digits.len() > 19 {
        return false;
    }
    if !digits.chars().all(|c| c.is_ascii_digit()) {
        return false;
    }

    let mut sum = 0u32;
    let mut is_even = false;

    for ch in digits.chars().rev() {
        let mut digit = ch.to_digit(10).unwrap();
        if is_even {
            digit *= 2;
            if digit > 9 {
                digit -= 9;
            }
        }
        sum += digit;
        is_even = !is_even;
    }

    sum % 10 == 0
}

/// Mask sensitive data for display (show first 3 + last 3 chars).
/// Matches extension's maskSensitiveData().
fn mask_sensitive(text: &str) -> String {
    if text.len() <= 8 {
        return "***".to_string();
    }
    let start: String = text.chars().take(3).collect();
    let end: String = text.chars().rev().take(3).collect::<Vec<_>>().into_iter().rev().collect();
    format!("{}...{}", start, end)
}

/// Log a governance event to the Onefend backend.
/// Uses a dedup guard to prevent duplicate events from concurrent requests
/// (Claude Code sends 2+ API calls per prompt; only log once).
/// Log a governance event with enriched context from both backend and local analysis.
/// Mirrors the extension's logDecisionEvent() / logNetworkEvent() field set.
async fn log_event(
    ctx: &ProxyContext,
    action: &str,
    text: &str,
    backend_resp: &Option<AnalyzeResponse>,
    local_result: &Option<LocalAnalysisResult>,
    platform: &str,
    domain: &str,
) {
    // Dedup: skip if we just logged the same action for the same text (within 5s)
    {
        use std::sync::OnceLock;
        use std::sync::Mutex as StdMutex;
        static LAST_LOG: OnceLock<StdMutex<(String, std::time::Instant)>> = OnceLock::new();
        let guard = LAST_LOG.get_or_init(|| {
            StdMutex::new((String::new(), std::time::Instant::now() - std::time::Duration::from_secs(60)))
        });
        let mut last = guard.lock().unwrap();
        let key = format!("{}:{}", action, &text[..text.len().min(100)]);
        if last.0 == key && last.1.elapsed() < std::time::Duration::from_secs(5) {
            debug!("[Proxy] Skipping duplicate event log: {}", action);
            return;
        }
        *last = (key, std::time::Instant::now());
    }

    let (device_token, device_id, configured) = {
        let config = ctx.config.lock().unwrap();
        (
            config.device_token.clone(),
            config.device_id.clone().unwrap_or_else(|| "unknown".to_string()),
            config.is_configured(),
        )
    };

    if !configured {
        return;
    }

    let token = match device_token {
        Some(t) => t,
        None => return,
    };

    // Original risk level from backend
    let original_risk = backend_resp
        .as_ref()
        .and_then(|r| r.risk_level.as_deref())
        .unwrap_or("LOW");

    // Calculate residual risk (matches extension's calculateResidualRisk)
    let residual_risk = match action {
        "BLOCK" | "CLEAR_TEXT" => "LOW",
        "REDACTED_SEND" => match original_risk {
            "CRITICAL" => "HIGH",
            "HIGH" => "MEDIUM",
            _ => "LOW",
        },
        "USER_OVERRIDE" => original_risk,
        _ => original_risk,
    };

    // Data types from local matches (PII type names)
    let data_types: Vec<String> = local_result
        .as_ref()
        .map(|lr| {
            let mut types: Vec<String> = lr.matches.iter()
                .map(|m| m.pattern_name.clone())
                .collect();
            types.dedup();
            types
        })
        .filter(|t| !t.is_empty())
        .unwrap_or_else(|| {
            backend_resp.as_ref()
                .and_then(|r| r.category.as_ref())
                .map(|c| vec![c.clone()])
                .unwrap_or_else(|| vec!["Unknown".to_string()])
        });

    // Analysis source
    let analysis_source = if local_result.as_ref().map_or(false, |lr| lr.has_matches) {
        "LOCAL_REGEX"
    } else {
        "AI_GATEWAY"
    };

    // Pattern matches (local match details for audit trail)
    let pattern_matches = local_result
        .as_ref()
        .filter(|lr| !lr.matches.is_empty())
        .map(|lr| serde_json::json!({ "matches": lr.matches }))
        .unwrap_or_else(|| serde_json::json!({}));

    let has_pii = local_result.as_ref().map_or(false, |lr| lr.has_matches)
        || (action != "ALLOWED" && action != "CLEAR_TEXT");

    info!(
        "[Proxy] Logging event: action={} risk={} source={} types={:?}",
        action, residual_risk, analysis_source, data_types
    );

    let event = LogEventRequest {
        device_id: device_id.clone(),
        platform: platform.to_string(),
        action: action.to_string(),
        risk_level: residual_risk.to_string(),
        sensitive_data_detected: has_pii,
        data_types,
        input_length: text.len(),
        analysis_source: analysis_source.to_string(),
        confidence: backend_resp.as_ref()
            .and_then(|r| r.risk_score.map(|s| s as f32 / 100.0))
            .unwrap_or(0.9),
        user_override: if action == "USER_OVERRIDE" || action == "WARNED_PROCEED" || action == "CLEAR_TEXT" {
            Some(true)
        } else {
            None
        },
        justification: None,
        evidence: None,
        ai_category: backend_resp.as_ref().and_then(|r| r.category.clone()),
        ai_risk_level: backend_resp.as_ref().and_then(|r| r.risk_level.clone()),
        ai_summary: backend_resp.as_ref().and_then(|r| r.summary.clone()),
        domain: Some(domain.to_string()),
        conversation_id: Some(ctx.session_id.clone()),
        pattern_matches,
    };

    let client = ctx.api_client.read().unwrap().clone();
    match client.log_event(&token, event).await {
        Ok(_) => debug!("[Proxy] Event logged"),
        Err(e) => {
            debug!("[Proxy] Immediate log failed ({}). Queuing.", e);
            // Rebuild for queue
            let queued = LogEventRequest {
                device_id: device_id.clone(),
                platform: platform.to_string(),
                action: action.to_string(),
                risk_level: residual_risk.to_string(),
                sensitive_data_detected: has_pii,
                data_types: vec!["AI_PROMPT".to_string()],
                input_length: text.len(),
                analysis_source: analysis_source.to_string(),
                confidence: 0.9,
                user_override: None,
                justification: None,
                evidence: None,
                ai_category: backend_resp.as_ref().and_then(|r| r.category.clone()),
                ai_risk_level: backend_resp.as_ref().and_then(|r| r.risk_level.clone()),
                ai_summary: None,
                domain: Some(domain.to_string()),
                conversation_id: Some(ctx.session_id.clone()),
                pattern_matches: serde_json::json!({}),
            };
            if let Ok(q) = ctx.queue.lock() {
                if let Err(qe) = q.enqueue(queued) {
                    warn!("[Proxy] Failed to queue audit event: {}", qe);
                }
            }
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_connect_valid() {
        let req = "CONNECT api.anthropic.com:443 HTTP/1.1\r\nHost: api.anthropic.com:443\r\n\r\n";
        let result = parse_connect_request(req);
        assert_eq!(result, Some(("api.anthropic.com".to_string(), 443)));
    }

    #[test]
    fn test_parse_connect_invalid() {
        let req = "GET / HTTP/1.1\r\nHost: example.com\r\n\r\n";
        assert_eq!(parse_connect_request(req), None);
    }

    #[test]
    fn test_extract_prompt_simple_string() {
        let body = r#"{"model":"claude-opus-4-5","messages":[{"role":"user","content":"Tell me about Rust"}],"max_tokens":1024}"#;
        let result = extract_prompt_from_anthropic_body(body);
        assert_eq!(result, Some("Tell me about Rust".to_string()));
    }

    #[test]
    fn test_extract_prompt_content_blocks() {
        let body = r#"{
            "model": "claude-opus-4-5",
            "messages": [{
                "role": "user",
                "content": [
                    {"type": "text", "text": "Analyze this code:"},
                    {"type": "text", "text": "fn main() {}"}
                ]
            }],
            "max_tokens": 1024
        }"#;
        let result = extract_prompt_from_anthropic_body(body);
        assert_eq!(result, Some("Analyze this code:\nfn main() {}".to_string()));
    }

    #[test]
    fn test_extract_prompt_gets_last_user_message() {
        let body = r#"{
            "messages": [
                {"role": "user", "content": "First question"},
                {"role": "assistant", "content": "Previous answer"},
                {"role": "user", "content": "Follow-up question"}
            ]
        }"#;
        let result = extract_prompt_from_anthropic_body(body);
        // Should only return the LAST user message, not all of them
        assert_eq!(result, Some("Follow-up question".to_string()));
    }

    #[test]
    fn test_extract_prompt_ignores_system_reminders() {
        let body = r#"{
            "messages": [
                {"role": "user", "content": "<system-reminder>tool info</system-reminder>\nReal prompt here"},
                {"role": "assistant", "content": "response"},
                {"role": "user", "content": "My actual new prompt"}
            ]
        }"#;
        let result = extract_prompt_from_anthropic_body(body);
        assert_eq!(result, Some("My actual new prompt".to_string()));
    }

    #[test]
    fn test_extract_prompt_empty_body() {
        assert_eq!(extract_prompt_from_anthropic_body(""), None);
        assert_eq!(extract_prompt_from_anthropic_body("{}"), None);
    }

    #[test]
    fn test_rebuild_anthropic_body_redacts_all_messages() {
        // Simulates conversation history: first message has PII, second is clean
        let body = r#"{"model":"claude-opus-4-5","messages":[
            {"role":"user","content":"My card is 4111111111111111"},
            {"role":"assistant","content":"I see a card number"},
            {"role":"user","content":"What type of card is that?"}
        ]}"#;
        let rebuilt = rebuild_anthropic_body(body, "");
        let json: serde_json::Value = serde_json::from_str(&rebuilt).unwrap();
        // First user message should be redacted
        let first = json["messages"][0]["content"].as_str().unwrap();
        assert!(first.contains("[CREDIT_CARD_NUMBER]"), "First message should be redacted: {}", first);
        assert!(!first.contains("4111111111111111"), "Original card should be gone");
        // Second user message (clean) should be unchanged
        let second = json["messages"][2]["content"].as_str().unwrap();
        assert_eq!(second, "What type of card is that?");
    }

    // ── OpenAI format tests ───────────────────────────────────────────

    #[test]
    fn test_openai_extract_prompt_simple() {
        let body = r#"{"model":"gpt-4","messages":[{"role":"user","content":"Explain Rust ownership"}],"max_tokens":1024}"#;
        let result = extract_prompt_from_openai_body(body);
        assert_eq!(result, Some("Explain Rust ownership".to_string()));
    }

    #[test]
    fn test_openai_extract_prompt_gets_last_user_message() {
        let body = r#"{"messages":[
            {"role":"user","content":"First question"},
            {"role":"assistant","content":"Answer"},
            {"role":"user","content":"Follow-up"}
        ]}"#;
        let result = extract_prompt_from_openai_body(body);
        assert_eq!(result, Some("Follow-up".to_string()));
    }

    #[test]
    fn test_openai_extract_prompt_empty() {
        assert_eq!(extract_prompt_from_openai_body(""), None);
        assert_eq!(extract_prompt_from_openai_body("{}"), None);
    }

    #[test]
    fn test_openai_rebuild_body_redacts_pii() {
        let body = r#"{"model":"gpt-4","messages":[
            {"role":"user","content":"My card is 4111111111111111"},
            {"role":"assistant","content":"I see a card"},
            {"role":"user","content":"What type?"}
        ]}"#;
        let rebuilt = rebuild_openai_body(body, "");
        let json: serde_json::Value = serde_json::from_str(&rebuilt).unwrap();
        let first = json["messages"][0]["content"].as_str().unwrap();
        assert!(first.contains("[CREDIT_CARD_NUMBER]"));
        assert!(!first.contains("4111111111111111"));
        let second = json["messages"][2]["content"].as_str().unwrap();
        assert_eq!(second, "What type?");
    }

    // ── Domain classification tests ─────────────────────────────────

    #[test]
    fn test_classify_domain_anthropic() {
        assert_eq!(classify_domain("api.anthropic.com"), Some(InterceptMode::FullIntercept(AiApiFormat::Anthropic)));
    }

    #[test]
    fn test_classify_domain_openai() {
        assert_eq!(classify_domain("api.openai.com"), Some(InterceptMode::FullIntercept(AiApiFormat::OpenAi)));
    }

    #[test]
    fn test_classify_domain_codeium() {
        assert_eq!(classify_domain("api.codeium.com"), Some(InterceptMode::FullIntercept(AiApiFormat::OpenAi)));
        assert_eq!(classify_domain("server.codeium.com"), Some(InterceptMode::FullIntercept(AiApiFormat::OpenAi)));
    }

    #[test]
    fn test_classify_domain_passthrough() {
        assert_eq!(classify_domain("google.com"), None);
        assert_eq!(classify_domain("github.com"), None);
    }

    #[test]
    fn test_platform_labels() {
        assert_eq!(platform_label("api.anthropic.com"), "claude");
        assert_eq!(platform_label("api.openai.com"), "openai");
        assert_eq!(platform_label("api.codeium.com"), "windsurf-codeium");
        assert_eq!(platform_label("random.com"), "unknown-ai");
    }

    #[test]
    fn test_split_http_headers_body() {
        let raw =
            "POST /v1/messages HTTP/1.1\r\nContent-Type: application/json\r\n\r\n{\"key\":\"val\"}";
        let (headers, body) = split_http_headers_body(raw);
        assert!(headers.contains("Content-Type"));
        assert_eq!(body, "{\"key\":\"val\"}");
    }

    #[test]
    fn test_ca_generation() {
        let ca = get_or_create_ca().unwrap();
        assert!(!ca.cert_der.is_empty());
        assert!(ca.cert_pem.contains("CERTIFICATE"));
        assert!(ca.key_pem.contains("PRIVATE KEY"));
    }

    #[test]
    fn test_leaf_cert_for_domain() {
        // rustls requires a CryptoProvider to be installed before building TLS configs.
        // In production this is set up by the tokio/tauri runtime; in tests we set it explicitly.
        let _ = rustls::crypto::ring::default_provider().install_default();

        let config = build_server_tls_config("api.anthropic.com");
        assert!(
            config.is_ok(),
            "Leaf cert generation failed: {:?}",
            config.err()
        );
    }

    // ── Decision matrix tests ────────────────────────────────────────────

    #[test]
    fn test_matrix_block_from_backend() {
        let resp = AnalyzeResponse {
            action: Some("BLOCK".to_string()),
            recommendation: None,
            risk_score: Some(95),
            risk_level: Some("CRITICAL".to_string()),
            category: None,
            redacted_text: None,
            reason: Some("PII detected".to_string()),
            summary: None,
        };
        let local = analyze_locally("sensitive text");
        let backend = backend_action_to_decision(&resp, "sensitive text");
        let decision = apply_decision_matrix(&local, &backend, &Some(resp));
        assert!(matches!(decision, ProxyDecision::Block { .. }));
    }

    #[test]
    fn test_matrix_pii_detected_locally() {
        // Rule 2: PII found by local regex → Redact (even if backend says allow)
        let text = "My card is 4111111111111111";
        let local = analyze_locally(text);
        assert!(local.has_matches, "Local should detect credit card");

        let resp = AnalyzeResponse {
            action: Some("ALLOW".to_string()),
            recommendation: None,
            risk_score: Some(5),
            risk_level: Some("LOW".to_string()),
            category: None,
            redacted_text: None,
            reason: None,
            summary: None,
        };
        let backend = backend_action_to_decision(&resp, text);
        let decision = apply_decision_matrix(&local, &backend, &Some(resp));
        assert!(matches!(decision, ProxyDecision::Redact { .. }));
    }

    #[test]
    fn test_matrix_low_risk_no_pii_allows() {
        // Rule 1: LOW risk + no PII → Allow
        let text = "What is 2 plus 2?";
        let local = analyze_locally(text);
        assert!(!local.has_matches);

        let resp = AnalyzeResponse {
            action: Some("ALLOW".to_string()),
            recommendation: None,
            risk_score: Some(5),
            risk_level: Some("LOW".to_string()),
            category: None,
            redacted_text: None,
            reason: None,
            summary: None,
        };
        let backend = backend_action_to_decision(&resp, text);
        let decision = apply_decision_matrix(&local, &backend, &Some(resp));
        assert!(matches!(decision, ProxyDecision::Allow));
    }

    #[test]
    fn test_matrix_high_risk_no_pii_warns() {
        // Rule 3: HIGH risk + no PII → Warn
        let text = "Here is our Q3 revenue: $4.2M from LATAM";
        let local = analyze_locally(text);
        assert!(!local.has_matches);

        let resp = AnalyzeResponse {
            action: None,
            recommendation: None,
            risk_score: Some(80),
            risk_level: Some("HIGH".to_string()),
            category: Some("Financial Data".to_string()),
            redacted_text: None,
            reason: None,
            summary: None,
        };
        let backend = backend_action_to_decision(&resp, text);
        let decision = apply_decision_matrix(&local, &backend, &Some(resp));
        assert!(matches!(decision, ProxyDecision::Warn { .. }));
    }

    // ── Local analysis tests ─────────────────────────────────────────────

    #[test]
    fn test_local_detects_credit_card() {
        let result = analyze_locally("Card 4111111111111111 here");
        assert!(result.has_matches);
        assert_eq!(result.matches[0].pattern_name, "Credit Card");
        assert!(result.redacted_text.contains("[CREDIT_CARD_NUMBER]"));
    }

    #[test]
    fn test_local_detects_email() {
        let result = analyze_locally("Contact john@acme.com please");
        assert!(result.has_matches);
        assert_eq!(result.matches[0].pattern_name, "Email Address");
        assert!(result.redacted_text.contains("[EMAIL_ADDRESS]"));
    }

    #[test]
    fn test_local_detects_ssn() {
        let result = analyze_locally("SSN 123-45-6789");
        assert!(result.has_matches);
        assert_eq!(result.matches[0].pattern_name, "US Social Security Number");
    }

    #[test]
    fn test_local_detects_api_key() {
        let result = analyze_locally("Token: sk-ant-api-abcdef1234567890abcdef");
        assert!(result.has_matches);
        assert_eq!(result.matches[0].pattern_name, "API Key");
    }

    #[test]
    fn test_local_no_false_positive_on_clean_text() {
        let result = analyze_locally("What is the capital of France?");
        assert!(!result.has_matches);
        assert!(result.matches.is_empty());
    }

    #[test]
    fn test_luhn_validation() {
        assert!(validate_luhn("4111111111111111")); // valid Visa test
        assert!(validate_luhn("5500000000000004")); // valid MC test
        assert!(!validate_luhn("1234567890123456")); // invalid
        assert!(!validate_luhn("123")); // too short
    }

    #[test]
    fn test_mask_sensitive() {
        assert_eq!(mask_sensitive("4111111111111111"), "411...111");
        assert_eq!(mask_sensitive("short"), "***");
        assert_eq!(mask_sensitive("john@acme.com"), "joh...com");
    }

    #[tokio::test]
    async fn test_read_full_http_request_small() {
        let raw = b"POST /v1/messages HTTP/1.1\r\nContent-Length: 13\r\n\r\n{\"key\":\"val\"}";
        let mut cursor = std::io::Cursor::new(raw.to_vec());
        let result = read_full_http_request(&mut cursor).await.unwrap();
        let text = String::from_utf8_lossy(&result);
        assert!(text.contains("Content-Length: 13"));
        assert!(text.ends_with("{\"key\":\"val\"}"));
    }

    #[tokio::test]
    async fn test_read_full_http_request_large_body() {
        // Simulate a body larger than a single read chunk
        let body = "x".repeat(100_000);
        let raw = format!(
            "POST /v1/messages HTTP/1.1\r\nContent-Length: {}\r\n\r\n{}",
            body.len(),
            body
        );
        let mut cursor = std::io::Cursor::new(raw.into_bytes());
        let result = read_full_http_request(&mut cursor).await.unwrap();
        let text = String::from_utf8_lossy(&result);
        assert!(text.ends_with(&"x".repeat(100)));
        // Verify we got the full body
        let (_, body_str) = split_http_headers_body(&text);
        assert_eq!(body_str.len(), 100_000);
    }

    #[tokio::test]
    async fn test_read_full_http_request_empty_stream() {
        let mut cursor = std::io::Cursor::new(Vec::<u8>::new());
        let result = read_full_http_request(&mut cursor).await.unwrap();
        assert!(result.is_empty());
    }

    #[test]
    fn test_find_header_end() {
        assert_eq!(find_header_end(b"GET / HTTP/1.1\r\n\r\nbody"), Some(18));
        assert_eq!(find_header_end(b"no delimiter here"), None);
        assert_eq!(find_header_end(b"\r\n\r\n"), Some(4));
    }
}
