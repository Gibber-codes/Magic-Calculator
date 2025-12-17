// Service Worker for MTG Calculator PWA
// This enables "Add to Home Screen" functionality

const CACHE_NAME = 'mtg-calc-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
];

// Install: Cache core assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Activate: Clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch: Network-first strategy (always fresh data from Scryfall)
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // For API calls (Scryfall), always use network
    if (event.request.url.includes('api.scryfall.com')) {
        event.respondWith(fetch(event.request));
        return;
    }

    // For app assets: network first, fallback to cache
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Clone and cache the response
                const responseClone = response.clone();
                caches.open(CACHE_NAME)
                    .then((cache) => cache.put(event.request, responseClone));
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});
