use axum::{
    extract::{Query, State},
    http::StatusCode,
    Json,
    Router,
    routing::get,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use chrono::{DateTime, Utc};

use crate::services::TransactionService;

#[derive(Debug, Deserialize)]
pub struct DateRangeQuery {
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct CategorySpending {
    pub category: String,
    pub amount: f64,
}

pub fn router(transaction_service: Arc<TransactionService>) -> Router {
    Router::new()
        .route("/categories/spending", get(get_spending_by_category))
        .with_state(transaction_service)
}

// Handler to get spending by category
async fn get_spending_by_category(
    Query(query): Query<DateRangeQuery>,
    State(state): State<Arc<TransactionService>>,
) -> Result<Json<Vec<CategorySpending>>, StatusCode> {
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

    // Call the transaction service to get spending by category
    match state.get_spending_by_category(start_date, end_date).await {
        Ok(spending) => {
            // Convert the result to the expected format
            let result = spending
                .into_iter()
                .map(|(category, amount)| CategorySpending { category, amount })
                .collect();
            Ok(Json(result))
        },
        Err(err) => {
            eprintln!("Error getting spending by category: {:?}", err);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}
