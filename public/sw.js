const VERSION = 10;
const CACHE_NAME = `dmh-pwa-v${VERSION}`;
const STATIC_CACHE = `dmh-pwa-static-v${VERSION}`;
const DYNAMIC_CACHE = `dmh-pwa-dynamic-v${VERSION}`;

// Files to cache immediately
const STATIC_FILES = [
  '/dmh-pwa/',
  '/dmh-pwa/index.html',
  '/dmh-pwa/manifest.json',
  '/dmh-pwa/icon-72.png',
  '/dmh-pwa/icon-96.png',
  '/dmh-pwa/icon-128.png',
  '/dmh-pwa/icon-144.png',
  '/dmh-pwa/icon-152.png',
  '/dmh-pwa/icon-192.png',
  '/dmh-pwa/icon-384.png',
  '/dmh-pwa/icon-512.png'
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('Service Worker installed');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Handle different types of requests
  if (url.pathname === '/dmh-pwa' || url.pathname === '/dmh-pwa/index.html') {
    // App shell - serve from cache first, then network
    event.respondWith(
      caches.match(request)
        .then((response) => {
          return response || fetch(request);
        })
    );
  } else if (url.pathname.startsWith('/dmh-pwa/api/')) {
    // API requests - network first, then cache
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE)
              .then((cache) => {
                cache.put(request, responseClone);
              });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
  } else if (request.destination === 'image') {
    // Images - cache first, then network
    event.respondWith(
      caches.match(request)
        .then((response) => {
          return response || fetch(request)
            .then((fetchResponse) => {
              if (fetchResponse.status === 200) {
                const responseClone = fetchResponse.clone();
                caches.open(DYNAMIC_CACHE)
                  .then((cache) => {
                    cache.put(request, responseClone);
                  });
              }
              return fetchResponse;
            });
        })
    );
  } else {
    // Other static assets - network first, then cache
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE)
              .then((cache) => {
                cache.put(request, responseClone);
              });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
  }
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('Background sync triggered');
    event.waitUntil(
      // Handle any pending offline actions here
      Promise.resolve()
    );
  }
});

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'New D&D session update!',
    icon: '/dmh-pwa/icon-192.png',
    badge: '/dmh-pwa/icon-72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Session',
        icon: '/dmh-pwa/icon-192.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/dmh-pwa/icon-192.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Owlbear\'s DMH', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked');
  
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/dmh-pwa')
    );
  }
}); 