// Service Worker for NFG App
const CACHE_NAME = 'nfg-app-v1';
const OFFLINE_URL = '/offline.html';

// Files to cache immediately
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/jobs.html',
  '/sites.html',
  '/bookings.html',
  '/reports.html',
  '/settings.html',
  '/inventory.html',
  '/offline.html',
  '/manifest.json',
  '/js/supabase.js',
  '/js/auth.js',
  '/js/ui.js',
  '/js/notifications.js',
  '/js/loader.js',
  '/js/dark-mode.js',
  '/css/notifications.css',
  '/css/loader.css',
  '/css/custom-dropdown.css',
  '/css/mobile-menu.css'
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
  console.log('[SW] Install event');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Precaching app shell');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone the response before caching
        const responseToCache = response.clone();
        
        caches.open(CACHE_NAME).then((cache) => {
          // Only cache GET requests
          if (event.request.method === 'GET') {
            cache.put(event.request, responseToCache);
          }
        });
        
        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request)
          .then((response) => {
            if (response) {
              return response;
            }
            
            // Show offline page for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match(OFFLINE_URL);
            }
            
            return new Response('Offline', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

// Background sync for offline actions (future feature)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    console.log('[SW] Background sync triggered');
    // TODO: Sync offline changes to Supabase
  }
});

// Push notifications (future feature)
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New notification',
    icon: 'https://zqcbldgheimqrnqmbbed.supabase.co/storage/v1/object/sign/app-images/Banner%20Logo%20-%20NFG.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8xN2RmNDhlMi0xNGJlLTQ5NzMtODZlNy0zZTc0MjgzMWIzOTQiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJhcHAtaW1hZ2VzL0Jhbm5lciBMb2dvIC0gTkZHLnBuZyIsImlhdCI6MTc2MTQwODAwNywiZXhwIjo0ODgzNDcyMDA3fQ.ioiCAXNeXFBkHluCdCLF25y527mxnjBDcLPtDMV1Jds',
    badge: 'https://zqcbldgheimqrnqmbbed.supabase.co/storage/v1/object/sign/app-images/Banner%20Logo%20-%20NFG.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8xN2RmNDhlMi0xNGJlLTQ5NzMtODZlNy0zZTc0MjgzMWIzOTQiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJhcHAtaW1hZ2VzL0Jhbm5lciBMb2dvIC0gTkZHLnBuZyIsImlhdCI6MTc2MTQwODAwNywiZXhwIjo0ODgzNDcyMDA3fQ.ioiCAXNeXFBkHluCdCLF25y527mxnjBDcLPtDMV1Jds',
    vibrate: [200, 100, 200]
  };
  
  event.waitUntil(
    self.registration.showNotification('NFG App', options)
  );
});

