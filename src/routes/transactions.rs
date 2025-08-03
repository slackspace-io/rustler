use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
    Router,
    routing::{get, post, put, delete},
};
use serde::Deserialize;
use uuid::Uuid;
use std::sync::Arc;

use crate::models::{Transaction, CreateTransactionRequest, UpdateTransactionRequest};
use crate::services::TransactionService;

pub fn router(transaction_service: Arc<TransactionService>) -> Router {
    Router::new()
        .route("/transactions", get(get_transactions))
        .route("/transactions", post(create_transaction))
        .route("/transactions/{id}", get(get_transaction))
        .route("/transactions/{id}", put(update_transaction))
        .route("/transactions/{id}", delete(delete_transaction))
        .route("/accounts/{account_id}/transactions", get(get_account_transactions))
        .with_state(transaction_service)
}

#[derive(Debug, Deserialize)]
pub struct TransactionQuery {
    pub account_id: Option<Uuid>,
    pub category: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

// Handler to get all transactions, with optional filtering
async fn get_transactions(
    Query(query): Query<TransactionQuery>,
    State(state): State<Arc<TransactionService>>,
) -> Result<Json<Vec<Transaction>>, StatusCode> {
    // Parse dates if provided
    let start_date = query.start_date.as_ref().and_then(|date_str| {
        chrono::NaiveDate::parse_from_str(date_str, "%Y-%m-%d").ok().map(|date| {
            chrono::DateTime::<chrono::Utc>::from_utc(
                chrono::NaiveDateTime::new(
                    date,
                    chrono::NaiveTime::from_hms_opt(0, 0, 0).unwrap(),
                ),
                chrono::Utc,
            )
        })
    });

    let end_date = query.end_date.as_ref().and_then(|date_str| {
        chrono::NaiveDate::parse_from_str(date_str, "%Y-%m-%d").ok().map(|date| {
            chrono::DateTime::<chrono::Utc>::from_utc(
                chrono::NaiveDateTime::new(
                    date,
                    chrono::NaiveTime::from_hms_opt(23, 59, 59).unwrap(),
                ),
                chrono::Utc,
            )
        })
    });

    // Call the transaction service to get transactions with filters
    match state.get_transactions(query.account_id, query.category.as_deref(), start_date, end_date).await {
        Ok(transactions) => Ok(Json(transactions)),
        Err(err) => {
            eprintln!("Error getting transactions: {:?}", err);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// Handler to get transactions for a specific account
async fn get_account_transactions(
    Path(account_id): Path<Uuid>,
    State(state): State<Arc<TransactionService>>,
) -> Result<Json<Vec<Transaction>>, StatusCode> {
    // Call the transaction service to get transactions for the account
    match state.get_account_transactions(account_id).await {
        Ok(transactions) => Ok(Json(transactions)),
        Err(err) => {
            eprintln!("Error getting account transactions: {:?}", err);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// Handler to create a new transaction
async fn create_transaction(
    State(state): State<Arc<TransactionService>>,
    Json(payload): Json<CreateTransactionRequest>,
) -> Result<(StatusCode, Json<Transaction>), StatusCode> {
    // Call the transaction service to create a new transaction
    match state.create_transaction(payload).await {
        Ok(transaction) => Ok((StatusCode::CREATED, Json(transaction))),
        Err(err) => {
            eprintln!("Error creating transaction: {:?}", err);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// Handler to get a specific transaction by ID
async fn get_transaction(
    Path(id): Path<Uuid>,
    State(state): State<Arc<TransactionService>>,
) -> Result<Json<Transaction>, StatusCode> {
    // Call the transaction service to get the transaction by ID
    match state.get_transaction(id).await {
        Ok(Some(transaction)) => Ok(Json(transaction)),
        Ok(None) => Err(StatusCode::NOT_FOUND),
        Err(err) => {
            eprintln!("Error getting transaction: {:?}", err);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// Handler to update a transaction
async fn update_transaction(
    Path(id): Path<Uuid>,
    State(state): State<Arc<TransactionService>>,
    Json(payload): Json<UpdateTransactionRequest>,
) -> Result<Json<Transaction>, StatusCode> {
    // Call the transaction service to update the transaction
    match state.update_transaction(id, payload).await {
        Ok(Some(transaction)) => Ok(Json(transaction)),
        Ok(None) => Err(StatusCode::NOT_FOUND),
        Err(err) => {
            eprintln!("Error updating transaction: {:?}", err);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// Handler to delete a transaction
async fn delete_transaction(
    Path(id): Path<Uuid>,
    State(state): State<Arc<TransactionService>>,
) -> StatusCode {
    // Call the transaction service to delete the transaction
    match state.delete_transaction(id).await {
        Ok(true) => StatusCode::NO_CONTENT,
        Ok(false) => StatusCode::NOT_FOUND,
        Err(err) => {
            eprintln!("Error deleting transaction: {:?}", err);
            StatusCode::INTERNAL_SERVER_ERROR
        }
    }
}
