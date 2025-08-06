#!/bin/bash
set -e

# Test script for account subtypes

echo "Testing account subtypes..."

# Base URL for the API
BASE_URL="http://localhost:3000"

# Create test accounts with different subtypes
echo "Creating test accounts with different subtypes..."

# Create an On Budget - Checking account
echo "Creating On Budget - Checking account..."
CHECKING_ID=$(curl -s -X POST "$BASE_URL/api/accounts" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Checking","account_type":"On Budget - Checking","balance":1000,"currency":"USD"}' \
  | jq -r '.id')

echo "Checking Account ID: $CHECKING_ID"

# Create an On Budget - Savings account
echo "Creating On Budget - Savings account..."
SAVINGS_ID=$(curl -s -X POST "$BASE_URL/api/accounts" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Savings","account_type":"On Budget - Savings","balance":5000,"currency":"USD"}' \
  | jq -r '.id')

echo "Savings Account ID: $SAVINGS_ID"

# Create an On Budget - Credit Card account
echo "Creating On Budget - Credit Card account..."
CREDIT_CARD_ID=$(curl -s -X POST "$BASE_URL/api/accounts" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Credit Card","account_type":"On Budget - Credit Card","balance":-500,"currency":"USD"}' \
  | jq -r '.id')

echo "Credit Card Account ID: $CREDIT_CARD_ID"

# Create an On Budget - Investments account
echo "Creating On Budget - Investments account..."
ON_BUDGET_INVESTMENTS_ID=$(curl -s -X POST "$BASE_URL/api/accounts" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test On Budget Investments","account_type":"On Budget - Investments","balance":10000,"currency":"USD"}' \
  | jq -r '.id')

echo "On Budget Investments Account ID: $ON_BUDGET_INVESTMENTS_ID"

# Create an Off Budget - Loan account
echo "Creating Off Budget - Loan account..."
LOAN_ID=$(curl -s -X POST "$BASE_URL/api/accounts" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Loan","account_type":"Off Budget - Loan","balance":-20000,"currency":"USD"}' \
  | jq -r '.id')

echo "Loan Account ID: $LOAN_ID"

# Create an Off Budget - Asset account
echo "Creating Off Budget - Asset account..."
ASSET_ID=$(curl -s -X POST "$BASE_URL/api/accounts" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Asset","account_type":"Off Budget - Asset","balance":250000,"currency":"USD"}' \
  | jq -r '.id')

echo "Asset Account ID: $ASSET_ID"

# Create an Off Budget - Investments account
echo "Creating Off Budget - Investments account..."
OFF_BUDGET_INVESTMENTS_ID=$(curl -s -X POST "$BASE_URL/api/accounts" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Off Budget Investments","account_type":"Off Budget - Investments","balance":50000,"currency":"USD"}' \
  | jq -r '.id')

echo "Off Budget Investments Account ID: $OFF_BUDGET_INVESTMENTS_ID"

# Get all accounts and verify the account types
echo "Getting all accounts to verify account types..."
curl -s -X GET "$BASE_URL/api/accounts" | jq '.[] | {id: .id, name: .name, account_type: .account_type, balance: .balance}'

# Update an account to change its type
echo "Updating Checking account to Savings account type..."
curl -s -X PUT "$BASE_URL/api/accounts/$CHECKING_ID" \
  -H "Content-Type: application/json" \
  -d '{"account_type":"On Budget - Savings"}' \
  | jq '.'

# Get the updated account
echo "Getting updated account..."
curl -s -X GET "$BASE_URL/api/accounts/$CHECKING_ID" | jq '.'

# Clean up - delete all test accounts
echo "Cleaning up - deleting test accounts..."

# Delete accounts
for ACCOUNT_ID in "$CHECKING_ID" "$SAVINGS_ID" "$CREDIT_CARD_ID" "$ON_BUDGET_INVESTMENTS_ID" "$LOAN_ID" "$ASSET_ID" "$OFF_BUDGET_INVESTMENTS_ID"; do
  echo "Deleting account $ACCOUNT_ID..."
  curl -s -X DELETE "$BASE_URL/api/accounts/$ACCOUNT_ID"

  # Verify deletion
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/accounts/$ACCOUNT_ID")
  if [[ "$HTTP_STATUS" == "404" ]]; then
    echo "Account successfully deleted (HTTP status: $HTTP_STATUS)"
  else
    echo "Error: Account was not deleted (HTTP status: $HTTP_STATUS)"
  fi
done

echo "Test completed successfully!"
