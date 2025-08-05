#!/bin/bash
set -e

# Test script for SPA routing
echo "Testing SPA routing..."

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

# Function to check if a path returns index.html content
check_path() {
  local path=$1
  echo "Testing path: $path"

  # Get the content of the root path (index.html)
  ROOT_CONTENT=$(curl -s "$BASE_URL" | grep -o "<title>Rustler Finance</title>")

  # Get the content of the specified path
  PATH_CONTENT=$(curl -s "$BASE_URL$path" | grep -o "<title>Rustler Finance</title>")

  # Check if the path returns the same content as the root path
  if [[ "$PATH_CONTENT" == "$ROOT_CONTENT" ]]; then
    echo "✓ Path $path returns index.html content"
    return 0
  else
    echo "✗ Path $path does not return index.html content"
    return 1
  fi
}

# Test various paths
PATHS=(
  "/accounts"
  "/transactions"
  "/budgets"
  "/categories"
  "/settings"
  "/accounts/new"
  "/transactions/new"
  "/non-existent-path"
)

FAILED=0

for path in "${PATHS[@]}"; do
  if ! check_path "$path"; then
    FAILED=$((FAILED + 1))
  fi
done

echo ""
if [[ "$FAILED" -eq 0 ]]; then
  echo "All paths return index.html content. SPA routing is working correctly!"
else
  echo "$FAILED paths failed to return index.html content. SPA routing is not working correctly."
  exit 1
fi

echo ""
echo "Test completed!"
