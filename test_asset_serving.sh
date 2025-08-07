#!/bin/bash
set -e

echo "Testing asset serving..."

# Base URL for the application
BASE_URL="http://localhost:3000"

# Check if the application is running
echo "Checking if the application is running..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL")
if [[ "$HTTP_STATUS" != "200" ]]; then
  echo "Error: Application is not running (HTTP status: $HTTP_STATUS)"
  echo "Please start the application with 'cargo run' before running this test."
  exit 1
fi

# Get the index.html content
INDEX_CONTENT=$(curl -s "$BASE_URL")

# Extract JavaScript asset paths from index.html
echo "Extracting JavaScript asset paths from index.html..."
JS_ASSETS=$(echo "$INDEX_CONTENT" | grep -o 'src="/assets/[^"]*\.js"' | sed 's/src="//g' | sed 's/"//g')

if [[ -z "$JS_ASSETS" ]]; then
  echo "No JavaScript assets found in index.html. This is unexpected."
  exit 1
fi

echo "Found JavaScript assets:"
echo "$JS_ASSETS"
echo ""

# Test each JavaScript asset
FAILED=0

for asset in $JS_ASSETS; do
  echo "Testing asset: $asset"
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$asset")
  if [[ "$HTTP_STATUS" == "200" ]]; then
    echo "✓ Asset $asset is accessible (HTTP status: $HTTP_STATUS)"
  else
    echo "✗ Asset $asset is not accessible (HTTP status: $HTTP_STATUS)"
    FAILED=$((FAILED + 1))
  fi
done

echo ""
if [[ "$FAILED" -eq 0 ]]; then
  echo "All JavaScript assets are accessible. Asset serving is working correctly!"
else
  echo "$FAILED JavaScript assets are not accessible. Asset serving is not working correctly."
  exit 1
fi

# Test asset serving after refreshing the accounts page
echo ""
echo "Testing asset serving after refreshing the accounts page..."

# Get the accounts page content
ACCOUNTS_CONTENT=$(curl -s "$BASE_URL/accounts")

# Extract JavaScript asset paths from accounts page
echo "Extracting JavaScript asset paths from accounts page..."
ACCOUNTS_JS_ASSETS=$(echo "$ACCOUNTS_CONTENT" | grep -o 'src="/assets/[^"]*\.js"' | sed 's/src="//g' | sed 's/"//g')

if [[ -z "$ACCOUNTS_JS_ASSETS" ]]; then
  echo "No JavaScript assets found in accounts page. This is unexpected."
  exit 1
fi

echo "Found JavaScript assets on accounts page:"
echo "$ACCOUNTS_JS_ASSETS"
echo ""

# Test each JavaScript asset from accounts page
FAILED=0

for asset in $ACCOUNTS_JS_ASSETS; do
  echo "Testing asset from accounts page: $asset"
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$asset")
  if [[ "$HTTP_STATUS" == "200" ]]; then
    echo "✓ Asset $asset is accessible from accounts page (HTTP status: $HTTP_STATUS)"
  else
    echo "✗ Asset $asset is not accessible from accounts page (HTTP status: $HTTP_STATUS)"
    FAILED=$((FAILED + 1))
  fi
done

echo ""
if [[ "$FAILED" -eq 0 ]]; then
  echo "All JavaScript assets are accessible from accounts page. Asset serving is working correctly!"
else
  echo "$FAILED JavaScript assets are not accessible from accounts page. Asset serving is not working correctly."
  exit 1
fi

echo ""
echo "Test completed successfully!"
