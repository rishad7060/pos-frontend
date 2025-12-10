// TEAM_003: Simple Service Worker for POS offline support
const CACHE_NAME = 'pos-offline-v1';

// Assets to cache on install
const PRECACHE_ASSETS = [
    '/',
    '/pos',
    '/manifest.json',
];

// Install - cache core assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching core assets');
                return cache.addAll(PRECACHE_ASSETS);
            })
            .then(() => {
                console.log('[SW] Precache complete, skipping waiting');
                return self.skipWaiting();
            })
            .catch((err) => console.error('[SW] Cache failed:', err))
    );
});

// Activate - take control immediately
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating...');
    event.waitUntil(
        caches.keys()
            .then((names) => {
                console.log('[SW] Found caches:', names);
                return Promise.all(
                    names.filter((name) => name !== CACHE_NAME).map((name) => {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    })
                );
            })
            .then(() => {
                console.log('[SW] Taking control of clients');
                return self.clients.claim();
            })
    );
});

// Fetch - network first, cache fallback
self.addEventListener('fetch', (event) => {
    // Only handle same-origin GET requests
    if (event.request.method !== 'GET') return;
    if (!event.request.url.startsWith(self.location.origin)) return;

    // Skip API calls - let the app handle with IndexedDB
    if (event.request.url.includes('/api/')) return;

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Clone and cache successful responses
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, clone);
                    });
                }
                return response;
            })
            .catch(() => {
                console.log('[SW] Network failed, trying cache for:', event.request.url);
                return caches.match(event.request).then((cached) => {
                    if (cached) {
                        console.log('[SW] Serving from cache:', event.request.url);
                        return cached;
                    }
                    // For navigation requests, try serving the cached /pos page
                    if (event.request.mode === 'navigate') {
                        console.log('[SW] Navigation request, trying /pos cache');
                        return caches.match('/pos');
                    }
                    console.log('[SW] No cache for:', event.request.url);
                    return new Response('Offline - not cached', { status: 503 });
                });
            })
    );
});

console.log('[SW] Service worker script loaded');
