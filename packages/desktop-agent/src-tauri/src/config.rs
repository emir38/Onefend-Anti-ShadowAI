use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

/// Configuration for the Desktop Agent
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct AgentConfig {
    /// Enrollment token for device registration
    pub enrollment_token: Option<String>,

    /// Device JWT token (obtained after registration)
    pub device_token: Option<String>,

    /// API base URL (defaults to production)
    pub api_base_url: String,

    /// CDP port for ChatGPT Desktop
    pub cdp_port: u16,

    /// Monitoring enabled
    pub monitoring_enabled: bool,

    /// Registered Device ID
    pub device_id: Option<String>,

    /// User identifier (email) used during enrollment
    pub identifier: Option<String>,
}

impl Default for AgentConfig {
    fn default() -> Self {
        Self {
            enrollment_token: None,
            device_token: None,
            api_base_url: std::env::var("API_BASE_URL")
                .unwrap_or_else(|_| "http://localhost:3000/api/v1".to_string()),
            cdp_port: 9222,
            monitoring_enabled: false,
            device_id: None,
            identifier: None,
        }
    }
}

impl AgentConfig {
    /// Load configuration from disk
    pub fn load_from_disk(path: &PathBuf) -> Result<Self> {
        if !path.exists() {
            return Ok(<Self as Default>::default());
        }
        let content = fs::read_to_string(path)?;

        let mut config: Self = serde_json::from_str(&content)?;
        // Correct stale dev URLs (localhost) to production automatically
        config.sanitize_url();
        Ok(config)
    }

    /// Save configuration to disk
    pub fn save_to_disk(&self, path: &PathBuf) -> Result<()> {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }
        let content = serde_json::to_string_pretty(self)?;
        fs::write(path, content)?;
        Ok(())
    }

    /// Production backend URL — never changes unless overridden by API_BASE_URL env var
    pub const PRODUCTION_URL: &'static str = "http://localhost:3000/api/v1";

    /// Check if the api_base_url is pointing at localhost (stale dev config).
    pub fn has_localhost_url(&self) -> bool {
        self.api_base_url.contains("localhost") || self.api_base_url.contains("127.0.0.1")
    }

    /// Correct a stale localhost URL back to production.
    /// Called after loading config from disk to prevent dev configs from reaching prod.
    pub fn sanitize_url(&mut self) {
        // Only replace if NOT explicitly set via env var (dev override respected)
        if self.has_localhost_url() && std::env::var("API_BASE_URL").is_err() {
            tracing::warn!(
                "⚠️ Config has localhost URL ({}) — replacing with production URL.",
                self.api_base_url
            );
            self.api_base_url = Self::PRODUCTION_URL.to_string();
        }
    }

    /// Check if the agent is configured (has device token)
    pub fn is_configured(&self) -> bool {
        self.device_token.is_some()
    }

    /// Check if enrollment is pending (has enrollment_token but no device_token)
    pub fn is_enrollment_pending(&self) -> bool {
        self.enrollment_token.is_some() && self.device_token.is_none()
    }

    /// Validate configuration
    pub fn validate(&self) -> Result<()> {
        if self.api_base_url.is_empty() {
            anyhow::bail!("API base URL cannot be empty");
        }

        if self.cdp_port == 0 {
            anyhow::bail!("CDP port must be greater than 0");
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = AgentConfig::default();
        assert!(!config.is_configured());
        assert!(!config.is_enrollment_pending());
        assert_eq!(config.cdp_port, 9222);
    }

    #[test]
    fn test_config_validation() {
        let config = AgentConfig::default();
        assert!(config.validate().is_ok());
    }

    #[test]
    fn test_configured_state() {
        let mut config = AgentConfig::default();
        config.device_token = Some("test-token".to_string());
        assert!(config.is_configured());
    }
}
