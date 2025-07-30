use anyhow::Result;
use config::{Config, ConfigError, Environment, File};
use serde::Deserialize;
use std::env;

#[derive(Debug, Deserialize, Clone)]
pub struct AppConfig {
    pub server: ServerConfig,
    pub firefly: FireflyConfig,
}

#[derive(Debug, Deserialize, Clone)]
pub struct ServerConfig {
    pub host: String,
    pub port: u16,
}

#[derive(Debug, Deserialize, Clone)]
pub struct FireflyConfig {
    pub api_url: String,
    pub api_token: String,
    #[serde(default = "default_accept_invalid_certs")]
    pub accept_invalid_certs: bool,
    #[serde(default = "default_max_retries")]
    pub max_retries: u32,
    #[serde(default = "default_retry_delay")]
    pub retry_delay_ms: u64,
    #[serde(default = "default_debug_mode")]
    pub debug_mode: bool,
}

fn default_accept_invalid_certs() -> bool {
    false
}

fn default_max_retries() -> u32 {
    3
}

fn default_retry_delay() -> u64 {
    1000
}

fn default_debug_mode() -> bool {
    false
}

impl AppConfig {
    pub fn load() -> Result<Self> {
        // Determine the runtime environment
        let env_name = env::var("RUN_ENV").unwrap_or_else(|_| "development".into());

        // Build configuration
        let config = Config::builder()
            // Start with default settings
            .set_default("server.host", "127.0.0.1")?
            .set_default("server.port", 8080)?
            // Add configuration from file
            // (optional, this can be commented out if you prefer using just env vars)
            .add_source(File::with_name("config/default").required(false))
            .add_source(File::with_name(&format!("config/{}", env_name)).required(false))
            // Add in settings from environment variables (with a prefix of APP)
            // E.g. `APP_SERVER__PORT=8080` would set `server.port`
            .add_source(Environment::with_prefix("APP").separator("__"))
            .build()?;

        // Deserialize the configuration
        let app_config: AppConfig = config.try_deserialize()?;

        // Validate configuration
        if app_config.firefly.api_url.is_empty() {
            return Err(ConfigError::NotFound("firefly.api_url".to_string()).into());
        }

        if app_config.firefly.api_token.is_empty() {
            return Err(ConfigError::NotFound("firefly.api_token".to_string()).into());
        }

        Ok(app_config)
    }
}
