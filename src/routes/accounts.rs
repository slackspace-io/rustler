use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
    Router,
    routing::{get, post, put, delete},
};
use uuid::Uuid;
use std::sync::Arc;

use crate::models::{Account, CreateAccountRequest, UpdateAccountRequest};
use crate::services::AccountService;

pub fn router(account_service: Arc<AccountService>) -> Router {
    Router::new()
        .route("/accounts", get(get_accounts))
        .route("/accounts", post(create_account))
        .route("/accounts/{id}", get(get_account))
        .route("/accounts/{id}", put(update_account))
        .route("/accounts/{id}", post(update_account))  // Add POST handler for account updates
        .route("/accounts/{id}", delete(delete_account))
        .with_state(account_service)
}

// Handler to get all accounts
async fn get_accounts(
    State(state): State<Arc<AccountService>>,
) -> Result<Json<Vec<Account>>, StatusCode> {
    // Call the account service to get all accounts
    match state.get_accounts().await {
        Ok(accounts) => Ok(Json(accounts)),
        Err(err) => {
            eprintln!("Error getting accounts: {:?}", err);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// Handler to create a new account
async fn create_account(
    State(state): State<Arc<AccountService>>,
    Json(payload): Json<CreateAccountRequest>,
) -> Result<(StatusCode, Json<Account>), StatusCode> {
    // Call the account service to create a new account
    match state.create_account(payload).await {
        Ok(account) => Ok((StatusCode::CREATED, Json(account))),
        Err(err) => {
            eprintln!("Error creating account: {:?}", err);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// Handler to get a specific account by ID
async fn get_account(
    Path(id): Path<Uuid>,
    State(state): State<Arc<AccountService>>,
) -> Result<Json<Account>, StatusCode> {
    // Call the account service to get the account by ID
    match state.get_account(id).await {
        Ok(Some(account)) => Ok(Json(account)),
        Ok(None) => Err(StatusCode::NOT_FOUND),
        Err(err) => {
            eprintln!("Error getting account: {:?}", err);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// Handler to update an account
async fn update_account(
    Path(id): Path<Uuid>,
    State(state): State<Arc<AccountService>>,
    Json(payload): Json<UpdateAccountRequest>,
) -> Result<Json<Account>, StatusCode> {
    // Call the account service to update the account
    match state.update_account(id, payload).await {
        Ok(Some(account)) => Ok(Json(account)),
        Ok(None) => Err(StatusCode::NOT_FOUND),
        Err(err) => {
            eprintln!("Error updating account: {:?}", err);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// Handler to delete an account
async fn delete_account(
    Path(id): Path<Uuid>,
    State(state): State<Arc<AccountService>>,
) -> StatusCode {
    // Call the account service to delete the account
    match state.delete_account(id).await {
        Ok(true) => StatusCode::NO_CONTENT,
        Ok(false) => StatusCode::NOT_FOUND,
        Err(err) => {
            eprintln!("Error deleting account: {:?}", err);
            StatusCode::INTERNAL_SERVER_ERROR
        }
    }
}
