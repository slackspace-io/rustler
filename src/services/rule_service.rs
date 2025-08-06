use chrono::Utc;
use sqlx::{Pool, Postgres};
use uuid::Uuid;
use serde_json;
use tracing::{debug, error};

use crate::models::{
    Rule, RuleResponse, CreateRuleRequest, UpdateRuleRequest,
    RuleCondition, RuleAction, ConditionType, ActionType,
    Transaction, UpdateTransactionRequest
};

/// Service for handling rule-related operations
pub struct RuleService {
    db: Pool<Postgres>,
}

impl RuleService {
    /// Create a new RuleService with the given database pool
    pub fn new(db: Pool<Postgres>) -> Self {
        Self { db }
    }

    /// Get all rules
    pub async fn get_rules(&self) -> Result<Vec<RuleResponse>, sqlx::Error> {
        let rules = sqlx::query_as::<_, Rule>("SELECT * FROM rules ORDER BY priority ASC, name ASC")
            .fetch_all(&self.db)
            .await?;

        let mut rule_responses = Vec::new();
        for rule in rules {
            match rule.to_response() {
                Ok(response) => rule_responses.push(response),
                Err(e) => {
                    error!("Failed to deserialize rule {}: {}", rule.id, e);
                    continue;
                }
            }
        }

        Ok(rule_responses)
    }

    /// Get a rule by ID
    pub async fn get_rule(&self, id: Uuid) -> Result<Option<RuleResponse>, sqlx::Error> {
        let rule = sqlx::query_as::<_, Rule>("SELECT * FROM rules WHERE id = $1")
            .bind(id)
            .fetch_optional(&self.db)
            .await?;

        match rule {
            Some(rule) => match rule.to_response() {
                Ok(response) => Ok(Some(response)),
                Err(e) => {
                    error!("Failed to deserialize rule {}: {}", rule.id, e);
                    Ok(None)
                }
            },
            None => Ok(None),
        }
    }

