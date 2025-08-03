use axum::{
    extract::{Path, Query, State},
    response::{Html, IntoResponse, Redirect},
    Router,
    routing::get,
};
use serde::Deserialize;
use std::sync::Arc;
use askama::Template;

// Import chrono types directly
use chrono::{DateTime, Datelike, NaiveDate, NaiveDateTime, NaiveTime, Utc};
use uuid::Uuid;

use crate::services::{AccountService, TransactionService};

// Define templates using Askama
#[derive(Template)]
#[template(path = "dashboard.html")]
struct DashboardTemplate {
    accounts: Vec<crate::models::Account>,
    recent_transactions: Vec<TransactionWithAccountName>,
    total_balance: f64,
    monthly_income: f64,
    monthly_expenses: f64,
    monthly_net: f64,
    default_currency: String,
    accounts_count: usize,
    transactions_count: usize,
}

#[derive(Template)]
#[template(path = "accounts/list.html")]
struct AccountListTemplate {
    accounts: Vec<crate::models::Account>,
    total_balance: f64,
}

#[derive(Template)]
#[template(path = "accounts/view.html")]
struct AccountViewTemplate {
    account: crate::models::Account,
    transactions: Vec<crate::models::Transaction>,
}

#[derive(Template)]
#[template(path = "accounts/new.html")]
struct AccountNewTemplate {}

#[derive(Template)]
#[template(path = "accounts/edit.html")]
struct AccountEditTemplate {
    account: crate::models::Account,
}

#[derive(Template)]
#[template(path = "transactions/list.html")]
struct TransactionListTemplate {
    transactions: Vec<TransactionWithAccountName>,
    accounts: Vec<crate::models::Account>,
    categories: Vec<String>,
    selected_account_id: Option<Uuid>,
    selected_category: Option<String>,
    start_date: Option<String>,
    end_date: Option<String>,
    total_amount: f64,
}

#[derive(Template)]
#[template(path = "transactions/new.html")]
struct TransactionNewTemplate {
    accounts: Vec<crate::models::Account>,
    preselected_source_account_id: Option<Uuid>,
    current_date: String,
}

#[derive(Template)]
#[template(path = "transactions/edit.html")]
struct TransactionEditTemplate {
    transaction: crate::models::Transaction,
    accounts: Vec<crate::models::Account>,
    datetime_local: String,
}

// Define a struct to hold transaction data with account name
#[derive(Debug, Clone, serde::Serialize)]
struct TransactionWithAccountName {
    id: Uuid,
    source_account_id: Uuid,
    account_name: String,
    destination_account_id: Option<Uuid>,
    payee_name: Option<String>,
    description: String,
    amount: f64,
    category: String,
    transaction_date: chrono::DateTime<chrono::Utc>,
    created_at: chrono::DateTime<chrono::Utc>,
    updated_at: chrono::DateTime<chrono::Utc>,
    currency: String,
}

