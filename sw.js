// --- CACHE BUSTING ---
// Incrementing this version string will trigger the 'activate' event
// and clean up old caches, ensuring users get the new files.
const CACHE_NAME = 'pwa-task-tracker-v2';

// List of files to cache on install (the "app shell")
const URLS_TO_CACHE = [
  '/',
  'index.html',
  'manifest.json',
  'https://cdn.tailwindcss.com',
  'https://placehold.co/192x192/4F46E5/FFFFFF?text=Tasks',
  'https://placehold.co/512x512/4F46E5/FFFFFF?text=Tasks'
];

// --- Install Event ---
// This runs when the service worker is first installed.
// It opens the cache and adds the app shell files to it.
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching app shell');
        return cache.addAll(URLS_TO_CACHE);
      })
      .then(() => {
        self.skipWaiting(); // Force the new service worker to activate immediately
      })
  );
});

// --- Activate Event ---
// This runs after install. It's the perfect place to clean up old caches.
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    // Get all cache keys (cache names)
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // --- CACHE BUSTING LOGIC ---
          // If the cacheName is not the current one, delete it.
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Take control of all open clients immediately
  );
});

// --- Fetch Event ---
// This intercepts all network requests (e.g., for pages, scripts, images).
self.addEventListener('fetch', (event) => {
  // We only want to handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // --- EXPLICIT CACHING STRATEGY: Cache-First ---
  // This strategy is ideal for offline-first apps.
  // 1. Try to find the request in the cache.
  // 2. If it's in the cache, return the cached response.
  // 3. If it's not in the cache, fetch it from the network.
  // 4. (Optional) After fetching, put the new response in the cache for next time.
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        
        // 1. & 2. If in cache, return cached response
        if (cachedResponse) {
          // console.log('Service Worker: Serving from cache', event.request.url);
          return cachedResponse;
        }

        // 3. Not in cache, fetch from network
        // console.log('Service Worker: Fetching from network', event.request.url);
        return fetch(event.request)
          .then((networkResponse) => {
            
            // 4. Cache the new response for next time
            // We must clone it because a response is a stream and can only be consumed once.
            let responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                // We only cache successful responses
                if (networkResponse.ok) {
                    cache.put(event.request, responseToCache);
                }
              });
            
            return networkResponse;
          })
          .catch((error) => {
            // This will happen when offline and the resource isn't cached
            console.warn('Service Worker: Fetch failed. User is offline or network error.', error);
            // You could return a generic "offline" page here if you had one cached,
            // but for this app, the shell is already cached.
          });
      })
  );
});