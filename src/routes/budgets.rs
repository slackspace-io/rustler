use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
    Router,
    routing::{get, post, put, delete},
};
use uuid::Uuid;
use std::sync::Arc;

use crate::models::{Budget, CreateBudgetRequest, UpdateBudgetRequest};
use crate::services::BudgetService;

pub fn router(budget_service: Arc<BudgetService>) -> Router {
    Router::new()
        .route("/budgets", get(get_budgets))
        .route("/budgets/active", get(get_active_budgets))
        .route("/budgets", post(create_budget))
        .route("/budgets/{id}", get(get_budget))
        .route("/budgets/{id}", put(update_budget))
        .route("/budgets/{id}", post(update_budget))  // Add POST handler for budget updates
        .route("/budgets/{id}", delete(delete_budget))
        .route("/budgets/{id}/spent", get(get_budget_spent))
        .route("/budgets/{id}/remaining", get(get_budget_remaining))
        .with_state(budget_service)
}

// Handler to get all budgets
async fn get_budgets(
    State(state): State<Arc<BudgetService>>,
) -> Result<Json<Vec<Budget>>, StatusCode> {
    // Call the budget service to get all budgets
    match state.get_budgets().await {
        Ok(budgets) => Ok(Json(budgets)),
        Err(err) => {
            eprintln!("Error getting budgets: {:?}", err);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// Handler to get active budgets
async fn get_active_budgets(
    State(state): State<Arc<BudgetService>>,
) -> Result<Json<Vec<Budget>>, StatusCode> {
    // Call the budget service to get active budgets
    match state.get_active_budgets().await {
        Ok(budgets) => Ok(Json(budgets)),
        Err(err) => {
            eprintln!("Error getting active budgets: {:?}", err);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// Handler to create a new budget
async fn create_budget(
    State(state): State<Arc<BudgetService>>,
    Json(payload): Json<CreateBudgetRequest>,
) -> Result<(StatusCode, Json<Budget>), StatusCode> {
    // Call the budget service to create a new budget
    match state.create_budget(payload).await {
        Ok(budget) => Ok((StatusCode::CREATED, Json(budget))),
        Err(err) => {
            eprintln!("Error creating budget: {:?}", err);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// Handler to get a specific budget by ID
async fn get_budget(
    Path(id): Path<Uuid>,
    State(state): State<Arc<BudgetService>>,
) -> Result<Json<Budget>, StatusCode> {
    // Call the budget service to get the budget by ID
    match state.get_budget(id).await {
        Ok(Some(budget)) => Ok(Json(budget)),
        Ok(None) => Err(StatusCode::NOT_FOUND),
        Err(err) => {
            eprintln!("Error getting budget: {:?}", err);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// Handler to update a budget
async fn update_budget(
    Path(id): Path<Uuid>,
    State(state): State<Arc<BudgetService>>,
    Json(payload): Json<UpdateBudgetRequest>,
) -> Result<Json<Budget>, StatusCode> {
    // Call the budget service to update the budget
    match state.update_budget(id, payload).await {
        Ok(Some(budget)) => Ok(Json(budget)),
        Ok(None) => Err(StatusCode::NOT_FOUND),
        Err(err) => {
            eprintln!("Error updating budget: {:?}", err);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// Handler to delete a budget
async fn delete_budget(
    Path(id): Path<Uuid>,
    State(state): State<Arc<BudgetService>>,
) -> StatusCode {
    // Call the budget service to delete the budget
    match state.delete_budget(id).await {
        Ok(true) => StatusCode::NO_CONTENT,
        Ok(false) => StatusCode::NOT_FOUND,
        Err(err) => {
            eprintln!("Error deleting budget: {:?}", err);
            StatusCode::INTERNAL_SERVER_ERROR
        }
    }
}

// Handler to get the total spent amount for a budget
async fn get_budget_spent(
    Path(id): Path<Uuid>,
    State(state): State<Arc<BudgetService>>,
) -> Result<Json<f64>, StatusCode> {
    // Call the budget service to get the spent amount
    match state.get_budget_spent(id).await {
        Ok(spent) => Ok(Json(spent)),
        Err(err) => {
            eprintln!("Error getting budget spent: {:?}", err);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// Handler to get the remaining amount for a budget
async fn get_budget_remaining(
    Path(id): Path<Uuid>,
    State(state): State<Arc<BudgetService>>,
) -> Result<Json<f64>, StatusCode> {
    // Call the budget service to get the remaining amount
    match state.get_budget_remaining(id).await {
        Ok(remaining) => Ok(Json(remaining)),
        Err(err) => {
            eprintln!("Error getting budget remaining: {:?}", err);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}
