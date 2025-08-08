use axum::{
    extract::{Query, State},
    http::StatusCode,
    Json, Router,
    routing::get,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use uuid::Uuid;

use crate::services::TransactionService;

#[derive(Debug, Deserialize)]
pub struct SpendingReportQuery {
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    /// Comma-separated list of account UUIDs to include; if omitted, include all on-budget accounts
    pub account_ids: Option<String>,
    /// If true, group by category group name; if false, group by category name
    #[serde(default = "default_true")]
    pub group: bool,
    /// Period granularity: month (default), week, or day
    pub period: Option<String>,
}

fn default_true() -> bool { true }

#[derive(Debug, Serialize)]
pub struct SpendingReportRow {
    pub period: String,
    pub name: String,
    pub amount: f64,
}

pub fn router(transaction_service: Arc<TransactionService>) -> Router {
    Router::new()
        .route("/reports/spending", get(spending_by_group_over_time))
        .with_state(transaction_service)
}

async fn spending_by_group_over_time(
    Query(query): Query<SpendingReportQuery>,
    State(state): State<Arc<TransactionService>>,
) -> Result<Json<Vec<SpendingReportRow>>, StatusCode> {
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

    // Parse account IDs if provided
    let account_ids: Option<Vec<Uuid>> = query.account_ids.as_ref().map(|s| {
        s.split(',')
            .filter_map(|part| Uuid::parse_str(part.trim()).ok())
            .collect::<Vec<_>>()
    }).filter(|v| !v.is_empty());

    let group_flag = query.group;
    let period = query.period.as_deref().unwrap_or("month");

    match state
        .get_spending_over_time(account_ids, start_date, end_date, group_flag, period)
        .await
    {
        Ok(rows) => {
            let result = rows
                .into_iter()
                .map(|(period, name, amount)| SpendingReportRow { period, name, amount })
                .collect::<Vec<_>>();
            Ok(Json(result))
        }
        Err(err) => {
            eprintln!("Error generating spending report: {:?}", err);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}
