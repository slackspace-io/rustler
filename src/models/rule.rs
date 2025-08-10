use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// Represents a condition type for a rule
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ConditionType {
    /// Check if description contains a specific string
    DescriptionContains,
    /// Check if description starts with a specific string
    DescriptionStartsWith,
    /// Check if description matches a specific string exactly
    DescriptionEquals,
    /// Check if source account ID matches
    SourceAccountEquals,
    /// Check if destination account ID matches
    DestinationAccountEquals,
    /// Check if destination name contains a specific string
    DestinationNameContains,
    /// Check if destination name matches a specific string exactly
    DestinationNameEquals,
    /// Check if amount is greater than a specific value
    AmountGreaterThan,
    /// Check if amount is less than a specific value
    AmountLessThan,
    /// Check if amount equals a specific value
    AmountEquals,
}

/// Represents an action type for a rule
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ActionType {
    /// Set the category of the transaction
    SetCategory,
    /// Set the budget ID of the transaction
    SetBudget,
    /// Set the description of the transaction
    SetDescription,
    /// Set the destination name of the transaction
    SetDestinationName,
}

/// Represents a condition for a rule
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuleCondition {
    /// Type of condition
    pub condition_type: ConditionType,
    /// Value to compare against
    pub value: String,
}

/// Represents an action for a rule
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuleAction {
    /// Type of action
    pub action_type: ActionType,
    /// Value to set
    pub value: String,
}

/// Represents a rule in the system
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Rule {
    /// Unique identifier for the rule
    pub id: Uuid,
    /// Name of the rule
    pub name: String,
    /// Description of the rule
    pub description: Option<String>,
    /// Whether the rule is active
    pub is_active: bool,
    /// Priority of the rule (lower numbers have higher priority)
    pub priority: i32,
    /// Optional rule group this rule belongs to
    pub group_id: Option<Uuid>,
    /// Conditions for the rule (serialized as JSON)
    pub conditions_json: String,
    /// Actions for the rule (serialized as JSON)
    pub actions_json: String,
    /// When the rule was created
    pub created_at: DateTime<Utc>,
    /// When the rule was last updated
    pub updated_at: DateTime<Utc>,
}

/// Data required to create a new rule
#[derive(Debug, Deserialize)]
pub struct CreateRuleRequest {
    /// Name of the rule
    pub name: String,
    /// Description of the rule
    pub description: Option<String>,
    /// Whether the rule is active
    pub is_active: bool,
    /// Priority of the rule (lower numbers have higher priority)
    pub priority: Option<i32>,
    /// Optional rule group this rule belongs to
    pub group_id: Option<Uuid>,
    /// Conditions for the rule
    pub conditions: Vec<RuleCondition>,
    /// Actions for the rule
    pub actions: Vec<RuleAction>,
}

/// Data required to update an existing rule
#[derive(Debug, Deserialize)]
pub struct UpdateRuleRequest {
    /// Name of the rule
    pub name: Option<String>,
    /// Description of the rule
    pub description: Option<String>,
    /// Whether the rule is active
    pub is_active: Option<bool>,
    /// Priority of the rule (lower numbers have higher priority)
    pub priority: Option<i32>,
    /// Optional rule group this rule belongs to
    pub group_id: Option<Uuid>,
    /// Conditions for the rule
    pub conditions: Option<Vec<RuleCondition>>,
    /// Actions for the rule
    pub actions: Option<Vec<RuleAction>>,
}

/// Response for a rule with deserialized conditions and actions
#[derive(Debug, Serialize)]
pub struct RuleResponse {
    /// Unique identifier for the rule
    pub id: Uuid,
    /// Name of the rule
    pub name: String,
    /// Description of the rule
    pub description: Option<String>,
    /// Whether the rule is active
    pub is_active: bool,
    /// Priority of the rule (lower numbers have higher priority)
    pub priority: i32,
    /// Optional rule group this rule belongs to
    pub group_id: Option<Uuid>,
    /// Conditions for the rule
    pub conditions: Vec<RuleCondition>,
    /// Actions for the rule
    pub actions: Vec<RuleAction>,
    /// When the rule was created
    pub created_at: DateTime<Utc>,
    /// When the rule was last updated
    pub updated_at: DateTime<Utc>,
}

impl Rule {
    /// Convert a Rule to a RuleResponse by deserializing conditions and actions
    pub fn to_response(&self) -> Result<RuleResponse, serde_json::Error> {
        let conditions: Vec<RuleCondition> = serde_json::from_str(&self.conditions_json)?;
        let actions: Vec<RuleAction> = serde_json::from_str(&self.actions_json)?;

        Ok(RuleResponse {
            id: self.id,
            name: self.name.clone(),
            description: self.description.clone(),
            is_active: self.is_active,
            priority: self.priority,
            group_id: self.group_id,
            conditions,
            actions,
            created_at: self.created_at,
            updated_at: self.updated_at,
        })
    }
}
