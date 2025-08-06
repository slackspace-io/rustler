mod accounts;
mod transactions;
mod categories;
mod budgets;
mod web;
mod category_spending;
mod rules;

use axum::{
    Router,
    routing::{get, post, put, delete},
};

pub fn create_router(
    account_service: Arc<AccountService>,
    transaction_service: Arc<TransactionService>,
    transaction_rule_service: Arc<TransactionRuleService>,
    category_service: Arc<CategoryService>,
    budget_service: Arc<BudgetService>,
    rule_service: Arc<RuleService>
) -> Router {
    Router::new()
        .merge(accounts::router(account_service))
        .merge(transactions::router(transaction_rule_service.clone()))
        .merge(categories::router(category_service))
        .merge(budgets::router(budget_service))
        .merge(category_spending::router(transaction_service.clone()))
        .merge(rules::router(rule_service))
}

pub use web::router as web_router_impl;

use std::sync::Arc;
use crate::services::{AccountService, TransactionService, TransactionRuleService, CategoryService, BudgetService, RuleService};

pub fn web_router(
    account_service: Arc<AccountService>,
    transaction_service: Arc<TransactionService>,
    transaction_rule_service: Arc<TransactionRuleService>,
    category_service: Arc<CategoryService>,
    budget_service: Arc<BudgetService>,
    rule_service: Arc<RuleService>
) -> Router {
    web_router_impl(account_service, transaction_service, transaction_rule_service, category_service, budget_service, rule_service)
}
