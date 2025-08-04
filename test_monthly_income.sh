#!/bin/bash

# Set the API URL
API_URL="http://localhost:3000/api"

# Get the current year and month
YEAR=$(date +%Y)
MONTH=$(date +%m)

echo "Testing monthly income calculation for $YEAR-$MONTH"
echo "=================================================="

# Step 1: Create an on-budget account
echo "Creating an on-budget account..."
ACCOUNT_RESPONSE=$(curl -s -X POST "$API_URL/accounts" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test On-Budget Account",
    "account_type": "On Budget",
    "balance": 0,
    "currency": "USD"
  }')

ACCOUNT_ID=$(echo $ACCOUNT_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)
echo "Created account with ID: $ACCOUNT_ID"

# Step 2: Get the initial monthly income
echo "Getting initial monthly income..."
INITIAL_INCOME_RESPONSE=$(curl -s "$API_URL/budgets/monthly-status?year=$YEAR&month=$MONTH")
INITIAL_INCOME=$(echo $INITIAL_INCOME_RESPONSE | grep -o '"incoming_funds":[^,]*' | cut -d':' -f2)
echo "Initial monthly income: $INITIAL_INCOME"

# Step 3: Create a transaction that should increase the monthly income
echo "Creating a transaction with negative amount (incoming)..."
TRANSACTION_RESPONSE=$(curl -s -X POST "$API_URL/transactions" \
  -H "Content-Type: application/json" \
  -d "{
    \"source_account_id\": \"$ACCOUNT_ID\",
    \"destination_name\": \"External Source\",
    \"description\": \"Test Income\",
    \"amount\": -100,
    \"category\": \"Income\",
    \"transaction_date\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"
  }")

TRANSACTION_ID=$(echo $TRANSACTION_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)
echo "Created transaction with ID: $TRANSACTION_ID"

# Step 4: Wait a moment for the transaction to be processed
echo "Waiting for transaction to be processed..."
sleep 1

# Step 5: Get the updated monthly income
echo "Getting updated monthly income..."
UPDATED_INCOME_RESPONSE=$(curl -s "$API_URL/budgets/monthly-status?year=$YEAR&month=$MONTH")
UPDATED_INCOME=$(echo $UPDATED_INCOME_RESPONSE | grep -o '"incoming_funds":[^,]*' | cut -d':' -f2)
echo "Updated monthly income: $UPDATED_INCOME"

# Step 6: Check if the monthly income increased
if (( $(echo "$UPDATED_INCOME > $INITIAL_INCOME" | bc -l) )); then
  echo "SUCCESS: Monthly income increased from $INITIAL_INCOME to $UPDATED_INCOME"
else
  echo "FAILURE: Monthly income did not increase. Initial: $INITIAL_INCOME, Updated: $UPDATED_INCOME"
fi

# Clean up (optional)
echo "Cleaning up..."
curl -s -X DELETE "$API_URL/transactions/$TRANSACTION_ID" > /dev/null
curl -s -X DELETE "$API_URL/accounts/$ACCOUNT_ID" > /dev/null
echo "Done."
