use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
    Router,
    routing::{get, post, put, delete},
};
use uuid::Uuid;
use std::sync::Arc;

use crate::models::{RuleGroup, CreateRuleGroupRequest, UpdateRuleGroupRequest, RuleResponse, Rule};
use crate::services::RuleGroupService;

pub fn router(rule_group_service: Arc<RuleGroupService>) -> Router {
    Router::new()
        .route("/rule-groups", get(get_rule_groups))
        .route("/rule-groups", post(create_rule_group))
        .route("/rule-groups/{id}", get(get_rule_group))
        .route("/rule-groups/{id}", put(update_rule_group))
        .route("/rule-groups/{id}", post(update_rule_group)) // POST handler for updates (compat)
        .route("/rule-groups/{id}", delete(delete_rule_group))
        .route("/rule-groups/{id}/rules", get(get_rules_by_group))
        .with_state(rule_group_service)
}

// Handler to get all rule groups
async fn get_rule_groups(
    State(state): State<Arc<RuleGroupService>>,
) -> Result<Json<Vec<RuleGroup>>, StatusCode> {
    match state.get_rule_groups().await {
        Ok(groups) => Ok(Json(groups)),
        Err(err) => {
            eprintln!("Error getting rule groups: {:?}", err);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// Handler to create a new rule group
async fn create_rule_group(
    State(state): State<Arc<RuleGroupService>>,
    Json(payload): Json<CreateRuleGroupRequest>,
) -> Result<(StatusCode, Json<RuleGroup>), StatusCode> {
    match state.create_rule_group(payload).await {
        Ok(group) => Ok((StatusCode::CREATED, Json(group))),
        Err(err) => {
            eprintln!("Error creating rule group: {:?}", err);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// Handler to get a specific rule group by ID
async fn get_rule_group(
    Path(id): Path<Uuid>,
    State(state): State<Arc<RuleGroupService>>,
) -> Result<Json<RuleGroup>, StatusCode> {
    match state.get_rule_group(id).await {
        Ok(Some(group)) => Ok(Json(group)),
        Ok(None) => Err(StatusCode::NOT_FOUND),
        Err(err) => {
            eprintln!("Error getting rule group: {:?}", err);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// Handler to update a rule group
async fn update_rule_group(
    Path(id): Path<Uuid>,
    State(state): State<Arc<RuleGroupService>>,
    Json(payload): Json<UpdateRuleGroupRequest>,
) -> Result<Json<RuleGroup>, StatusCode> {
    match state.update_rule_group(id, payload).await {
        Ok(Some(group)) => Ok(Json(group)),
        Ok(None) => Err(StatusCode::NOT_FOUND),
        Err(err) => {
            eprintln!("Error updating rule group: {:?}", err);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// Handler to delete a rule group
async fn delete_rule_group(
    Path(id): Path<Uuid>,
    State(state): State<Arc<RuleGroupService>>,
) -> StatusCode {
    match state.delete_rule_group(id).await {
        Ok(true) => StatusCode::NO_CONTENT,
        Ok(false) => StatusCode::NOT_FOUND,
        Err(err) => {
            eprintln!("Error deleting rule group: {:?}", err);
            StatusCode::INTERNAL_SERVER_ERROR
        }
    }
}

// Handler to get all rules in a specific group
async fn get_rules_by_group(
    Path(id): Path<Uuid>,
    State(state): State<Arc<RuleGroupService>>,
) -> Result<Json<Vec<Rule>>, StatusCode> {
    match state.get_rules_by_group(id).await {
        Ok(rules) => Ok(Json(rules)),
        Err(err) => {
            eprintln!("Error getting rules by group: {:?}", err);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}
