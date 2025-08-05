#!/bin/bash
set -e

# Test script for PWA functionality
echo "Testing PWA functionality..."

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

# Check if the manifest file is accessible
echo "Checking manifest.json..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/manifest.json")
if [[ "$HTTP_STATUS" == "200" ]]; then
  echo "✓ manifest.json is accessible"
else
  echo "✗ manifest.json is not accessible (HTTP status: $HTTP_STATUS)"
fi

# Check if the service worker is accessible
echo "Checking service worker..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/sw.js")
if [[ "$HTTP_STATUS" == "200" ]]; then
  echo "✓ Service worker (sw.js) is accessible"
else
  echo "✗ Service worker (sw.js) is not accessible (HTTP status: $HTTP_STATUS)"
fi

# Check if the HTML includes the required PWA meta tags
echo "Checking PWA meta tags in HTML..."
HTML=$(curl -s "$BASE_URL")

# Check for viewport meta tag
if [[ "$HTML" == *"<meta name=\"viewport\""* ]]; then
  echo "✓ Viewport meta tag found"
else
  echo "✗ Viewport meta tag not found"
fi

# Check for theme-color meta tag
if [[ "$HTML" == *"<meta name=\"theme-color\""* ]]; then
  echo "✓ Theme color meta tag found"
else
  echo "✗ Theme color meta tag not found"
fi

# Check for apple-mobile-web-app-capable meta tag
if [[ "$HTML" == *"<meta name=\"apple-mobile-web-app-capable\""* ]]; then
  echo "✓ Apple mobile web app capable meta tag found"
else
  echo "✗ Apple mobile web app capable meta tag not found"
fi

# Check for mobile-web-app-capable meta tag
if [[ "$HTML" == *"<meta name=\"mobile-web-app-capable\""* ]]; then
  echo "✓ Mobile web app capable meta tag found"
else
  echo "✗ Mobile web app capable meta tag not found"
fi

# Check for manifest link
if [[ "$HTML" == *"<link rel=\"manifest\""* ]]; then
  echo "✓ Manifest link found"
else
  echo "✗ Manifest link not found"
fi

# Check for apple touch icon links
if [[ "$HTML" == *"<link rel=\"apple-touch-icon\""* ]]; then
  echo "✓ Apple touch icon links found"
else
  echo "✗ Apple touch icon links not found"
fi

echo ""
echo "Manual Testing Instructions for Android:"
echo "----------------------------------------"
echo "1. Open Chrome on your Android device"
echo "2. Navigate to $BASE_URL"
echo "3. Open Chrome menu (three dots in the top right)"
echo "4. Look for 'Add to Home screen' or 'Install app' option"
echo "5. Follow the prompts to install the PWA"
echo "6. Verify the app launches from the home screen"
echo "7. Test offline functionality by enabling airplane mode and launching the app"
echo "8. Test adding a transaction while offline"
echo "9. Disable airplane mode and verify the transaction syncs"
echo ""
echo "Key PWA Features to Test Manually:"
echo "---------------------------------"
echo "1. Installation: App can be installed to the home screen"
echo "2. Offline access: App loads and shows cached data when offline"
echo "3. Responsive design: UI adapts to mobile screen size"
echo "4. Touch optimization: Touch targets are large enough (48px minimum)"
echo "5. Quick Add: Floating action button works for adding transactions"
echo "6. Account balances: Clearly visible and formatted correctly"
echo ""
echo "Lighthouse Audit Instructions:"
echo "-----------------------------"
echo "1. Open Chrome DevTools (F12)"
echo "2. Go to the Lighthouse tab"
echo "3. Select 'Mobile' device"
echo "4. Check 'Progressive Web App' category"
echo "5. Click 'Generate report'"
echo "6. Review the PWA audit results and address any issues"

echo ""
echo "Test completed!"
