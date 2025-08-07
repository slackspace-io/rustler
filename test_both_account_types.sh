#!/bin/bash
set -e

# Test script for selecting both on-budget and off-budget accounts in the balance graph

echo "Testing selection of both on-budget and off-budget accounts in the balance graph..."

# Base URL for the API
BASE_URL="http://localhost:3000"

# Get all accounts
echo "Getting all accounts..."
ALL_ACCOUNTS=$(curl -s -X GET "$BASE_URL/api/accounts")

# Display all accounts with their types
echo "All accounts with their types:"
echo "$ALL_ACCOUNTS" | jq -r '.[] | "\(.id) | \(.name) | \(.account_type)"'

# Extract on-budget accounts
echo -e "\nOn-budget accounts:"
ON_BUDGET_ACCOUNTS=$(echo "$ALL_ACCOUNTS" | jq -r '.[] | select(.account_type | startswith("on-budget")) | "\(.id) | \(.name) | \(.account_type)"')
echo "$ON_BUDGET_ACCOUNTS"

# Extract off-budget accounts
echo -e "\nOff-budget accounts:"
OFF_BUDGET_ACCOUNTS=$(echo "$ALL_ACCOUNTS" | jq -r '.[] | select(.account_type | startswith("off-budget")) | "\(.id) | \(.name) | \(.account_type)"')
echo "$OFF_BUDGET_ACCOUNTS"

# Instructions for manual testing
echo -e "\n=== Manual Testing Instructions ==="
echo "1. Open the application in your browser and navigate to the Balance Over Time report."
echo "2. Select the new 'Both Account Types' option in the account filter."
echo "3. Verify that both on-budget and off-budget accounts are displayed in the account selection list."
echo "4. Select at least one on-budget account and one off-budget account."
echo "5. Verify that the graph displays data for both types of accounts."
echo "6. Try switching between 'Individual Lines Per Account' and 'Single Line (Sum of All Accounts)' display modes."
echo "7. Verify that the graph updates correctly in both modes."

echo -e "\nTest completed. Please follow the manual testing instructions to verify the functionality."
