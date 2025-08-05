#!/bin/bash
set -e

# Test script for monthly expenses calculation
# This script tests that expense transactions (positive amounts) are correctly reflected in monthly expenses

echo "Testing monthly expenses calculation..."

# Base URL for the API
BASE_URL="http://localhost:3000/api"

# Get the current year and month
YEAR=$(date +%Y)
MONTH=$(date +%m)

echo "Testing monthly expenses calculation for $YEAR-$MONTH"
echo "=================================================="

# Step 1: Create an on-budget account
echo "Creating an on-budget account..."
ACCOUNT_RESPONSE=$(curl -s -X POST "$BASE_URL/accounts" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Expense Account",
    "account_type": "On Budget",
    "balance": 1000,
    "currency": "USD"
  }')

ACCOUNT_ID=$(echo $ACCOUNT_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)
echo "Created account with ID: $ACCOUNT_ID"

# Step 2: Get the initial monthly expenses
echo "Getting initial monthly status..."
INITIAL_STATUS_RESPONSE=$(curl -s "$BASE_URL/budgets/monthly-status?year=$YEAR&month=$MONTH")
INITIAL_EXPENSES=$(echo $INITIAL_STATUS_RESPONSE | grep -o '"outgoing_funds":[^,]*' | cut -d':' -f2)
echo "Initial monthly expenses: $INITIAL_EXPENSES"

# Step 3: Create a transaction that should increase the monthly expenses
echo "Creating a transaction with positive amount (expense)..."
TRANSACTION_RESPONSE=$(curl -s -X POST "$BASE_URL/transactions" \
  -H "Content-Type: application/json" \
  -d "{
    \"source_account_id\": \"$ACCOUNT_ID\",
    \"destination_name\": \"Grocery Store\",
    \"description\": \"Test Expense\",
    \"amount\": 100,
    \"category\": \"Groceries\",
    \"transaction_date\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"
  }")

TRANSACTION_ID=$(echo $TRANSACTION_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)
echo "Created transaction with ID: $TRANSACTION_ID"

# Step 4: Wait a moment for the transaction to be processed
echo "Waiting for transaction to be processed..."
sleep 1

# Step 5: Get the updated monthly expenses
echo "Getting updated monthly status..."
UPDATED_STATUS_RESPONSE=$(curl -s "$BASE_URL/budgets/monthly-status?year=$YEAR&month=$MONTH")
UPDATED_EXPENSES=$(echo $UPDATED_STATUS_RESPONSE | grep -o '"outgoing_funds":[^,]*' | cut -d':' -f2)
echo "Updated monthly expenses: $UPDATED_EXPENSES"

# Step 6: Check if the monthly expenses increased
if (( $(echo "$UPDATED_EXPENSES > $INITIAL_EXPENSES" | bc -l) )); then
  echo "SUCCESS: Monthly expenses increased from $INITIAL_EXPENSES to $UPDATED_EXPENSES"
else
  echo "FAILURE: Monthly expenses did not increase. Initial: $INITIAL_EXPENSES, Updated: $UPDATED_EXPENSES"
fi

# Clean up
echo "Cleaning up..."
curl -s -X DELETE "$BASE_URL/transactions/$TRANSACTION_ID" > /dev/null
curl -s -X DELETE "$BASE_URL/accounts/$ACCOUNT_ID" > /dev/null
echo "Done."
