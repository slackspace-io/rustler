#!/bin/bash
set -e

# Test script to reproduce the credit card account type bug

echo "Testing credit card account type bug..."

# Base URL for the API
BASE_URL="http://localhost:3000"

# Create a regular On Budget account
echo "Creating On Budget account..."
ACCOUNT_ID=$(curl -s -X POST "$BASE_URL/api/accounts" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Regular Account","account_type":"On Budget","balance":1000,"currency":"USD"}' \
  | jq -r '.id')

echo "Account ID: $ACCOUNT_ID"

# Get the account to verify it's created as On Budget
echo "Getting account to verify type..."
curl -s -X GET "$BASE_URL/api/accounts/$ACCOUNT_ID" | jq '.'

# Update the account to be On Budget - Credit Card
echo "Updating account to On Budget - Credit Card..."
curl -s -X PUT "$BASE_URL/api/accounts/$ACCOUNT_ID" \
  -H "Content-Type: application/json" \
  -d '{"account_type":"On Budget - Credit Card"}' \
  | jq '.'

# Get the updated account
echo "Getting updated account..."
curl -s -X GET "$BASE_URL/api/accounts/$ACCOUNT_ID" | jq '.'

# Get all accounts to see how they're categorized
echo "Getting all accounts to see categorization..."
curl -s -X GET "$BASE_URL/api/accounts" | jq '.[] | {id: .id, name: .name, account_type: .account_type}'

echo "Test completed. Please check the UI to see if the account appears under 'On Budget' or 'Other Accounts'."
