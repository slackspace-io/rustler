#!/bin/bash
set -e

# Test script to reproduce the issue where accounts with subtypes don't appear on reports/dashboard
echo "Testing account subtype display issue..."

# Base URL for the API
BASE_URL="http://localhost:3000"

# Create test accounts with different subtypes
echo "Creating test accounts with different subtypes..."

# Create a regular On Budget account (no subtype)
echo "Creating regular On Budget account (no subtype)..."
REGULAR_ON_BUDGET_ID=$(curl -s -X POST "$BASE_URL/api/accounts" \
  -H "Content-Type: application/json" \
  -d '{"name":"Regular On Budget","account_type":"On Budget","balance":1000,"currency":"USD"}' \
  | jq -r '.id')

echo "Regular On Budget Account ID: $REGULAR_ON_BUDGET_ID"

# Create an On Budget - Checking account (with subtype)
echo "Creating On Budget - Checking account (with subtype)..."
CHECKING_ID=$(curl -s -X POST "$BASE_URL/api/accounts" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Checking","account_type":"On Budget - Checking","balance":1000,"currency":"USD"}' \
  | jq -r '.id')

echo "Checking Account ID: $CHECKING_ID"

# Create a regular Off Budget account (no subtype)
echo "Creating regular Off Budget account (no subtype)..."
REGULAR_OFF_BUDGET_ID=$(curl -s -X POST "$BASE_URL/api/accounts" \
  -H "Content-Type: application/json" \
  -d '{"name":"Regular Off Budget","account_type":"Off Budget","balance":5000,"currency":"USD"}' \
  | jq -r '.id')

echo "Regular Off Budget Account ID: $REGULAR_OFF_BUDGET_ID"

# Create an Off Budget - Asset account (with subtype)
echo "Creating Off Budget - Asset account (with subtype)..."
ASSET_ID=$(curl -s -X POST "$BASE_URL/api/accounts" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Asset","account_type":"Off Budget - Asset","balance":250000,"currency":"USD"}' \
  | jq -r '.id')

echo "Asset Account ID: $ASSET_ID"

# Get all accounts and verify the account types
echo "Getting all accounts to verify account types..."
curl -s -X GET "$BASE_URL/api/accounts" | jq '.[] | {id: .id, name: .name, account_type: .account_type, balance: .balance}'

echo ""
echo "ISSUE DESCRIPTION:"
echo "The accounts with subtypes (Test Checking and Test Asset) will not appear on the dashboard or reports."
echo "To verify this issue:"
echo "1. Open the application in your browser"
echo "2. Go to the Dashboard - you should only see 'Regular On Budget' and 'Regular Off Budget' accounts"
echo "3. Go to Reports > Balance Over Time - you should only see 'Regular On Budget' and 'Regular Off Budget' accounts"
echo ""
echo "After applying the fix, the accounts with subtypes should appear correctly."
echo ""

# Wait for user to verify the issue
read -p "Press Enter after verifying the issue to clean up test accounts..."

# Clean up - delete all test accounts
echo "Cleaning up - deleting test accounts..."

# Delete accounts
for ACCOUNT_ID in "$REGULAR_ON_BUDGET_ID" "$CHECKING_ID" "$REGULAR_OFF_BUDGET_ID" "$ASSET_ID"; do
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