// Query parameters for transaction filtering
#[derive(Debug, Deserialize)]
pub struct TransactionFilterQuery {
    pub source_account_id: Option<Uuid>,
    pub category: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

// Query parameters for new transaction with preselected account
#[derive(Debug, Deserialize)]
pub struct NewTransactionQuery {
    pub source_account_id: Option<Uuid>,
}

// Define a combined state type for the router
#[derive(Clone)]
pub struct AppState {
    pub account_service: Arc<AccountService>,
    pub transaction_service: Arc<TransactionService>,
}

// Create the web router
pub fn router(account_service: Arc<AccountService>, transaction_service: Arc<TransactionService>) -> Router {
    // Create the app state
    let app_state = AppState {
        account_service,
        transaction_service,
    };

    Router::new()
        // Dashboard route
        .route("/", get(dashboard_handler))

        // Account routes
        .route("/accounts", get(account_list_handler))
        .route("/accounts/new", get(account_new_handler))
        .route("/accounts/{id}", get(account_view_handler))
        .route("/accounts/{id}/edit", get(account_edit_handler))

        // Transaction routes
        .route("/transactions", get(transaction_list_handler))
        .route("/transactions/new", get(transaction_new_handler))
        .route("/transactions/{id}/edit", get(transaction_edit_handler))
        .with_state(app_state)
}

// Dashboard handler
async fn dashboard_handler(
    State(app_state): State<AppState>,
) -> impl IntoResponse {
    let account_service = &app_state.account_service;
    let transaction_service = &app_state.transaction_service;
    // Get all accounts
    let accounts = match account_service.get_accounts().await {
        Ok(accounts) => accounts,
        Err(_) => vec![],
    };

    // Calculate total balance
    let total_balance = accounts.iter().fold(0.0, |acc, account| acc + account.balance);

    // Get recent transactions (last 10)
    let transactions = match transaction_service.get_transactions(None, None, None, None).await {
        Ok(transactions) => transactions,
        Err(_) => vec![],
    };

    // Store the count before moving transactions
    let transactions_count = transactions.len();

    // Get only the 10 most recent transactions
    let recent_transactions = transactions.into_iter()
        .take(10)
        .map(|t| {
            // Find the account for this transaction
            let account = accounts.iter().find(|a| a.id == t.source_account_id).cloned();

            TransactionWithAccountName {
                id: t.id,
                source_account_id: t.source_account_id,
                account_name: account.as_ref().map(|a| a.name.clone()).unwrap_or_else(|| "Unknown".to_string()),
                destination_account_id: t.destination_account_id,
                payee_name: t.payee_name.clone(),
                description: t.description,
                amount: t.amount,
                category: t.category,
                transaction_date: t.transaction_date,
                created_at: t.created_at,
                updated_at: t.updated_at,
                currency: account.as_ref().map(|a| a.currency.clone()).unwrap_or_else(|| "USD".to_string()),
            }
        })
        .collect::<Vec<_>>();

    // Calculate monthly income and expenses
    let now = chrono::Utc::now();
    let start_of_month = chrono::DateTime::from_naive_utc_and_offset(
        chrono::NaiveDateTime::new(
            chrono::NaiveDate::from_ymd_opt(now.year(), now.month(), 1).unwrap(),
            chrono::NaiveTime::from_hms_opt(0, 0, 0).unwrap(),
        ),
        chrono::Utc,
    );

    let monthly_transactions = match transaction_service.get_transactions(None, None, Some(start_of_month), None).await {
        Ok(transactions) => transactions,
        Err(_) => vec![],
    };

    let monthly_income = monthly_transactions.iter()
        .filter(|t| t.amount > 0.0)
        .fold(0.0, |acc, t| acc + t.amount);

    let monthly_expenses = monthly_transactions.iter()
        .filter(|t| t.amount < 0.0)
        .fold(0.0, |acc, t| acc + t.amount);

    let monthly_net = monthly_income + monthly_expenses;

    // Store the accounts count before moving accounts
    let accounts_count = accounts.len();

    // Render the dashboard template
    let template = DashboardTemplate {
        accounts,
        recent_transactions,
        total_balance,
        monthly_income,
        monthly_expenses,
        monthly_net,
        accounts_count,
        transactions_count: transactions_count,
        default_currency: "USD".to_string(),
    };

    match template.render() {
        Ok(html) => Html(html).into_response(),
        Err(_) => Html("<p>Error rendering template</p>").into_response(),
    }
}

// Account list handler
async fn account_list_handler(
    State(app_state): State<AppState>,
) -> impl IntoResponse {
    let account_service = &app_state.account_service;
    // Get all accounts
    let accounts = match account_service.get_accounts().await {
        Ok(accounts) => accounts,
        Err(_) => vec![],
    };

    // Calculate total balance
    let total_balance = accounts.iter().fold(0.0, |acc, account| acc + account.balance);

    // Render the account list template
    let template = AccountListTemplate { accounts, total_balance };

    match template.render() {
        Ok(html) => Html(html).into_response(),
        Err(_) => Html("<p>Error rendering template</p>").into_response(),
    }
}

// Account view handler
async fn account_view_handler(
    Path(id): Path<Uuid>,
    State(app_state): State<AppState>,
) -> impl IntoResponse {
    let account_service = &app_state.account_service;
    let transaction_service = &app_state.transaction_service;
    // Get the account
    let account = match account_service.get_account(id).await {
        Ok(Some(account)) => account,
        Ok(None) => return Redirect::to("/accounts").into_response(),
        Err(_) => return Html("<p>Error fetching account</p>").into_response(),
    };

    // Get transactions for this account
    let transactions = match transaction_service.get_account_transactions(id).await {
        Ok(transactions) => transactions,
        Err(_) => vec![],
    };

    // Render the account view template
    let template = AccountViewTemplate { account, transactions };

    match template.render() {
        Ok(html) => Html(html).into_response(),
        Err(_) => Html("<p>Error rendering template</p>").into_response(),
    }
}

// Account new handler
async fn account_new_handler() -> impl IntoResponse {
    // Render the account new template
    let template = AccountNewTemplate {};

    match template.render() {
        Ok(html) => Html(html).into_response(),
        Err(_) => Html("<p>Error rendering template</p>").into_response(),
    }
}

// Account edit handler
async fn account_edit_handler(
    Path(id): Path<Uuid>,
    State(app_state): State<AppState>,
) -> impl IntoResponse {
    let account_service = &app_state.account_service;
    // Get the account
    let account = match account_service.get_account(id).await {
        Ok(Some(account)) => account,
        Ok(None) => return Redirect::to("/accounts").into_response(),
        Err(_) => return Html("<p>Error fetching account</p>").into_response(),
    };

    // Render the account edit template
    let template = AccountEditTemplate { account };

    match template.render() {
        Ok(html) => Html(html).into_response(),
        Err(_) => Html("<p>Error rendering template</p>").into_response(),
    }
}

// Transaction list handler
async fn transaction_list_handler(
    Query(query): Query<TransactionFilterQuery>,
    State(app_state): State<AppState>,
) -> impl IntoResponse {
    let account_service = &app_state.account_service;
    let transaction_service = &app_state.transaction_service;
    // Get all accounts
    let accounts = match account_service.get_accounts().await {
        Ok(accounts) => accounts,
        Err(_) => vec![],
    };

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

    // Get transactions with filters
    let transactions = match transaction_service.get_transactions(
        query.source_account_id,
        query.category.as_deref(),
        start_date,
        end_date,
    ).await {
        Ok(transactions) => transactions,
        Err(_) => vec![],
    };

    // Transform transactions to include account name
    let transactions_with_account = transactions.into_iter()
        .map(|t| {
            // Find the account for this transaction
            let account = accounts.iter().find(|a| a.id == t.source_account_id).cloned();

            TransactionWithAccountName {
                id: t.id,
                source_account_id: t.source_account_id,
                account_name: account.as_ref().map(|a| a.name.clone()).unwrap_or_else(|| "Unknown".to_string()),
                destination_account_id: t.destination_account_id,
                payee_name: t.payee_name.clone(),
                description: t.description,
                amount: t.amount,
                category: t.category,
                transaction_date: t.transaction_date,
                created_at: t.created_at,
                updated_at: t.updated_at,
                currency: account.as_ref().map(|a| a.currency.clone()).unwrap_or_else(|| "USD".to_string()),
            }
        })
        .collect::<Vec<_>>();

    // Get unique categories
    let mut categories = transactions_with_account.iter()
        .map(|t| t.category.clone())
        .collect::<Vec<_>>();
    categories.sort();
    categories.dedup();

    // Calculate total amount
    let total_amount = transactions_with_account.iter().fold(0.0, |acc, t| acc + t.amount);

    // Render the transaction list template
    let template = TransactionListTemplate {
        transactions: transactions_with_account,
        accounts,
        categories,
        selected_account_id: query.source_account_id,
        selected_category: query.category,
        start_date: query.start_date,
        end_date: query.end_date,
        total_amount,
    };

    match template.render() {
        Ok(html) => Html(html).into_response(),
        Err(_) => Html("<p>Error rendering template</p>").into_response(),
    }
}

// Transaction new handler
async fn transaction_new_handler(
    Query(query): Query<NewTransactionQuery>,
    State(app_state): State<AppState>,
) -> impl IntoResponse {
    let account_service = &app_state.account_service;
    // Get all accounts
    let accounts = match account_service.get_accounts().await {
        Ok(accounts) => accounts,
        Err(_) => vec![],
    };

    // Format current date for datetime-local input
    let now = chrono::Utc::now();
    let current_date = now.format("%Y-%m-%dT%H:%M").to_string();

    // Render the transaction new template
    let template = TransactionNewTemplate {
        accounts,
        preselected_source_account_id: query.source_account_id,
        current_date,
    };

    match template.render() {
        Ok(html) => Html(html).into_response(),
        Err(_) => Html("<p>Error rendering template</p>").into_response(),
    }
}

// Transaction edit handler
async fn transaction_edit_handler(
    Path(id): Path<Uuid>,
    State(app_state): State<AppState>,
) -> impl IntoResponse {
    let account_service = &app_state.account_service;
    let transaction_service = &app_state.transaction_service;
    // Get the transaction
    let transaction = match transaction_service.get_transaction(id).await {
        Ok(Some(transaction)) => transaction,
        Ok(None) => return Redirect::to("/transactions").into_response(),
        Err(_) => return Html("<p>Error fetching transaction</p>").into_response(),
    };

    // Get all accounts
    let accounts = match account_service.get_accounts().await {
        Ok(accounts) => accounts,
        Err(_) => vec![],
    };

    // Format transaction date for datetime-local input
    let datetime_local = transaction.transaction_date.format("%Y-%m-%dT%H:%M").to_string();

    // Render the transaction edit template
    let template = TransactionEditTemplate {
        transaction,
        accounts,
        datetime_local,
    };

    match template.render() {
        Ok(html) => Html(html).into_response(),
        Err(_) => Html("<p>Error rendering template</p>").into_response(),
    }
}
