#!/bin/bash
set -e

# Test script for rules functionality

echo "Testing rules functionality..."

# Base URL for the API
BASE_URL="http://localhost:3000"

# 1. Create a test rule
echo "Creating test rule..."
RULE_ID=$(curl -s -X POST "$BASE_URL/api/rules" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Rule",
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

# 2. Get the created rule
echo "Getting created rule..."
curl -s -X GET "$BASE_URL/api/rules/$RULE_ID" | jq .

# 3. Create a test account if needed
echo "Creating test account..."
ACCOUNT_ID=$(curl -s -X POST "$BASE_URL/api/accounts" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Account",
    "account_type": "Checking",
    "balance": 1000,
    "currency": "USD"
  }' | jq -r '.id')

echo "Account ID: $ACCOUNT_ID"

# 4. Create a transaction that should match the rule
echo "Creating transaction that should match the rule..."
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

# 5. Get the transaction to verify the rule was applied
echo "Getting transaction to verify rule was applied..."
echo "Waiting 5 seconds for the rule to be applied..."
sleep 5  # Give the system more time to apply the rule
TRANSACTION=$(curl -s -X GET "$BASE_URL/api/transactions/$TRANSACTION_ID")
echo $TRANSACTION | jq .

# 6. Check if the category was updated to "Food"
CATEGORY=$(echo $TRANSACTION | jq -r '.category')
if [[ "$CATEGORY" == "Food" ]]; then
  echo "SUCCESS: Rule was applied correctly! Category was set to 'Food'"
else
  echo "ERROR: Rule was not applied. Category is still '$CATEGORY'"
  exit 1
fi

# 7. Clean up - delete the rule
echo "Cleaning up - deleting rule..."
curl -s -X DELETE "$BASE_URL/api/rules/$RULE_ID"

# 8. Clean up - delete the transaction
echo "Cleaning up - deleting transaction..."
curl -s -X DELETE "$BASE_URL/api/transactions/$TRANSACTION_ID"

# 9. Clean up - delete the account
echo "Cleaning up - deleting account..."
curl -s -X DELETE "$BASE_URL/api/accounts/$ACCOUNT_ID"

echo "Test completed successfully!"
