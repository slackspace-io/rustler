use axum::{
    response::{Html, IntoResponse},
    Router,
    routing::get,
};
use std::sync::Arc;

use crate::services::{AccountService, TransactionService, TransactionRuleService, CategoryService, BudgetService, RuleService};

// Create a minimal web router that doesn't use templates
// This is a placeholder since the application is using the React frontend
pub fn router(
    _account_service: Arc<AccountService>,
    _transaction_service: Arc<TransactionService>,
    _transaction_rule_service: Arc<TransactionRuleService>,
    _category_service: Arc<CategoryService>,
    _budget_service: Arc<BudgetService>,
    _rule_service: Arc<RuleService>
) -> Router {
    Router::new()
        .route("/web-api-placeholder", get(placeholder_handler))
}

// A simple placeholder handler
async fn placeholder_handler() -> impl IntoResponse {
    Html(
        r#"<html>
            <head>
                <title>API Placeholder</title>
            </head>
            <body>
                <h1>Web API Placeholder</h1>
                <p>This is a placeholder for the web API. The application is using the React frontend.</p>
                <p><a href="/">Go to React Frontend</a></p>
            </body>
        </html>"#
    )
}
