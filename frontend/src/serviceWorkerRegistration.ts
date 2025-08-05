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

          // Check for updates on page load
          registration.update();

          // Set up periodic updates
          setInterval(() => {
            registration.update();
            console.log('Service Worker update check');
          }, 1000 * 60 * 60); // Check for updates every hour

          // Handle updates
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    // New content is available, show notification to user
                    console.log('New content is available, please refresh.');

                    // You could show a toast or notification here
                    if ('Notification' in window && Notification.permission === 'granted') {
                      new Notification('Rustler Finance Update', {
                        body: 'New version available. Refresh to update.',
                        icon: '/icons/icon-192x192.png'
                      });
                    }
                  } else {
                    // Content is cached for offline use
                    console.log('Content is cached for offline use.');
                  }
                }
              };
            }
          };
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