    /// Create a new rule
    pub async fn create_rule(&self, req: CreateRuleRequest) -> Result<RuleResponse, sqlx::Error> {
        let now = Utc::now();
        let id = Uuid::new_v4();
        let priority = req.priority.unwrap_or(100);

        // Serialize conditions and actions to JSON
        let conditions_json = serde_json::to_string(&req.conditions)
            .map_err(|e| {
                error!("Failed to serialize conditions: {}", e);
                sqlx::Error::Protocol(format!("Failed to serialize conditions: {}", e))
            })?;

        let actions_json = serde_json::to_string(&req.actions)
            .map_err(|e| {
                error!("Failed to serialize actions: {}", e);
                sqlx::Error::Protocol(format!("Failed to serialize actions: {}", e))
            })?;

        // Create the rule
        let rule = sqlx::query_as::<_, Rule>(
            r#"
            INSERT INTO rules (id, name, description, is_active, priority, conditions_json, actions_json, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
            "#,
        )
        .bind(id)
        .bind(&req.name)
        .bind(&req.description)
        .bind(req.is_active)
        .bind(priority)
        .bind(&conditions_json)
        .bind(&actions_json)
        .bind(now)
        .bind(now)
        .fetch_one(&self.db)
        .await?;

        rule.to_response().map_err(|e| {
            error!("Failed to deserialize created rule {}: {}", rule.id, e);
            sqlx::Error::Protocol(format!("Failed to deserialize created rule: {}", e))
        })
    }

    /// Update an existing rule
    pub async fn update_rule(&self, id: Uuid, req: UpdateRuleRequest) -> Result<Option<RuleResponse>, sqlx::Error> {
        // First, check if the rule exists
        let existing_rule = self.get_rule(id).await?;
        if existing_rule.is_none() {
            return Ok(None);
        }

        let now = Utc::now();
        let mut query = String::from("UPDATE rules SET updated_at = $1");
        let mut params: Vec<String> = vec![];

        if let Some(name) = &req.name {
            params.push(format!("name = '{}'", name));
        }

        if let Some(description) = &req.description {
            params.push(format!("description = '{}'", description));
        }

        if let Some(is_active) = req.is_active {
            params.push(format!("is_active = {}", is_active));
        }

        if let Some(priority) = req.priority {
            params.push(format!("priority = {}", priority));
        }

        if let Some(conditions) = &req.conditions {
            let conditions_json = serde_json::to_string(conditions)
                .map_err(|e| {
                    error!("Failed to serialize conditions: {}", e);
                    sqlx::Error::Protocol(format!("Failed to serialize conditions: {}", e))
                })?;
            params.push(format!("conditions_json = '{}'", conditions_json.replace("'", "''")));
        }

        if let Some(actions) = &req.actions {
            let actions_json = serde_json::to_string(actions)
                .map_err(|e| {
                    error!("Failed to serialize actions: {}", e);
                    sqlx::Error::Protocol(format!("Failed to serialize actions: {}", e))
                })?;
            params.push(format!("actions_json = '{}'", actions_json.replace("'", "''")));
        }

        if !params.is_empty() {
            query.push_str(", ");
            query.push_str(&params.join(", "));
        }

        query.push_str(" WHERE id = $2 RETURNING *");

        // Update the rule
        let updated_rule = sqlx::query_as::<_, Rule>(&query)
            .bind(now)
            .bind(id)
            .fetch_optional(&self.db)
            .await?;

        match updated_rule {
            Some(rule) => match rule.to_response() {
                Ok(response) => Ok(Some(response)),
                Err(e) => {
                    error!("Failed to deserialize updated rule {}: {}", rule.id, e);
                    Ok(None)
                }
            },
            None => Ok(None),
        }
    }

    /// Delete a rule
    pub async fn delete_rule(&self, id: Uuid) -> Result<bool, sqlx::Error> {
        let result = sqlx::query("DELETE FROM rules WHERE id = $1")
            .bind(id)
            .execute(&self.db)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    /// Apply rules to a transaction
    pub async fn apply_rules_to_transaction(&self, transaction: &Transaction) -> Result<Option<UpdateTransactionRequest>, sqlx::Error> {
        // Get all active rules ordered by priority
        let rules = sqlx::query_as::<_, Rule>("SELECT * FROM rules WHERE is_active = true ORDER BY priority ASC")
            .fetch_all(&self.db)
            .await?;

        if rules.is_empty() {
            return Ok(None);
        }

        // Initialize an empty update request
        let mut update_request = UpdateTransactionRequest {
            destination_account_id: None,
            destination_name: None,
            description: None,
            amount: None,
            category: None,
            budget_id: None,
            transaction_date: None,
        };

        let mut any_rule_applied = false;

        // Process each rule
        for rule in rules {
            // Deserialize conditions and actions
            let conditions: Vec<RuleCondition> = match serde_json::from_str(&rule.conditions_json) {
                Ok(c) => c,
                Err(e) => {
                    error!("Failed to deserialize conditions for rule {}: {}", rule.id, e);
                    continue;
                }
            };

            let actions: Vec<RuleAction> = match serde_json::from_str(&rule.actions_json) {
                Ok(a) => a,
                Err(e) => {
                    error!("Failed to deserialize actions for rule {}: {}", rule.id, e);
                    continue;
                }
            };

            // Check if all conditions match
            let all_conditions_match = conditions.iter().all(|condition| {
                match condition.condition_type {
                    ConditionType::DescriptionContains => {
                        transaction.description.to_lowercase().contains(&condition.value.to_lowercase())
                    },
                    ConditionType::DescriptionEquals => {
                        transaction.description.to_lowercase() == condition.value.to_lowercase()
                    },
                    ConditionType::SourceAccountEquals => {
                        transaction.source_account_id.to_string() == condition.value
                    },
                    ConditionType::DestinationAccountEquals => {
                        transaction.destination_account_id.to_string() == condition.value
                    },
                    ConditionType::DestinationNameContains => {
                        match &transaction.destination_name {
                            Some(name) => name.to_lowercase().contains(&condition.value.to_lowercase()),
                            None => false,
                        }
                    },
                    ConditionType::DestinationNameEquals => {
                        match &transaction.destination_name {
                            Some(name) => name.to_lowercase() == condition.value.to_lowercase(),
                            None => false,
                        }
                    },
                    ConditionType::AmountGreaterThan => {
                        match condition.value.parse::<f64>() {
                            Ok(value) => transaction.amount > value,
                            Err(_) => false,
                        }
                    },
                    ConditionType::AmountLessThan => {
                        match condition.value.parse::<f64>() {
                            Ok(value) => transaction.amount < value,
                            Err(_) => false,
                        }
                    },
                    ConditionType::AmountEquals => {
                        match condition.value.parse::<f64>() {
                            Ok(value) => (transaction.amount - value).abs() < 0.001, // Use a small epsilon for float comparison
                            Err(_) => false,
                        }
                    },
                }
            });

            // If all conditions match, apply the actions
            if all_conditions_match {
                debug!("Rule {} matched for transaction {}", rule.name, transaction.id);

                for action in actions {
                    match action.action_type {
                        ActionType::SetCategory => {
                            update_request.category = Some(action.value);
                        },
                        ActionType::SetBudget => {
                            // Try to parse the budget ID
                            match Uuid::parse_str(&action.value) {
                                Ok(budget_id) => {
                                    update_request.budget_id = Some(budget_id);
                                },
                                Err(e) => {
                                    error!("Invalid budget ID in rule {}: {}", rule.id, e);
                                }
                            }
                        },
                        ActionType::SetDescription => {
                            update_request.description = Some(action.value);
                        },
                        ActionType::SetDestinationName => {
                            update_request.destination_name = Some(action.value);
                        },
                    }
                }

                any_rule_applied = true;
            }
        }

        if any_rule_applied {
            Ok(Some(update_request))
        } else {
            Ok(None)
        }
    }
}
