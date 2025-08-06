#!/bin/bash
set -e

# Comprehensive test script for all account types and subtypes

echo "Testing all account types and subtypes..."

# Base URL for the API
BASE_URL="http://localhost:3000"

# Array to store all created account IDs
declare -a ACCOUNT_IDS

# Function to create an account and store its ID
create_account() {
  local name=$1
  local type=$2
  local balance=$3

  echo "Creating account: $name ($type) with balance $balance..."
  local id=$(curl -s -X POST "$BASE_URL/api/accounts" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$name\",\"account_type\":\"$type\",\"balance\":$balance,\"currency\":\"USD\"}" \
    | jq -r '.id')

  echo "Account ID: $id"
  ACCOUNT_IDS+=("$id")

  # Return the ID
  echo "$id"
}

# Function to update an account's type
update_account_type() {
  local id=$1
  local new_type=$2

  echo "Updating account $id to type: $new_type..."
  curl -s -X PUT "$BASE_URL/api/accounts/$id" \
    -H "Content-Type: application/json" \
    -d "{\"account_type\":\"$new_type\"}" \
    | jq '.'
}

# Function to get an account
get_account() {
  local id=$1

  echo "Getting account $id..."
  curl -s -X GET "$BASE_URL/api/accounts/$id" | jq '.'
}

# Function to clean up all created accounts
cleanup_accounts() {
  echo "Cleaning up all created accounts..."

  for id in "${ACCOUNT_IDS[@]}"; do
    echo "Deleting account $id..."
    curl -s -X DELETE "$BASE_URL/api/accounts/$id"

    # Verify deletion
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/accounts/$id")
    if [[ "$HTTP_STATUS" == "404" ]]; then
      echo "Account successfully deleted (HTTP status: $HTTP_STATUS)"
    else
      echo "Note: Account was not deleted (HTTP status: $HTTP_STATUS)"
    fi
  done
}

# Test 1: Create and test all On Budget account subtypes
echo "=== Testing On Budget account subtypes ==="

# Create On Budget (no subtype)
ON_BUDGET_ID=$(create_account "Test On Budget" "On Budget" 1000)

# Create On Budget - Checking
CHECKING_ID=$(create_account "Test Checking" "On Budget - Checking" 2000)

# Create On Budget - Savings
SAVINGS_ID=$(create_account "Test Savings" "On Budget - Savings" 3000)

# Create On Budget - Credit Card
CREDIT_CARD_ID=$(create_account "Test Credit Card" "On Budget - Credit Card" -500)

# Create On Budget - Investments
ON_BUDGET_INVESTMENTS_ID=$(create_account "Test On Budget Investments" "On Budget - Investments" 10000)

# Test 2: Create and test all Off Budget account subtypes
echo "=== Testing Off Budget account subtypes ==="

# Create Off Budget (no subtype)
OFF_BUDGET_ID=$(create_account "Test Off Budget" "Off Budget" 5000)

# Create Off Budget - Loan
LOAN_ID=$(create_account "Test Loan" "Off Budget - Loan" -20000)

# Create Off Budget - Asset
ASSET_ID=$(create_account "Test Asset" "Off Budget - Asset" 250000)

# Create Off Budget - Investments
OFF_BUDGET_INVESTMENTS_ID=$(create_account "Test Off Budget Investments" "Off Budget - Investments" 50000)

# Test 3: Create and test External account
echo "=== Testing External account ==="

# Create External
EXTERNAL_ID=$(create_account "Test External" "External" 1000)

# Test 4: Test account type updates
echo "=== Testing account type updates ==="

# Update On Budget to On Budget - Credit Card
echo "Updating On Budget to On Budget - Credit Card..."
update_account_type "$ON_BUDGET_ID" "On Budget - Credit Card"
get_account "$ON_BUDGET_ID"

# Update On Budget - Checking to On Budget - Savings
echo "Updating On Budget - Checking to On Budget - Savings..."
update_account_type "$CHECKING_ID" "On Budget - Savings"
get_account "$CHECKING_ID"

# Update Off Budget to Off Budget - Loan
echo "Updating Off Budget to Off Budget - Loan..."
update_account_type "$OFF_BUDGET_ID" "Off Budget - Loan"
get_account "$OFF_BUDGET_ID"

# Get all accounts to see how they're categorized
echo "=== Getting all accounts to see categorization ==="
curl -s -X GET "$BASE_URL/api/accounts" | jq '.[] | {id: .id, name: .name, account_type: .account_type}'

# Clean up
cleanup_accounts

echo "Test completed. Please check the UI to verify account categorization."
