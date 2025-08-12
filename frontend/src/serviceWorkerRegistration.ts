// Service Worker Registration for Rustler Finance PWA

// Check if service workers are supported
const isServiceWorkerSupported = 'serviceWorker' in navigator;

// Function to register the service worker
export function registerServiceWorker() {
  if (isServiceWorkerSupported) {
    window.addEventListener('load', () => {
      const swUrl = '/sw.js';

      navigator.serviceWorker
        .register(swUrl)
        .then((registration) => {
          console.log('Service Worker registered with scope:', registration.scope);

          // Reload the page when a new service worker takes control
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log('Service Worker controller changed, reloading.');
            window.location.reload();
          });

          // Proactively check for updates on page load
          registration.update();

          // Periodic update checks
          setInterval(() => {
            registration.update();
            console.log('Service Worker update check');
          }, 1000 * 60 * 60); // every hour

          // Handle updates: when a new worker is installed, tell it to skip waiting
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing as ServiceWorker | null;
            if (!newWorker) return;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  console.log('New content available, activating new Service Worker.');
                  // If there's a waiting worker, ask it to activate immediately
                  if (registration.waiting) {
                    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                  } else {
                    // Fallback: try messaging the installing worker
                    try {
                      newWorker.postMessage({ type: 'SKIP_WAITING' });
                    } catch (e) {
                      console.warn('Failed to postMessage SKIP_WAITING to installing SW', e);
                    }
                  }
                } else {
                  console.log('Content cached for offline use.');
                }
              }
            });
          });
        })
        .catch((error) => {
          console.error('Error during service worker registration:', error);
        });

      // Handle offline transaction sync
      setupBackgroundSync();
    });
  } else {
    console.log('Service workers are not supported in this browser.');
  }
}

// Function to unregister the service worker
export function unregisterServiceWorker() {
  if (isServiceWorkerSupported) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error(error.message);
      });
  }
}

// Setup background sync for offline transactions
function setupBackgroundSync() {
  if (isServiceWorkerSupported && 'SyncManager' in window) {
    navigator.serviceWorker.ready
      .then(() => {
        // In a real implementation, we would register a sync event:
        // navigator.serviceWorker.ready.then(reg => reg.sync.register('sync-transactions'));

        console.log('Background sync registered for transactions');
      })
      .catch((error) => {
        console.error('Error registering background sync:', error);
      });
  }
}

// Request notification permission
export function requestNotificationPermission() {
  if ('Notification' in window) {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        console.log('Notification permission granted.');
      }
    });
  }
}
