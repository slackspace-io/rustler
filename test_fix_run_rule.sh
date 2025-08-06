#!/bin/bash
set -e

# Test script for the fixed run rule functionality

echo "Testing fixed run rule functionality..."

# Base URL for the API
BASE_URL="http://localhost:3000"

# 1. Create a test rule
echo "Creating test rule..."
RULE_ID=$(curl -s -X POST "$BASE_URL/api/rules" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Fix Run Rule",
    "description": "A test rule that categorizes transactions containing groceries as Food",
    "is_active": true,
    "priority": 100,
    "conditions": [
      {
        "condition_type": "description_contains",
        "value": "groceries"
      }
    ],
    "actions": [
      {
        "action_type": "set_category",
        "value": "Food"
      }
    ]
  }' | jq -r '.id')

echo "Rule ID: $RULE_ID"

# 2. Create a test account
echo "Creating test account..."
ACCOUNT_ID=$(curl -s -X POST "$BASE_URL/api/accounts" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Fix Run Rule Account",
    "account_type": "Checking",
    "balance": 1000,
    "currency": "USD"
  }' | jq -r '.id')

echo "Account ID: $ACCOUNT_ID"

# 3. Create a transaction that matches the rule
echo "Creating transaction that matches the rule..."
TRANSACTION_RESPONSE=$(curl -s -X POST "$BASE_URL/api/transactions" \
  -H "Content-Type: application/json" \
  -d "{
    \"source_account_id\": \"$ACCOUNT_ID\",
    \"description\": \"Weekly groceries shopping\",
    \"amount\": 50.00,
    \"category\": \"Uncategorized\",
    \"transaction_date\": \"$(date -Iseconds)\"
  }")
echo "Transaction response: $TRANSACTION_RESPONSE"
TRANSACTION_ID=$(echo $TRANSACTION_RESPONSE | jq -r '.id')

echo "Transaction ID: $TRANSACTION_ID"

# 4. Run the specific rule with the fixed endpoint
echo "Running the specific rule with the fixed endpoint..."
RULE_RUN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/rules/$RULE_ID/run" \
  -H "Content-Type: application/json" \
  -d "null")
echo "Rule run response: $RULE_RUN_RESPONSE"

# 5. Check if the rule run was successful
if [[ "$RULE_RUN_RESPONSE" == *"Successfully applied rule"* ]]; then
  echo "SUCCESS: Rule run endpoint is working correctly!"
else
  echo "ERROR: Rule run endpoint is still not working correctly."
  exit 1
fi

# 6. Clean up - delete the rule
echo "Cleaning up - deleting rule..."
curl -s -X DELETE "$BASE_URL/api/rules/$RULE_ID"

# 7. Clean up - delete the transaction
echo "Cleaning up - deleting transaction..."
curl -s -X DELETE "$BASE_URL/api/transactions/$TRANSACTION_ID"

# 8. Clean up - delete the account
echo "Cleaning up - deleting account..."
curl -s -X DELETE "$BASE_URL/api/accounts/$ACCOUNT_ID"

echo "Test completed successfully!"
