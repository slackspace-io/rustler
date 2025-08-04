mod config;
mod db;
mod models;
mod routes;
mod services;

use std::net::SocketAddr;
use std::sync::Arc;

use axum::http::{header, Method, StatusCode};
use axum::response::{Html, Redirect};
use axum::Router;
use axum::routing::get;
use hyper::server::conn::http1;
use hyper_util::rt::TokioIo;
use tokio::net::TcpListener;
use tower_http::cors::{Any, CorsLayer};
use tower_http::services::ServeDir;
use tower_http::trace::TraceLayer;
use tracing::info;

// Handler for the API root path
async fn api_root_handler() -> Html<String> {
    Html(format!(
        r#"<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rustler API - Personal Finance</title>
    <style>
        body {{
            font-family: Arial, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }}
        h1 {{
            color: #333;
            border-bottom: 1px solid #ddd;
            padding-bottom: 10px;
        }}
        h2 {{
            color: #444;
        }}
        ul {{
            padding-left: 20px;
        }}
        code {{
            background-color: #f4f4f4;
            padding: 2px 5px;
            border-radius: 3px;
        }}
    </style>
</head>
<body>
    <h1>Rustler API</h1>
    <p>A personal finance application built with Rust, providing a web-based interface for managing accounts and tracking financial transactions.</p>

    <h2>API Endpoints</h2>
    <ul>
        <li><code>GET /api/accounts</code> - List all accounts</li>
        <li><code>GET /api/accounts/{{id}}</code> - Get a specific account</li>
        <li><code>POST /api/accounts</code> - Create a new account</li>
        <li><code>PUT /api/accounts/{{id}}</code> - Update an account</li>
        <li><code>DELETE /api/accounts/{{id}}</code> - Delete an account</li>
        <li><code>GET /api/transactions</code> - List all transactions</li>
        <li><code>GET /api/accounts/{{id}}/transactions</code> - List transactions for a specific account</li>
        <li><code>GET /api/transactions/{{id}}</code> - Get a specific transaction</li>
        <li><code>POST /api/transactions</code> - Create a new transaction</li>
        <li><code>PUT /api/transactions/{{id}}</code> - Update a transaction</li>
        <li><code>DELETE /api/transactions/{{id}}</code> - Delete a transaction</li>
    </ul>

    <p><a href="/">Go to Web Interface</a></p>
</body>
</html>"#
    ))
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize tracing
    tracing_subscriber::fmt::init();

    // Load configuration
    let config = config::Config::from_env().expect("Failed to load configuration");

    // Initialize database connection
    let db_pool = db::init_db_pool(&config.database_url).await?;

    // Run database migrations
    db::run_migrations(&db_pool).await?;

    // Run migration to fix NULL destination_account_id values
    db::fix_null_destination_accounts(&db_pool).await?;

    // Check database connection
    db::check_db_connection(&db_pool).await?;

    // Create services
    let account_service = Arc::new(services::AccountService::new(db_pool.clone()));
    let transaction_service = Arc::new(services::TransactionService::new(db_pool.clone()));
    let category_service = Arc::new(services::CategoryService::new(db_pool.clone()));
    let budget_service = Arc::new(services::BudgetService::new(db_pool.clone()));

    // Set up CORS
    let cors = CorsLayer::new()
        .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE])
        .allow_headers([header::CONTENT_TYPE])
        .allow_origin(Any);

    // Create API router
    let api_router = routes::create_router(
        account_service.clone(),
        transaction_service.clone(),
        category_service.clone(),
        budget_service.clone()
    );

    // Create main router with API routes and serve React frontend
    let app = Router::new()
        .route("/api", get(api_root_handler))
        .nest("/api", api_router)
        .nest_service("/assets", ServeDir::new("frontend/dist/assets"))
        .fallback_service(ServeDir::new("frontend/dist").append_index_html_on_directories(true))
        .layer(TraceLayer::new_for_http())
        .layer(cors);

    // Start the server
    let addr = SocketAddr::new(
        config.host.parse().expect("Invalid host"),
        config.port,
    );

    info!("Starting server on {}", addr);

    // Create a TCP listener
    let listener = TcpListener::bind(addr).await?;

    // Run the server
    info!("Server started, listening on {}", addr);
    axum::serve(listener, app).await?;

    Ok(())
}
