// Service Worker for Rustler Finance PWA

// Versioned cache name (bump version to invalidate)
const CACHE_VERSION = 'v3';
const CACHE_NAME = `rustler-cache-${CACHE_VERSION}`;
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/maskable-icon.png',
  '/icons/add-transaction.png',
  '/icons/accounts.png'
];

// Install event - cache static assets and activate immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        await cache.addAll(STATIC_ASSETS);
      } catch (error) {
        console.error('Pre-caching failed:', error);
      } finally {
        // Ensure the new SW activates immediately
        await self.skipWaiting();
      }
    })()
  );
});

// Activate event - clean up old caches, enable nav preload, and take control immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Delete old caches
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
      // Enable navigation preload if supported
      if ('navigationPreload' in self.registration) {
        try { await self.registration.navigationPreload.enable(); } catch (_) {}
      }
      await self.clients.claim();
    })()
  );
});

// Fetch event - unified handler to avoid duplicate listeners
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // Handle navigations (SPA routes): network-first with cached index.html fallback
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        // Use navigation preload response if available for faster startup
        const preload = await event.preloadResponse;
        if (preload) return preload;
        // Try network
        const networkResponse = await fetch(req);
        // Do NOT cache the fresh index.html to avoid cache/asset hash mismatch during deploys
        return networkResponse;
      } catch (_) {
        // Offline: return cached index.html
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match('/index.html');
        if (cached) return cached;
        // As a last resort, try any match (legacy)
        const any = await caches.match('/index.html');
        return any || new Response('<h1>Offline</h1>', { headers: { 'Content-Type': 'text/html' } });
      }
    })());
    return;
  }

  // API requests - Network first, cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(req)
        .then((response) => {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            if (response.status === 200) {
              cache.put(req, responseToCache);
            }
          });
          return response;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // JavaScript and CSS assets - Network first with cache fallback for better updates
  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
    event.respondWith(
      fetch(req)
        .then((response) => {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            if (response.status === 200) {
              cache.put(req, responseToCache);
            }
          });
          return response;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Other static assets - Cache first, network fallback
  event.respondWith(
    caches.match(req).then((cached) => {
      return (
        cached || fetch(req).then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, responseToCache));
          return response;
        })
      );
    })
  );
});


// Message handler to support immediate activation from the page
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Background sync for offline transactions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-transactions') {
    event.waitUntil(syncTransactions());
  }
});

// Function to sync transactions when back online
async function syncTransactions() {
  try {
    // Get pending transactions from IndexedDB
    const pendingTransactions = await getPendingTransactions();

    // Send each pending transaction to the server
    for (const transaction of pendingTransactions) {
      await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transaction),
      });

      // Remove from pending after successful sync
      await removePendingTransaction(transaction.id);
    }

    // Notify the user that transactions have been synced
    self.registration.showNotification('Rustler Finance', {
      body: 'Your transactions have been synced!',
      icon: '/icons/icon-192x192.png'
    });

  } catch (error) {
    console.error('Error syncing transactions:', error);
  }
}

// These functions would be implemented with IndexedDB
// Placeholder implementations
async function getPendingTransactions() {
  // In a real implementation, this would retrieve data from IndexedDB
  return [];
}

async function removePendingTransaction(id) {
  // In a real implementation, this would remove the transaction from IndexedDB
  console.log('Removed pending transaction:', id);
}
