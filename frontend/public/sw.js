// Service Worker for Rustler Finance PWA

// Add timestamp to cache name for versioning
const TIMESTAMP = new Date().toISOString();
const CACHE_NAME = `rustler-cache-${TIMESTAMP}`;
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

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch((error) => {
        console.error('Pre-caching failed:', error);
      })
  );
});

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

// Fetch event - handle requests
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // API requests - Network first, cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Clone the response to store in cache
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              // Only cache successful responses
              if (response.status === 200) {
                cache.put(event.request, responseToCache);
              }
            });

          return response;
        })
        .catch(() => {
          // If network fails, try to get from cache
          return caches.match(event.request);
        })
    );
    return;
  }

  // HTML requests (SPA routes) - Network first, then cache
  if (url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Clone the response to store in cache
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              if (response.status === 200) {
                cache.put(event.request, responseToCache);
              }
            });

          return response;
        })
        .catch(() => {
          // If network fails, try to get from cache
          return caches.match(event.request);
        })
    );
    return;
  }

  // JavaScript and CSS assets - Network first with cache fallback for better updates
  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Clone the response to store in cache
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              if (response.status === 200) {
                cache.put(event.request, responseToCache);
              }
            });

          return response;
        })
        .catch(() => {
          // If network fails, try to get from cache
          return caches.match(event.request);
        })
    );
    return;
  }

  // Other static assets - Cache first, network fallback
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone the request
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest)
          .then((response) => {
            // Check if valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          });
      })
  );
});

// Handle offline fallback
self.addEventListener('fetch', (event) => {
  // If the request fails (offline) and is a navigation request
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match('/index.html');
        })
    );
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
