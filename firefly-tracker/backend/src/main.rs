use std::net::SocketAddr;
use std::sync::Arc;

use anyhow::Result;
use axum::http::{header, Method};
use axum::serve;
use tokio::net::TcpListener;
use tower_http::cors::{Any, CorsLayer};
use tracing::{info,debug, Level};
use tracing_subscriber::FmtSubscriber;

mod api;
mod config;
mod firefly;
mod models;

use api::routes::AppState;
use config::AppConfig;
use firefly::FireflyClient;

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize logging
    let subscriber = FmtSubscriber::builder()
        .with_max_level(Level::DEBUG)
        .finish();
    tracing::subscriber::set_global_default(subscriber)?;

    info!("Starting Firefly Tracker backend");
    debug!("Test Debug");
    // Load configuration
    let config = AppConfig::load()?;
    info!("Configuration loaded");
    info!("{:#?}", config);

    // Initialize Firefly client
    let firefly_client = FireflyClient::new(config.firefly.clone())?;
    info!("Firefly client initialized");

    // Create application state
    let state = Arc::new(AppState {
        firefly_client,
    });

    // Set up CORS
    let cors = CorsLayer::new()
        .allow_methods([Method::GET, Method::POST])
        .allow_headers([header::CONTENT_TYPE, header::AUTHORIZATION])
        .allow_origin(Any);

    // Create router
    let app = api::create_router(state)
        .layer(cors);

    // Start server
    let addr = SocketAddr::from(([0, 0, 0, 0], config.server.port));
    info!("Listening on {}", addr);

    let listener = TcpListener::bind(addr).await?;
    serve(listener, app).await?;

    Ok(())
}
