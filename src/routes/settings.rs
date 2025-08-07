use axum::{
    extract::{State},
    http::StatusCode,
    Json,
    Router,
    routing::{get, put},
};
use std::sync::Arc;
use serde::{Deserialize, Serialize};

use crate::services::SettingsService;

// Request structure for updating forecasted monthly income
#[derive(Debug, Deserialize)]
struct UpdateForecastedMonthlyIncomeRequest {
    value: String,
}

// Response structure for forecasted monthly income
#[derive(Debug, Serialize)]
struct ForecastedMonthlyIncomeResponse {
    forecasted_monthly_income: f64,
}

pub fn router(settings_service: Arc<SettingsService>) -> Router {
    Router::new()
        .route("/settings/forecasted-monthly-income", get(get_forecasted_monthly_income))
        .route("/settings/forecasted-monthly-income", put(update_forecasted_monthly_income))
        .with_state(settings_service)
}

// Handler to get the forecasted monthly income
async fn get_forecasted_monthly_income(
    State(state): State<Arc<SettingsService>>,
) -> Result<Json<ForecastedMonthlyIncomeResponse>, StatusCode> {
    // Call the settings service to get the forecasted monthly income
    match state.get_forecasted_monthly_income().await {
        Ok(income) => Ok(Json(ForecastedMonthlyIncomeResponse {
            forecasted_monthly_income: income,
        })),
        Err(err) => {
            eprintln!("Error getting forecasted monthly income: {:?}", err);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// Handler to update the forecasted monthly income
async fn update_forecasted_monthly_income(
    State(state): State<Arc<SettingsService>>,
    Json(payload): Json<UpdateForecastedMonthlyIncomeRequest>,
) -> Result<Json<ForecastedMonthlyIncomeResponse>, StatusCode> {
    // Parse the value as f64
    let amount = match payload.value.parse::<f64>() {
        Ok(value) => value,
        Err(_) => {
            eprintln!("Error parsing forecasted monthly income value: {}", payload.value);
            return Err(StatusCode::BAD_REQUEST);
        }
    };

    // Call the settings service to update the forecasted monthly income
    match state.update_forecasted_monthly_income(amount).await {
        Ok(income) => Ok(Json(ForecastedMonthlyIncomeResponse {
            forecasted_monthly_income: income,
        })),
        Err(err) => {
            eprintln!("Error updating forecasted monthly income: {:?}", err);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}
