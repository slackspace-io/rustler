#!/bin/bash
set -e

# Test script for decimal separator setting

echo "Testing decimal separator setting..."

# Base URL for the API
BASE_URL="http://localhost:3000"

# First, check the current setting
echo "Checking current settings..."
SETTINGS=$(curl -s -X GET "$BASE_URL/api/settings")
echo "Current settings: $SETTINGS"

# Set the decimal separator to comma
echo "Setting decimal separator to comma..."
curl -s -X PUT "$BASE_URL/api/settings" \
  -H "Content-Type: application/json" \
  -d '{"numberFormat":"comma"}' | jq .

# Verify the setting was changed
echo "Verifying setting was changed..."
SETTINGS=$(curl -s -X GET "$BASE_URL/api/settings")
echo "Updated settings: $SETTINGS"

# Get an account to check the formatting
echo "Getting an account to check formatting..."
ACCOUNT_ID=$(curl -s -X GET "$BASE_URL/api/accounts" | jq -r '.[0].id')
echo "Account ID: $ACCOUNT_ID"

# Get the account details
echo "Getting account details..."
ACCOUNT=$(curl -s -X GET "$BASE_URL/api/accounts/$ACCOUNT_ID")
echo "Account details: $ACCOUNT"

# Check if the balance is formatted with a comma
echo "Checking if balance is formatted with a comma in the UI..."
echo "Please manually verify that the account balance is displayed with a comma as the decimal separator in the UI."
echo "Navigate to http://localhost:3000/accounts/$ACCOUNT_ID in your browser."

# Set the decimal separator back to period
echo "Setting decimal separator back to period..."
curl -s -X PUT "$BASE_URL/api/settings" \
  -H "Content-Type: application/json" \
  -d '{"numberFormat":"decimal"}' | jq .

# Verify the setting was changed back
echo "Verifying setting was changed back..."
SETTINGS=$(curl -s -X GET "$BASE_URL/api/settings")
echo "Final settings: $SETTINGS"

echo "Test completed. Please verify in the UI that the decimal separator setting is being applied correctly."
