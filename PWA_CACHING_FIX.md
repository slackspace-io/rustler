# PWA Caching Fix

## Issue Description
Users were experiencing an intermittent issue where they would sometimes see an old UI when refreshing the page (hitting F5). This was caused by the service worker's caching strategy, which was using a static cache name and a cache-first approach for all static assets.

## Root Cause Analysis
1. **Static Cache Name**: The service worker was using a fixed cache name (`rustler-cache-v1`), which meant that even when new content was deployed, the old cached content would still be served.
2. **Cache-First Strategy**: The service worker was using a cache-first strategy for all static assets, including HTML, JavaScript, and CSS files. This meant that even when new versions were available, the old cached versions would be served first.
3. **No Forced Updates**: When a new service worker was installed, it would show a notification but wouldn't automatically refresh the page to apply the updates.

## Implemented Solutions

### 1. Dynamic Cache Versioning
Added a timestamp to the cache name to ensure a new cache is created each time the service worker is installed:

```javascript
// Add timestamp to cache name for versioning
const TIMESTAMP = new Date().toISOString();
const CACHE_NAME = `rustler-cache-${TIMESTAMP}`;
```

This ensures that when a new version of the application is deployed, a completely new cache is created, preventing old assets from being served.

### 2. Improved Cache Invalidation
Updated the service worker's activate event to immediately take control of all open clients:

```javascript
// Activate event - clean up old caches and take control immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all clients immediately
      self.clients.claim()
    ])
  );
});
```

The `self.clients.claim()` call ensures that the new service worker takes control immediately, rather than waiting for the next navigation.

### 3. Network-First Strategy for Critical Assets
Changed the caching strategy for HTML, JavaScript, and CSS files to network-first instead of cache-first:

```javascript
// HTML requests (SPA routes) - Network first, then cache
if (url.pathname === '/' || url.pathname.endsWith('.html')) {
  // Network-first implementation
}

// JavaScript and CSS assets - Network first with cache fallback for better updates
if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
  // Network-first implementation
}
```

This ensures that when online, users always get the latest version of these critical files, falling back to cached versions only when offline.

### 4. Automatic Page Refresh on Updates
Updated the service worker registration to automatically refresh the page when a new version is detected:

```javascript
// Force reload the page after a short delay
// This ensures the user gets the latest version
setTimeout(() => {
  window.location.reload();
}, 1000);
```

This ensures that users don't need to manually refresh to get the latest version of the application.

## Testing
Created a test script (`test_pwa_caching.sh`) to verify that:
- The service worker is accessible
- The service worker includes timestamp-based cache versioning
- The service worker uses clients.claim() for immediate control
- The service worker uses network-first strategy for critical assets
- The service worker registration forces page reload on updates

## Expected Outcome
With these changes, users should no longer experience the intermittent old UI issue when refreshing the page. The application will always serve the latest version of the UI, ensuring a consistent user experience.
