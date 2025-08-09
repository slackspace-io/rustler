use dotenvy::dotenv;
use std::env;

/// Application configuration
#[derive(Debug, Clone)]
pub struct Config {
    /// Database connection URL
    pub database_url: String,
    /// Port to run the server on
    pub port: u16,
    /// Host to bind the server to
    pub host: String,
    /// Enable Firefly import features (default: false)
    pub firefly_import: bool,
}

impl Config {
    /// Load configuration from environment variables
    pub fn from_env() -> Result<Self, env::VarError> {
        // Load .env file if it exists
        let _ = dotenv();

        // Get database URL from environment
        let database_url = env::var("DATABASE_URL")?;

        // Get port from environment, or use default
        let port = env::var("PORT")
            .unwrap_or_else(|_| "3000".to_string())
            .parse::<u16>()
            .unwrap_or(3000);

        // Get host from environment, or use default
        let host = env::var("HOST").unwrap_or_else(|_| "127.0.0.1".to_string());

        // Feature flag for Firefly import (FIREFLY_IMPORT=true to enable)
        let firefly_import = env::var("FIREFLY_IMPORT")
            .ok()
            .map(|v| v.eq_ignore_ascii_case("true") || v == "1" || v.eq_ignore_ascii_case("yes"))
            .unwrap_or(false);

        Ok(Self {
            database_url,
            port,
            host,
            firefly_import,
        })
    }
}
