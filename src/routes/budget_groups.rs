use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
    Router,
    routing::{get, post, put, delete},
};
use uuid::Uuid;
use std::sync::Arc;

use crate::models::{BudgetGroup, CreateBudgetGroupRequest, UpdateBudgetGroupRequest, Budget};
use crate::services::BudgetGroupService;

pub fn router(budget_group_service: Arc<BudgetGroupService>) -> Router {
    Router::new()
        .route("/budget-groups", get(get_budget_groups))
        .route("/budget-groups", post(create_budget_group))
        .route("/budget-groups/{id}", get(get_budget_group))
        .route("/budget-groups/{id}", put(update_budget_group))
        .route("/budget-groups/{id}", post(update_budget_group)) // POST handler for updates (compat)
        .route("/budget-groups/{id}", delete(delete_budget_group))
        .route("/budget-groups/{id}/budgets", get(get_budgets_by_group))
        .with_state(budget_group_service)
}

// Handler to get all budget groups
async fn get_budget_groups(
    State(state): State<Arc<BudgetGroupService>>,
) -> Result<Json<Vec<BudgetGroup>>, StatusCode> {
    match state.get_budget_groups().await {
        Ok(groups) => Ok(Json(groups)),
        Err(err) => {
            eprintln!("Error getting budget groups: {:?}", err);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// Handler to create a new budget group
async fn create_budget_group(
    State(state): State<Arc<BudgetGroupService>>,
    Json(payload): Json<CreateBudgetGroupRequest>,
) -> Result<(StatusCode, Json<BudgetGroup>), StatusCode> {
    match state.create_budget_group(payload).await {
        Ok(group) => Ok((StatusCode::CREATED, Json(group))),
        Err(err) => {
            eprintln!("Error creating budget group: {:?}", err);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// Handler to get a specific budget group by ID
async fn get_budget_group(
    Path(id): Path<Uuid>,
    State(state): State<Arc<BudgetGroupService>>,
) -> Result<Json<BudgetGroup>, StatusCode> {
    match state.get_budget_group(id).await {
        Ok(Some(group)) => Ok(Json(group)),
        Ok(None) => Err(StatusCode::NOT_FOUND),
        Err(err) => {
            eprintln!("Error getting budget group: {:?}", err);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// Handler to update a budget group
async fn update_budget_group(
    Path(id): Path<Uuid>,
    State(state): State<Arc<BudgetGroupService>>,
    Json(payload): Json<UpdateBudgetGroupRequest>,
) -> Result<Json<BudgetGroup>, StatusCode> {
    match state.update_budget_group(id, payload).await {
        Ok(Some(group)) => Ok(Json(group)),
        Ok(None) => Err(StatusCode::NOT_FOUND),
        Err(err) => {
            eprintln!("Error updating budget group: {:?}", err);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// Handler to delete a budget group
async fn delete_budget_group(
    Path(id): Path<Uuid>,
    State(state): State<Arc<BudgetGroupService>>,
) -> StatusCode {
    match state.delete_budget_group(id).await {
        Ok(true) => StatusCode::NO_CONTENT,
        Ok(false) => StatusCode::NOT_FOUND,
        Err(err) => {
            eprintln!("Error deleting budget group: {:?}", err);
            StatusCode::INTERNAL_SERVER_ERROR
        }
    }
}

// Handler to get all budgets in a specific group
async fn get_budgets_by_group(
    Path(id): Path<Uuid>,
    State(state): State<Arc<BudgetGroupService>>,
) -> Result<Json<Vec<Budget>>, StatusCode> {
    match state.get_budgets_by_group(id).await {
        Ok(budgets) => Ok(Json(budgets)),
        Err(err) => {
            eprintln!("Error getting budgets by group: {:?}", err);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}
