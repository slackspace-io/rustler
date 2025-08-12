use axum::{
    extract::{Path, State, Query},
    http::StatusCode,
    Json,
    Router,
    routing::{get, post, put, delete},
};
use uuid::Uuid;
use std::sync::Arc;
use serde::{Deserialize, Serialize};

use crate::models::{Budget, CreateBudgetRequest, UpdateBudgetRequest, Transaction};
use crate::services::BudgetService;

// Query parameters for monthly budget status
#[derive(Debug, Deserialize)]
struct MonthlyBudgetQuery {
    year: i32,
    month: u32,
}

// Response structure for monthly budget status
#[derive(Debug, Serialize)]
struct MonthlyBudgetStatus {
    incoming_funds: f64,
    budgeted_amount: f64,
    remaining_to_budget: f64,
    forecasted_monthly_income: f64,
}

pub fn router(budget_service: Arc<BudgetService>) -> Router {
    Router::new()
        .route("/budgets", get(get_budgets))
        .route("/budgets/active", get(get_active_budgets))
        .route("/budgets/monthly-status", get(get_monthly_budget_status))
        .route("/budgets/unbudgeted-spent", get(get_unbudgeted_spent))
        .route("/budgets", post(create_budget))
        .route("/budgets/{id}", get(get_budget))
        .route("/budgets/{id}", put(update_budget))
        .route("/budgets/{id}", post(update_budget))  // Add POST handler for budget updates
        .route("/budgets/{id}", delete(delete_budget))
        .route("/budgets/{id}/spent", get(get_budget_spent))
        .route("/budgets/{id}/remaining", get(get_budget_remaining))
        .route("/budgets/{id}/transactions", get(get_budget_transactions_for_month))
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
    Query(query): Query<std::collections::HashMap<String, String>>,
    State(state): State<Arc<BudgetService>>,
) -> Result<Json<f64>, StatusCode> {
    // If year and month are provided, compute for that month; otherwise, return all-time
    if let (Some(year_str), Some(month_str)) = (query.get("year"), query.get("month")) {
        // Parse query params
        let year = match year_str.parse::<i32>() {
            Ok(y) => y,
            Err(_) => return Err(StatusCode::BAD_REQUEST),
        };
        let month = match month_str.parse::<u32>() {
            Ok(m) if m >= 1 && m <= 12 => m,
            _ => return Err(StatusCode::BAD_REQUEST),
        };

        match state.get_budget_spent_for_month(id, year, month).await {
            Ok(spent) => Ok(Json(spent)),
            Err(err) => {
                eprintln!("Error getting monthly budget spent: {:?}", err);
                Err(StatusCode::INTERNAL_SERVER_ERROR)
            }
        }
    } else {
        // Call the budget service to get the spent amount (all-time)
        match state.get_budget_spent(id).await {
            Ok(spent) => Ok(Json(spent)),
            Err(err) => {
                eprintln!("Error getting budget spent: {:?}", err);
                Err(StatusCode::INTERNAL_SERVER_ERROR)
            }
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

// Handler to get the monthly budget status
async fn get_monthly_budget_status(
    Query(query): Query<MonthlyBudgetQuery>,
    State(state): State<Arc<BudgetService>>,
) -> Result<Json<MonthlyBudgetStatus>, StatusCode> {
    // Validate month value (1-12)
    if query.month < 1 || query.month > 12 {
        return Err(StatusCode::BAD_REQUEST);
    }

    // Call the budget service to get the monthly budget status
    match state.get_monthly_budget_status(query.year, query.month).await {
        Ok((incoming_funds, budgeted_amount, remaining_to_budget, forecasted_monthly_income)) => {
            Ok(Json(MonthlyBudgetStatus {
                incoming_funds,
                budgeted_amount,
                remaining_to_budget,
                forecasted_monthly_income,
            }))
        },
        Err(err) => {
            eprintln!("Error getting monthly budget status: {:?}", err);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// Handler to get the total spent amount not associated with any budget
async fn get_unbudgeted_spent(
    Query(query): Query<std::collections::HashMap<String, String>>,
    State(state): State<Arc<BudgetService>>,
) -> Result<Json<f64>, StatusCode> {
    // If year and month are provided, compute for that month; otherwise, return all-time
    if let (Some(year_str), Some(month_str)) = (query.get("year"), query.get("month")) {
        // Parse query params
        let year = match year_str.parse::<i32>() {
            Ok(y) => y,
            Err(_) => return Err(StatusCode::BAD_REQUEST),
        };
        let month = match month_str.parse::<u32>() {
            Ok(m) if m >= 1 && m <= 12 => m,
            _ => return Err(StatusCode::BAD_REQUEST),
        };

        match state.get_unbudgeted_spent_for_month(year, month).await {
            Ok(spent) => Ok(Json(spent)),
            Err(err) => {
                eprintln!("Error getting monthly unbudgeted spent: {:?}", err);
                Err(StatusCode::INTERNAL_SERVER_ERROR)
            }
        }
    } else {
        // Call the budget service to get the unbudgeted spent amount (all-time)
        match state.get_unbudgeted_spent().await {
            Ok(spent) => Ok(Json(spent)),
            Err(err) => {
                eprintln!("Error getting unbudgeted spent: {:?}", err);
                Err(StatusCode::INTERNAL_SERVER_ERROR)
            }
        }
    }
}


// Handler to get transactions for a budget within the month linked to that budget (via start_date)
async fn get_budget_transactions_for_month(
    Path(id): Path<Uuid>,
    State(state): State<Arc<BudgetService>>,
) -> Result<Json<Vec<Transaction>>, StatusCode> {
    match state.get_budget_transactions_for_month(id).await {
        Ok(txs) => Ok(Json(txs)),
        Err(err) => {
            eprintln!("Error getting budget transactions for month: {:?}", err);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}
