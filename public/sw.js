const CACHE_NAME = 'breathe-v2';
// Only files that exist at stable paths in the built site. Hashed vite
// assets (/assets/index-*.js|css) are cached at runtime, not install time.
const ASSETS_TO_CACHE = [
    './',
    './logo.svg',
    './favicon.ico',
    './manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        // One missing file must never fail the whole install.
        await Promise.allSettled(ASSETS_TO_CACHE.map((asset) => cache.add(asset)));
        self.skipWaiting();
    })());
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') {
        return;
    }
    const url = new URL(event.request.url);
    if (url.origin !== self.location.origin) {
        return; // never touch external or cross-origin requests
    }
    event.respondWith(
        caches.match(event.request).then((cached) => {
            const fetched = fetch(event.request).then((response) => {
                // Cache only plain same-origin successes; never opaque,
                // redirected, partial, or error responses.
                if (response.ok && response.type === 'basic') {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
                }
                return response;
            });
            return cached || fetched;
        })
    );
});
