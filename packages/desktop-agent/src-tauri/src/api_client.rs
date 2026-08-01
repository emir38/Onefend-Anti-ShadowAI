use anyhow::{Context, Result};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Duration;
use tracing::{debug, error, info};

#[derive(Clone)]
pub struct ApiClient {
    client: Client,
    base_url: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RegisterDeviceRequest {
    pub enrollment_token: String,
    pub identifier: String,
    pub device_info: DeviceInfo,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceInfo {
    pub hostname: String,
    pub os: String,
    pub arch: String,
    pub version: String,
    #[serde(rename = "type")]
    pub agent_type: String,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RegisterDeviceResponse {
    pub success: bool,
    pub token: String,
    pub device_id: String,
    pub user_id: String,
}

#[derive(Serialize)]
pub struct HeartbeatRequest {
    pub hostname: String,
    pub status: String, // e.g., "active", "idle", "monitoring"
    pub version: String,
}

/// A sensitive data pattern from the backend tenant config.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TenantPattern {
    pub name: String,
    pub category: String,
    pub severity: String,
    pub regex: String,
    pub action: String,
    pub case_sensitive: bool,
    pub multiline: bool,
}

#[derive(Deserialize, Debug, Clone, PartialEq)]
pub struct PolicyConfig {
    pub blocked_keywords: Vec<String>,
    pub dlp_enabled: bool,
    pub monitoring_enabled: bool,
    /// BLOCKING = show modals, enforce decisions. OBSERVATION = log only, no modals.
    pub intervention_mode: String,
    /// Sensitive data patterns downloaded from the backend tenant config.
    pub tenant_patterns: Vec<TenantPattern>,
}

impl Default for PolicyConfig {
    fn default() -> Self {
        Self {
            blocked_keywords: vec![],
            dlp_enabled: false,
            monitoring_enabled: true,
            intervention_mode: "BLOCKING".to_string(),
            tenant_patterns: vec![],
        }
    }
}

#[derive(Deserialize, Debug)]
pub struct HeartbeatResponse {
    pub policies: PolicyConfig,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AnalyzeRequest {
    pub text: String,
    pub context: Option<String>,
    #[serde(default)]
    pub images: Vec<ImageInput>,
    #[serde(default)]
    pub documents: Vec<DocumentInput>,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ImageInput {
    pub mime_type: String,
    pub data: String,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DocumentInput {
    pub mime_type: String,
    pub data: String,
    pub filename: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AnalyzeResponse {
    pub action: Option<String>,         // ALLOW, REDACT, WARN, BLOCK
    pub recommendation: Option<String>, // WARN_CONTEXT, BLOCK_CONTEXT etc.
    pub risk_score: Option<i32>,
    pub risk_level: Option<String>, // LOW, MEDIUM, HIGH, CRITICAL
    pub category: Option<String>,
    pub redacted_text: Option<String>,
    pub reason: Option<String>,
    pub summary: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct LogEventRequest {
    pub device_id: String,
    pub platform: String,
    pub action: String,
    pub risk_level: String,
    #[serde(default)]
    pub sensitive_data_detected: bool,
    pub data_types: Vec<String>,
    pub input_length: usize,
    pub analysis_source: String,
    pub confidence: f32,
    // Optional fields
    pub user_override: Option<bool>,
    pub justification: Option<String>,
    pub evidence: Option<String>,
    pub ai_category: Option<String>,
    pub ai_risk_level: Option<String>,
    pub ai_summary: Option<String>,
    pub domain: Option<String>,
    pub conversation_id: Option<String>,
    #[serde(default = "default_pattern_matches")]
    pub pattern_matches: serde_json::Value,
}

fn default_pattern_matches() -> serde_json::Value {
    serde_json::json!({})
}

impl ApiClient {
    pub fn new(base_url: String) -> Self {
        ApiClient {
            client: Client::new(),
            base_url,
        }
    }

    pub fn set_base_url(&mut self, url: String) {
        self.base_url = url;
    }

    pub async fn register_device(
        &self,
        request: RegisterDeviceRequest,
    ) -> Result<RegisterDeviceResponse> {
        let url = format!("{}/devices/register", self.base_url);
        info!("Registering device at {}...", url);

        let response = self
            .client
            .post(&url)
            .json(&request)
            .send()
            .await
            .context("Failed to send register device request")?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            anyhow::bail!("Registration failed: {}", error_text);
        }

        let data = response
            .json::<RegisterDeviceResponse>()
            .await
            .context("Failed to parse register response")?;

        Ok(data)
    }

    pub async fn send_heartbeat(
        &self,
        token: &str,
        _request: HeartbeatRequest,
    ) -> Result<HeartbeatResponse> {
        // Backend endpoint: GET /config (Triggers heartbeat side-effect in backend)
        let url = format!("{}/config", self.base_url);
        // debug!("Fetching config (Heartbeat)...");

        let response = self
            .client
            .get(&url)
            .header("Authorization", format!("Bearer {}", token))
            .send()
            .await
            .context("Failed to send heartbeat/config request")?;

        if !response.status().is_success() {
            let status_code = response.status();
            let error_text = response.text().await.unwrap_or_default();
            // 401 means token expired/revoked -> returning error will trigger config nuke in main.rs
            anyhow::bail!("Heartbeat failed ({}): {}", status_code, error_text);
        }

        let config_data = response
            .json::<ConfigResponse>()
            .await
            .context("Failed to parse config response")?;

        // Map Backend Config to Agent PolicyConfig
        // The injector currently expects simple keywords.
        // We map regex patterns to keywords. Ideally IDLP should handle regex.
        let blocked_keywords: Vec<String> = config_data
            .patterns
            .iter()
            .filter(|p| p.action == "BLOCK" || p.action == "WARN") // Only blocking/warning patterns
            .map(|p| p.regex.clone())
            .collect();

        // Determine flags from tenant settings or defaults
        let dlp_enabled = config_data
            .tenant_settings
            .get("dlpEnabled")
            .and_then(|v| v.as_bool())
            .unwrap_or(!config_data.patterns.is_empty()); // Default to true if patterns exist

        let monitoring_enabled = config_data
            .tenant_settings
            .get("monitoringEnabled")
            .and_then(|v| v.as_bool())
            .or_else(|| {
                config_data
                    .tenant_settings
                    .get("enableNotifications")
                    .and_then(|v| v.as_bool())
            })
            .unwrap_or(true);

        let intervention_mode = config_data
            .tenant_settings
            .get("interventionMode")
            .and_then(|v| v.as_str())
            .unwrap_or("BLOCKING")
            .to_string();

        // Convert backend patterns to TenantPattern with full metadata
        let tenant_patterns: Vec<TenantPattern> = config_data
            .patterns
            .iter()
            .map(|p| TenantPattern {
                name: p.name.clone().unwrap_or_else(|| "Custom Pattern".to_string()),
                category: p.category.clone().unwrap_or_else(|| "Custom".to_string()),
                severity: p.severity.clone().unwrap_or_else(|| "HIGH".to_string()),
                regex: p.regex.clone(),
                action: p.action.clone(),
                case_sensitive: p.case_sensitive.unwrap_or(false),
                multiline: p.multiline.unwrap_or(false),
            })
            .collect();

        if !tenant_patterns.is_empty() {
            info!(
                "[Config] Loaded {} tenant patterns from backend",
                tenant_patterns.len()
            );
        }

        Ok(HeartbeatResponse {
            policies: PolicyConfig {
                blocked_keywords,
                dlp_enabled,
                monitoring_enabled,
                intervention_mode,
                tenant_patterns,
            },
        })
    }

    pub async fn analyze_prompt(
        &self,
        token: &str,
        request: AnalyzeRequest,
    ) -> Result<AnalyzeResponse> {
        // Backend endpoint: POST /ai-analysis
        let url = format!("{}/ai-analysis", self.base_url);
        debug!("Sending prompt for analysis to {}...", url);

        let response = self
            .client
            .post(&url)
            .header("Authorization", format!("Bearer {}", token))
            .json(&request)
            .send()
            .await
            .context("Failed to send analysis request")?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            anyhow::bail!("Analysis failed ({}) : {}", status, error_text);
        }

        let body_text = response
            .text()
            .await
            .context("Failed to read analysis response body")?;

        let data = match serde_json::from_str::<AnalyzeResponse>(&body_text) {
            Ok(d) => d,
            Err(e) => {
                error!("Failed to parse analysis JSON. Raw Body: '{}'", body_text);
                return Err(anyhow::anyhow!(
                    "Failed to parse analysis response: {} | Body: {}",
                    e,
                    body_text
                ));
            }
        };

        Ok(data)
    }

    pub async fn log_event(&self, token: &str, event: LogEventRequest) -> Result<()> {
        let url = format!("{}/conversation-events", self.base_url);
        debug!("Logging event to {}...", url);

        let response = self
            .client
            .post(&url)
            .header("Authorization", format!("Bearer {}", token))
            .json(&event)
            .send()
            .await
            .context("Failed to send log event request")?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            // We generally don't want to crash on log log failure, but we return Err so caller knows
            anyhow::bail!("Log event failed ({}) : {}", status, error_text);
        }

        Ok(())
    }

    /// Renew the device token before it expires.
    /// Returns the new token if renewed, None if still valid.
    pub async fn renew_token(&self, token: &str) -> Result<Option<String>> {
        let url = format!("{}/auth/renew-token", self.base_url);

        let response = self
            .client
            .post(&url)
            .header("Authorization", format!("Bearer {}", token))
            .send()
            .await
            .context("Failed to send token renewal request")?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            anyhow::bail!("Token renewal failed ({}): {}", status, error_text);
        }

        #[derive(Deserialize)]
        struct RenewResponse {
            renewed: bool,
            token: Option<String>,
        }

        let resp: RenewResponse = response.json().await.context("Failed to parse renewal response")?;

        if resp.renewed {
            Ok(resp.token)
        } else {
            Ok(None)
        }
    }
}

// Internal structs for mapping Backend Config Response
#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
struct ConfigResponse {
    #[allow(dead_code)]
    applications: Vec<BackendApplication>,
    #[allow(dead_code)]
    policies: Vec<BackendPolicy>,
    patterns: Vec<BackendPattern>,
    #[allow(dead_code)]
    default_action: String,
    #[allow(dead_code)]
    sync_interval: u64,
    #[allow(dead_code)]
    excluded_domains: Vec<String>,
    tenant_settings: serde_json::Value,
}

#[derive(Deserialize, Debug)]
struct BackendApplication {
    #[allow(dead_code)]
    domain: String,
    #[allow(dead_code)]
    action: String,
}

#[derive(Deserialize, Debug)]
#[allow(dead_code)]
struct BackendPolicy {
    domain: String,
    action: String,
}

#[derive(Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
struct BackendPattern {
    regex: String,
    action: String,
    #[serde(default)]
    name: Option<String>,
    #[serde(default)]
    category: Option<String>,
    #[serde(default)]
    severity: Option<String>,
    #[serde(default)]
    case_sensitive: Option<bool>,
    #[serde(default)]
    multiline: Option<bool>,
}

#[cfg(test)]
mod integration_tests {
    use super::*;

    // This test expects mock_backend.cjs running on port 3000
    #[tokio::test]
    #[ignore]
    async fn test_register_device_integration() {
        let client = ApiClient::new("http://localhost:3000/api/v1".to_string());

        let request = RegisterDeviceRequest {
            enrollment_token: "test-integration-token".into(),
            identifier: "test-user@example.com".into(),
            device_info: DeviceInfo {
                hostname: "integration-host".into(),
                os: "linux".into(),
                arch: "x64".into(),
                version: "0.1.0".into(),
                agent_type: "desktop-integration-test".into(),
            },
        };

        match client.register_device(request).await {
            Ok(resp) => {
                println!("✅ Register Success! Got device token: {}", resp.token);
                assert!(!resp.token.is_empty());
            }
            Err(e) => panic!("❌ Register failed: {}", e),
        }
    }

    #[tokio::test]
    #[ignore]
    async fn test_heartbeat_integration() {
        let client = ApiClient::new("http://localhost:3000/api/v1".to_string());

        // We use a fake token since mock backend doesn't validate signature yet
        let token = "mock-device-jwt-token-xyz";

        let request = HeartbeatRequest {
            hostname: "integration-host".into(),
            status: "active".into(),
            version: "0.1.0".into(),
        };

        match client.send_heartbeat(token, request).await {
            Ok(resp) => {
                println!("✅ Heartbeat Success! Policies: {:?}", resp.policies);
                assert!(resp.policies.dlp_enabled);
                assert!(resp
                    .policies
                    .blocked_keywords
                    .contains(&"secret".to_string()));
            }
            Err(e) => panic!("❌ Heartbeat failed: {}", e),
        }
    }

    #[tokio::test]
    #[ignore]
    async fn test_analyze_integration() {
        let client = ApiClient::new("http://localhost:3000/api/v1".to_string());
        let token = "mock-device-jwt-token-xyz";

        let request = AnalyzeRequest {
            text: "Hello world secret123".to_string(),
            images: vec![],
            documents: vec![],
            context: Some("Desktop".to_string()),
        };

        match client.analyze_prompt(token, request).await {
            Ok(resp) => {
                println!("✅ Analyze Result: {:?}", resp);
            }
            Err(e) => panic!("❌ Analyze failed: {}", e),
        }
    }
}
