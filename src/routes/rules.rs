use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
    Router,
    routing::{get, post, put, delete},
};
use uuid::Uuid;
use std::sync::Arc;
use serde::{Serialize, Deserialize};

use crate::models::{CreateRuleRequest, UpdateRuleRequest, RuleResponse};
use crate::services::RuleService;


pub fn router(rule_service: Arc<RuleService>) -> Router {
    Router::new()
        .route("/rules", get(get_rules))
        .route("/rules", post(create_rule))
        .route("/rules/run", post(run_all_rules))
        .route("/rules/{id}/run", post(run_rule))
        .route("/rules/{id}", get(get_rule))
        .route("/rules/{id}", put(update_rule))
        .route("/rules/{id}", delete(delete_rule))
        .with_state(rule_service)
}

// Handler to get all rules
async fn get_rules(
    State(state): State<Arc<RuleService>>,
) -> Result<Json<Vec<RuleResponse>>, StatusCode> {
    match state.get_rules().await {
        Ok(rules) => Ok(Json(rules)),
        Err(err) => {
            eprintln!("Error getting rules: {:?}", err);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// Handler to get a specific rule by ID
async fn get_rule(
    Path(id): Path<Uuid>,
    State(state): State<Arc<RuleService>>,
) -> Result<Json<RuleResponse>, StatusCode> {
    match state.get_rule(id).await {
        Ok(Some(rule)) => Ok(Json(rule)),
        Ok(None) => Err(StatusCode::NOT_FOUND),
        Err(err) => {
            eprintln!("Error getting rule: {:?}", err);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// Handler to create a new rule
async fn create_rule(
    State(state): State<Arc<RuleService>>,
    Json(payload): Json<CreateRuleRequest>,
) -> Result<(StatusCode, Json<RuleResponse>), StatusCode> {
    // Validate the request
    if payload.name.is_empty() {
        return Err(StatusCode::BAD_REQUEST);
    }

    if payload.conditions.is_empty() {
        return Err(StatusCode::BAD_REQUEST);
    }

    if payload.actions.is_empty() {
        return Err(StatusCode::BAD_REQUEST);
    }

    match state.create_rule(payload).await {
        Ok(rule) => Ok((StatusCode::CREATED, Json(rule))),
        Err(err) => {
            eprintln!("Error creating rule: {:?}", err);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// Handler to update a rule
async fn update_rule(
    Path(id): Path<Uuid>,
    State(state): State<Arc<RuleService>>,
    Json(payload): Json<UpdateRuleRequest>,
) -> Result<Json<RuleResponse>, StatusCode> {
    match state.update_rule(id, payload).await {
        Ok(Some(rule)) => Ok(Json(rule)),
        Ok(None) => Err(StatusCode::NOT_FOUND),
        Err(err) => {
            eprintln!("Error updating rule: {:?}", err);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// Handler to delete a rule
async fn delete_rule(
    Path(id): Path<Uuid>,
    State(state): State<Arc<RuleService>>,
) -> StatusCode {
    match state.delete_rule(id).await {
        Ok(true) => StatusCode::NO_CONTENT,
        Ok(false) => StatusCode::NOT_FOUND,
        Err(err) => {
            eprintln!("Error deleting rule: {:?}", err);
            StatusCode::INTERNAL_SERVER_ERROR
        }
    }
}

// Response structure for rule execution
#[derive(Serialize)]
struct RuleExecutionResponse {
    affected_transactions: usize,
    message: String,
}

/// Handler to run all active rules on all transactions
///
/// This endpoint allows manually running all active rules on all transactions.
/// Rules are normally applied automatically when transactions are created or updated,
/// but this endpoint provides a way to apply rules to existing transactions that
/// may have been created before the rules were defined or when rules have been updated.
///
/// Returns the number of transactions that were affected by the rules.
async fn run_all_rules(
    State(state): State<Arc<RuleService>>,
) -> Result<Json<RuleExecutionResponse>, StatusCode> {
    match state.apply_all_rules_to_all_transactions().await {
        Ok(count) => {
            let message = if count > 0 {
                format!("Successfully applied rules to {} transactions", count)
            } else {
                "No transactions were affected by the rules".to_string()
            };

            Ok(Json(RuleExecutionResponse {
                affected_transactions: count,
                message,
            }))
        },
        Err(err) => {
            eprintln!("Error running all rules: {:?}", err);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// Handler to run a specific rule on all transactions
///
/// This endpoint allows manually running a specific rule on all transactions.
/// This is useful when you want to test a rule or apply a specific rule without
/// running all rules. It can also be used when a rule has been updated and you
/// want to apply the changes to existing transactions.
///
/// Returns the number of transactions that were affected by the rule.
async fn run_rule(
    Path(id): Path<Uuid>,
    State(state): State<Arc<RuleService>>,
) -> Result<Json<RuleExecutionResponse>, StatusCode> {
    // First check if the rule exists
    match state.get_rule(id).await {
        Ok(Some(_)) => {
            // Rule exists, apply it to all transactions
            match state.apply_rule_to_all_transactions(id).await {
                Ok(count) => {
                    let message = if count > 0 {
                        format!("Successfully applied rule to {} transactions", count)
                    } else {
                        "No transactions were affected by the rule".to_string()
                    };

                    Ok(Json(RuleExecutionResponse {
                        affected_transactions: count,
                        message,
                    }))
                },
                Err(err) => {
                    eprintln!("Error running rule {}: {:?}", id, err);
                    Err(StatusCode::INTERNAL_SERVER_ERROR)
                }
            }
        },
        Ok(None) => Err(StatusCode::NOT_FOUND),
        Err(err) => {
            eprintln!("Error getting rule {}: {:?}", id, err);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}
