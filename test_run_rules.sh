#!/bin/bash
set -e

# Test script for running rules functionality

echo "Testing run rules functionality..."

# Base URL for the API
BASE_URL="http://localhost:3000"

# 1. Create a test rule
echo "Creating test rule..."
RULE_ID=$(curl -s -X POST "$BASE_URL/api/rules" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Run Rule",
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
    "name": "Test Run Rules Account",
    "account_type": "Checking",
    "balance": 1000,
    "currency": "USD"
  }' | jq -r '.id')

echo "Account ID: $ACCOUNT_ID"

# 3. Create a transaction that doesn't match any rule
echo "Creating transaction that doesn't match any rule..."
TRANSACTION_RESPONSE=$(curl -s -X POST "$BASE_URL/api/transactions" \
  -H "Content-Type: application/json" \
  -d "{
    \"source_account_id\": \"$ACCOUNT_ID\",
    \"description\": \"Office supplies purchase\",
    \"amount\": 50.00,
    \"category\": \"Office\",
    \"transaction_date\": \"$(date -Iseconds)\"
  }")
echo "Transaction response: $TRANSACTION_RESPONSE"
TRANSACTION_ID=$(echo $TRANSACTION_RESPONSE | jq -r '.id')

echo "Transaction ID: $TRANSACTION_ID"

# 4. Verify the transaction has the original category
echo "Verifying transaction has original category..."
TRANSACTION=$(curl -s -X GET "$BASE_URL/api/transactions/$TRANSACTION_ID")
CATEGORY=$(echo $TRANSACTION | jq -r '.category')
if [[ "$CATEGORY" == "Office" ]]; then
  echo "Transaction has original category: $CATEGORY"
else
  echo "ERROR: Transaction has unexpected category: $CATEGORY"
  exit 1
fi

# 5. Update the transaction to match the rule
echo "Updating transaction to match the rule..."
UPDATE_RESPONSE=$(curl -s -X PUT "$BASE_URL/api/transactions/$TRANSACTION_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Weekly groceries shopping"
  }')
echo "Update response: $UPDATE_RESPONSE"

# 6. Verify the transaction still has the original category (rules don't run on update in this test)
echo "Verifying transaction still has original category..."
TRANSACTION=$(curl -s -X GET "$BASE_URL/api/transactions/$TRANSACTION_ID")
CATEGORY=$(echo $TRANSACTION | jq -r '.category')
if [[ "$CATEGORY" == "Office" ]]; then
  echo "Transaction still has original category: $CATEGORY"
else
  echo "NOTE: Transaction category was automatically updated to: $CATEGORY"
  # We'll continue the test anyway
fi

# 7. Run the specific rule
echo "Running the specific rule..."
RULE_RUN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/rules/$RULE_ID/run" \
  -H "Content-Type: application/json" \
  -d '{}')
echo "Rule run response: $RULE_RUN_RESPONSE"

# 8. Get the transaction to verify the rule was applied
echo "Getting transaction to verify rule was applied..."
sleep 2  # Give the system time to apply the rule
TRANSACTION=$(curl -s -X GET "$BASE_URL/api/transactions/$TRANSACTION_ID")
echo $TRANSACTION | jq .

# 9. Check if the category was updated to "Food"
CATEGORY=$(echo $TRANSACTION | jq -r '.category')
if [[ "$CATEGORY" == "Food" ]]; then
  echo "SUCCESS: Rule was applied correctly! Category was set to 'Food'"
else
  echo "ERROR: Rule was not applied. Category is still '$CATEGORY'"
  exit 1
fi

# 10. Create another transaction that doesn't match any rule
echo "Creating another transaction that doesn't match any rule..."
TRANSACTION2_RESPONSE=$(curl -s -X POST "$BASE_URL/api/transactions" \
  -H "Content-Type: application/json" \
  -d "{
    \"source_account_id\": \"$ACCOUNT_ID\",
    \"description\": \"Restaurant dinner\",
    \"amount\": 120.00,
    \"category\": \"Dining\",
    \"transaction_date\": \"$(date -Iseconds)\"
  }")
TRANSACTION2_ID=$(echo $TRANSACTION2_RESPONSE | jq -r '.id')

echo "Transaction 2 ID: $TRANSACTION2_ID"

# 11. Update the transaction to match the rule
echo "Updating transaction to match the rule..."
UPDATE2_RESPONSE=$(curl -s -X PUT "$BASE_URL/api/transactions/$TRANSACTION2_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Monthly groceries stock-up"
  }')
echo "Update response: $UPDATE2_RESPONSE"

# 12. Verify the transaction still has the original category (rules don't run on update in this test)
echo "Verifying transaction still has original category..."
TRANSACTION2=$(curl -s -X GET "$BASE_URL/api/transactions/$TRANSACTION2_ID")
CATEGORY2=$(echo $TRANSACTION2 | jq -r '.category')
if [[ "$CATEGORY2" == "Dining" ]]; then
  echo "Transaction still has original category: $CATEGORY2"
else
  echo "NOTE: Transaction category was automatically updated to: $CATEGORY2"
  # We'll continue the test anyway
fi

# 13. Run all rules
echo "Running all rules..."
ALL_RULES_RUN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/rules/run" \
  -H "Content-Type: application/json" \
  -d '{}')
echo "All rules run response: $ALL_RULES_RUN_RESPONSE"

# 14. Get the second transaction to verify the rule was applied
echo "Getting transaction 2 to verify rule was applied..."
sleep 2  # Give the system time to apply the rule
TRANSACTION2=$(curl -s -X GET "$BASE_URL/api/transactions/$TRANSACTION2_ID")
echo $TRANSACTION2 | jq .

# 15. Check if the category was updated to "Food"
CATEGORY2=$(echo $TRANSACTION2 | jq -r '.category')
if [[ "$CATEGORY2" == "Food" ]]; then
  echo "SUCCESS: All rules were applied correctly! Category was set to 'Food'"
else
  echo "ERROR: All rules were not applied. Category is still '$CATEGORY2'"
  exit 1
fi

# 16. Clean up - delete the rule
echo "Cleaning up - deleting rule..."
curl -s -X DELETE "$BASE_URL/api/rules/$RULE_ID"

# 17. Clean up - delete the transactions
echo "Cleaning up - deleting transactions..."
curl -s -X DELETE "$BASE_URL/api/transactions/$TRANSACTION_ID"
curl -s -X DELETE "$BASE_URL/api/transactions/$TRANSACTION2_ID"

# 18. Clean up - delete the account
echo "Cleaning up - deleting account..."
curl -s -X DELETE "$BASE_URL/api/accounts/$ACCOUNT_ID"

echo "Test completed successfully!"
