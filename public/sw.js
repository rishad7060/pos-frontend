// Enhanced Service Worker for POS - Offline Support with API Caching
const CACHE_VERSION = 'v1.1.0';
const STATIC_CACHE = `pos-static-${CACHE_VERSION}`;
const API_CACHE = `pos-api-${CACHE_VERSION}`;

// Assets to cache on install
const PRECACHE_ASSETS = [
    '/',
    '/pos',
    '/login',
    '/manifest.json',
];

// Critical APIs to cache for offline POS operation
const CACHEABLE_APIS = [
    '/api/products',
    '/api/categories',
    '/api/customers',
    '/api/suppliers',
    '/api/cashier-permissions',
];

// Install - cache core assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker v1.1.0...');
    event.waitUntil(
        Promise.all([
            caches.open(STATIC_CACHE).then((cache) => {
                console.log('[SW] Caching static assets');
                return cache.addAll(PRECACHE_ASSETS).catch(err => console.error('[SW] Static cache failed:', err));
            }),
            caches.open(API_CACHE).then(() => {
                console.log('[SW] API cache initialized');
            })
        ])
            .then(() => {
                console.log('[SW] Installation complete, skipping waiting');
                return self.skipWaiting();
            })
            .catch((err) => console.error('[SW] Install failed:', err))
    );
});

// Activate - cleanup old caches and take control
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');
    event.waitUntil(
        caches.keys()
            .then((names) => {
                console.log('[SW] Found caches:', names);
                return Promise.all(
                    names.filter((name) => {
                        // Keep current version caches
                        return name !== STATIC_CACHE && name !== API_CACHE && name.startsWith('pos-');
                    }).map((name) => {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    })
                );
            })
            .then(() => {
                console.log('[SW] Activation complete, taking control of clients');
                return self.clients.claim();
            })
    );
});

// Fetch - smart caching strategy
self.addEventListener('fetch', (event) => {
    // Only handle same-origin GET requests
    if (event.request.method !== 'GET') return;
    if (!event.request.url.startsWith(self.location.origin)) return;

    const url = new URL(event.request.url);

    // Handle API requests with smart caching
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(handleAPIRequest(event.request, url));
        return;
    }

    // Handle static assets and pages
    event.respondWith(handleStaticRequest(event.request, url));
});

/**
 * Handle API requests - Network first with cache fallback
 * Critical APIs (products, categories) are cached for offline POS operations
 */
async function handleAPIRequest(request, url) {
    const isCriticalAPI = CACHEABLE_APIS.some(api => url.pathname.startsWith(api));

    try {
        // Try network first
        const networkResponse = await fetch(request);

        // Cache critical API responses for offline use
        if (networkResponse.ok && isCriticalAPI) {
            const cache = await caches.open(API_CACHE);
            cache.put(request, networkResponse.clone());
            console.log('[SW] Cached API response:', url.pathname);
        }

        return networkResponse;
    } catch (error) {
        console.log('[SW] API network failed, trying cache:', url.pathname);

        // Try to serve from cache
        const cachedResponse = await caches.match(request);

        if (cachedResponse) {
            console.log('[SW] Serving API from cache:', url.pathname);
            // Add offline indicator header
            const headers = new Headers(cachedResponse.headers);
            headers.set('X-Offline-Cache', 'true');
            return new Response(cachedResponse.body, {
                status: cachedResponse.status,
                statusText: cachedResponse.statusText,
                headers: headers
            });
        }

        // No cache available - return error
        if (isCriticalAPI) {
            console.error('[SW] Critical API not cached:', url.pathname);
            return new Response(
                JSON.stringify({
                    error: 'Offline - data not available',
                    offline: true,
                    message: 'You are offline and this data is not cached. Please reconnect to use this feature.',
                }),
                {
                    status: 503,
                    statusText: 'Service Unavailable',
                    headers: { 'Content-Type': 'application/json' },
                }
            );
        }

        throw error;
    }
}

/**
 * Handle static requests - Cache first for better performance
 */
async function handleStaticRequest(request, url) {
    // Try cache first for static assets
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
        // Update cache in background (stale-while-revalidate pattern)
        fetch(request)
            .then(response => {
                if (response.ok) {
                    caches.open(STATIC_CACHE).then(cache => {
                        cache.put(request, response);
                    });
                }
            })
            .catch(() => {}); // Ignore errors in background update

        return cachedResponse;
    }

    try {
        // Not in cache, fetch from network
        const networkResponse = await fetch(request);

        // Cache successful responses
        if (networkResponse.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        console.log('[SW] Static asset fetch failed:', url.pathname);

        // For navigation requests, try serving the cached /pos page
        if (request.mode === 'navigate') {
            console.log('[SW] Navigation failed, trying /pos cache');
            const posCache = await caches.match('/pos');
            if (posCache) return posCache;
        }

        // Return basic offline response
        return new Response(
            '<html><body><h1>Offline</h1><p>No cached version available. Please check your connection.</p></body></html>',
            {
                status: 503,
                statusText: 'Service Unavailable',
                headers: { 'Content-Type': 'text/html' },
            }
        );
    }
}

console.log('[SW] Service worker script loaded');
