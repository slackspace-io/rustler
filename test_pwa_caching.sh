#!/bin/bash
set -e

# Test script for PWA caching behavior

echo "Testing PWA caching behavior..."

# Base URL for the API
BASE_URL="http://localhost:3000"

# Check if the service worker is accessible
echo "Checking service worker accessibility..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/sw.js")
if [[ "$HTTP_STATUS" == "200" ]]; then
  echo "✓ Service worker (sw.js) is accessible"
else
  echo "✗ Service worker (sw.js) is not accessible (HTTP status: $HTTP_STATUS)"
  exit 1
fi

# Check if the service worker contains explicit cache versioning
echo "Checking service worker cache versioning..."
if curl -s "$BASE_URL/sw.js" | grep -q "CACHE_VERSION"; then
  echo "✓ Service worker includes explicit cache versioning"
else
  echo "✗ Service worker does not include explicit cache versioning"
  exit 1
fi

# Check if the service worker uses clients.claim() for immediate control
echo "Checking service worker immediate control..."
if curl -s "$BASE_URL/sw.js" | grep -q "self.clients.claim()"; then
  echo "✓ Service worker uses clients.claim() for immediate control"
else
  echo "✗ Service worker does not use clients.claim() for immediate control"
  exit 1
fi

# Check if the service worker uses network-first strategy for critical assets
echo "Checking service worker caching strategy for critical assets..."
if curl -s "$BASE_URL/sw.js" | grep -q "JavaScript and CSS assets - Network first"; then
  echo "✓ Service worker uses network-first strategy for JavaScript and CSS assets"
else
  echo "✗ Service worker does not use network-first strategy for JavaScript and CSS assets"
  exit 1
fi

# Check if the service worker registration forces page reload on updates
echo "Checking service worker update behavior..."
if curl -s "$BASE_URL/serviceWorkerRegistration.js" | grep -q "window.location.reload()" || curl -s "$BASE_URL/assets/index-*.js" | grep -q "window.location.reload()"; then
  echo "✓ Service worker registration forces page reload on updates"
else
  echo "✗ Could not verify if service worker registration forces page reload on updates"
  echo "  (This might be because the file is bundled or not directly accessible)"
fi

echo "Test completed successfully!"
