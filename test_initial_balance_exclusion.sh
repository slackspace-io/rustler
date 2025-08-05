#!/bin/bash
set -e

# Test script to verify that Initial Balance transactions are excluded from monthly expenses
echo "Testing Initial Balance exclusion from monthly expenses..."

# Base URL for the API
BASE_URL="http://localhost:3000/api"

# Step 1: Create an account with a negative initial balance
echo "Creating an account with a negative initial balance..."
ACCOUNT_RESPONSE=$(curl -s -X POST "$BASE_URL/accounts" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Negative Balance Account",
    "account_type": "On Budget",
    "balance": -500,
    "currency": "USD"
  }')

ACCOUNT_ID=$(echo $ACCOUNT_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)
echo "Created account with ID: $ACCOUNT_ID"

# Step 2: Get all transactions for the account
echo "Getting transactions for the account..."
TRANSACTIONS_RESPONSE=$(curl -s "$BASE_URL/accounts/$ACCOUNT_ID/transactions")
echo "Transactions:"
echo "$TRANSACTIONS_RESPONSE" | jq '.'

# Step 3: Verify that there is an Initial Balance transaction
INITIAL_BALANCE_COUNT=$(echo "$TRANSACTIONS_RESPONSE" | jq '[.[] | select(.category == "Initial Balance")] | length')
echo "Number of Initial Balance transactions: $INITIAL_BALANCE_COUNT"

if [ "$INITIAL_BALANCE_COUNT" -gt 0 ]; then
  echo "SUCCESS: Found Initial Balance transaction"
else
  echo "FAILURE: No Initial Balance transaction found"
  exit 1
fi

# Step 4: Create a regular expense transaction
echo "Creating a regular expense transaction..."
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

# Step 5: Wait a moment for the transaction to be processed
echo "Waiting for transaction to be processed..."
sleep 1

# Step 6: Get all transactions again
echo "Getting updated transactions..."
UPDATED_TRANSACTIONS=$(curl -s "$BASE_URL/accounts/$ACCOUNT_ID/transactions")
echo "Updated transactions:"
echo "$UPDATED_TRANSACTIONS" | jq '.'

# Step 7: Verify that both transactions are present
TOTAL_TRANSACTIONS=$(echo "$UPDATED_TRANSACTIONS" | jq '. | length')
echo "Total number of transactions: $TOTAL_TRANSACTIONS"

if [ "$TOTAL_TRANSACTIONS" -eq 2 ]; then
  echo "SUCCESS: Both transactions are present"
else
  echo "FAILURE: Expected 2 transactions, found $TOTAL_TRANSACTIONS"
  exit 1
fi

# Step 8: Clean up
echo "Cleaning up..."
curl -s -X DELETE "$BASE_URL/transactions/$TRANSACTION_ID" > /dev/null
curl -s -X DELETE "$BASE_URL/accounts/$ACCOUNT_ID" > /dev/null
echo "Done."

echo "Test completed successfully!"
