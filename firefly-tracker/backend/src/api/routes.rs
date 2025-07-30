use crate::firefly::FireflyClient;
use crate::models::{
    AccountsResponse, ErrorResponse, NetWorthRequest, NetWorthResponse, AccountWithBalances,
};
use axum::{
    extract::{Json, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{get, post},
    Router,
};
use std::sync::Arc;
use tracing::{error, info};

/// Application state shared across handlers
pub struct AppState {
    pub firefly_client: FireflyClient,
}

/// Create the API router with all routes
pub fn create_router(state: Arc<AppState>) -> Router {
    Router::new()
        .route("/api/health", get(health_check))
        .route("/api/accounts", get(get_accounts))
        .route("/api/net-worth", post(calculate_net_worth))
        .with_state(state)
}

/// Health check endpoint
async fn health_check() -> impl IntoResponse {
    StatusCode::OK
}

/// Get all accounts
async fn get_accounts(
    State(state): State<Arc<AppState>>,
) -> Result<Json<AccountsResponse>, ApiError> {
    info!("Fetching accounts");

    let accounts = state.firefly_client.get_accounts()
        .await
        .map_err(|e| {
            error!("Failed to fetch accounts: {}", e);
            ApiError::internal_error(format!("Failed to fetch accounts: {}", e))
        })?;

    Ok(Json(AccountsResponse { accounts }))
}

/// Calculate net worth over time for selected accounts
async fn calculate_net_worth(
    State(state): State<Arc<AppState>>,
    Json(request): Json<NetWorthRequest>,
) -> Result<Json<NetWorthResponse>, ApiError> {
    info!("Calculating net worth for {} accounts: {:?}", request.account_ids.len(), request.account_ids);
    info!("Date range: start={:?}, end={:?}", request.start_date, request.end_date);

    if request.account_ids.is_empty() {
        info!("Rejecting request: No accounts selected");
        return Err(ApiError::bad_request("No accounts selected".to_string()));
    }

    // Calculate net worth
    info!("Calling calculate_net_worth on FireflyClient");
    let net_worth = state.firefly_client.calculate_net_worth(
        &request.account_ids,
        request.start_date,
        request.end_date,
    )
    .await
    .map_err(|e| {
        error!("Failed to calculate net worth: {}", e);
        ApiError::internal_error(format!("Failed to calculate net worth: {}", e))
    })?;

    info!("Got net worth data with {} data points", net_worth.len());
    if net_worth.is_empty() {
        info!("Warning: Net worth calculation returned empty result");
    } else {
        info!("Net worth data range: from {} to {}",
            net_worth.first().map_or("N/A".to_string(), |b| b.date.to_string()),
            net_worth.last().map_or("N/A".to_string(), |b| b.date.to_string()));
    }

    // Get account details and balances for each selected account
    let mut accounts_with_balances = Vec::new();

    for account_id in &request.account_ids {
        info!("Processing account: {}", account_id);

        // Get all accounts first
        let all_accounts = state.firefly_client.get_accounts()
            .await
            .map_err(|e| {
                error!("Failed to fetch accounts: {}", e);
                ApiError::internal_error(format!("Failed to fetch accounts: {}", e))
            })?;

        // Find the account by ID
        let account = all_accounts.iter()
            .find(|a| &a.id == account_id)
            .cloned()
            .ok_or_else(|| {
                error!("Account not found: {}", account_id);
                ApiError::not_found(format!("Account not found: {}", account_id))
            })?;

        info!("Found account: {} ({})", account.name, account.type_name);

        // Get balances for this account
        let balances = state.firefly_client.get_account_balances(
            account_id,
            request.start_date,
            request.end_date,
            Some(request.frequency),
        )
        .await
        .map_err(|e| {
            error!("Failed to get balances for account {}: {}", account_id, e);
            ApiError::internal_error(format!("Failed to get balances: {}", e))
        })?;

        info!("Got {} balance data points for account {}", balances.len(), account.name);

        accounts_with_balances.push(AccountWithBalances {
            account,
            balances,
        });
    }

    let response = NetWorthResponse {
        accounts: accounts_with_balances,
        net_worth,
    };

    info!("Returning response with {} accounts and {} net worth data points",
          response.accounts.len(), response.net_worth.len());

    Ok(Json(response))
}

/// API error type
pub enum ApiError {
    BadRequest(String),
    NotFound(String),
    InternalError(String),
}

impl ApiError {
    pub fn bad_request(message: String) -> Self {
        Self::BadRequest(message)
    }

    pub fn not_found(message: String) -> Self {
        Self::NotFound(message)
    }

    pub fn internal_error(message: String) -> Self {
        Self::InternalError(message)
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let (status, error_message) = match self {
            ApiError::BadRequest(message) => (
                StatusCode::BAD_REQUEST,
                message,
            ),
            ApiError::NotFound(message) => (
                StatusCode::NOT_FOUND,
                message,
            ),
            ApiError::InternalError(message) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                message,
            ),
        };

        let body = Json(ErrorResponse {
            error: status.to_string(),
            message: error_message,
        });

        (status, body).into_response()
    }
}
