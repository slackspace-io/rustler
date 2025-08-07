#!/bin/bash
set -e

# Test script for account subtypes implementation

echo "Testing account subtypes implementation..."

# Base URL for the API
BASE_URL="http://localhost:3000"

# Create a test account with account_type and account_sub_type
echo "Creating test account with account_type 'On Budget' and account_sub_type 'Credit Card'..."
ACCOUNT_ID=$(curl -s -X POST "$BASE_URL/api/accounts" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Test Account",
    "account_type":"On Budget",
    "account_sub_type":"Credit Card",
    "balance":1000,
    "currency":"USD"
  }' | jq -r '.id')

echo "Account ID: $ACCOUNT_ID"

# Get the created account
echo "Getting created account..."
curl -s -X GET "$BASE_URL/api/accounts/$ACCOUNT_ID" | jq .

# Verify that the account has the correct account_type and account_sub_type
echo "Verifying account_type and account_sub_type..."
ACCOUNT_TYPE=$(curl -s -X GET "$BASE_URL/api/accounts/$ACCOUNT_ID" | jq -r '.account_type')
ACCOUNT_SUB_TYPE=$(curl -s -X GET "$BASE_URL/api/accounts/$ACCOUNT_ID" | jq -r '.account_sub_type')

if [[ "$ACCOUNT_TYPE" != "On Budget" ]]; then
  echo "Error: account_type is not 'On Budget' (got: $ACCOUNT_TYPE)"
  exit 1
fi

if [[ "$ACCOUNT_SUB_TYPE" != "Credit Card" ]]; then
  echo "Error: account_sub_type is not 'Credit Card' (got: $ACCOUNT_SUB_TYPE)"
  exit 1
fi

echo "Account has correct account_type and account_sub_type"

# Update the account with a different account_sub_type
echo "Updating account with a different account_sub_type..."
curl -s -X PUT "$BASE_URL/api/accounts/$ACCOUNT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "account_sub_type":"Checking"
  }' | jq .

# Verify that the account has the updated account_sub_type
echo "Verifying updated account_sub_type..."
ACCOUNT_SUB_TYPE=$(curl -s -X GET "$BASE_URL/api/accounts/$ACCOUNT_ID" | jq -r '.account_sub_type')

if [[ "$ACCOUNT_SUB_TYPE" != "Checking" ]]; then
  echo "Error: account_sub_type was not updated to 'Checking' (got: $ACCOUNT_SUB_TYPE)"
  exit 1
fi

echo "Account has correct updated account_sub_type"

# Update the account with a different account_type
echo "Updating account with a different account_type..."
curl -s -X PUT "$BASE_URL/api/accounts/$ACCOUNT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "account_type":"Off Budget"
  }' | jq .

# Verify that the account has the updated account_type
echo "Verifying updated account_type..."
ACCOUNT_TYPE=$(curl -s -X GET "$BASE_URL/api/accounts/$ACCOUNT_ID" | jq -r '.account_type')

if [[ "$ACCOUNT_TYPE" != "Off Budget" ]]; then
  echo "Error: account_type was not updated to 'Off Budget' (got: $ACCOUNT_TYPE)"
  exit 1
fi

echo "Account has correct updated account_type"

# Delete the test account
echo "Deleting test account..."
curl -s -X DELETE "$BASE_URL/api/accounts/$ACCOUNT_ID"

# Verify deletion
echo "Verifying deletion..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/accounts/$ACCOUNT_ID")
if [[ "$HTTP_STATUS" == "404" ]]; then
  echo "Account successfully deleted (HTTP status: $HTTP_STATUS)"
else
  echo "Error: Account was not deleted (HTTP status: $HTTP_STATUS)"
  exit 1
fi

echo "Test completed successfully!"
