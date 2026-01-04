const CACHE_NAME = 'breathe-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './logo.svg',
    './favicon.ico',
    './js/app.js',
    './js/AudioManager.js',
    './js/AnimationManager.js',
    './js/AnalyticsManager.js',
    './js/ParticleManager.js',
    './js/RegimentManager.js',
    './js/SessionManager.js',
    './js/ThemeManager.js',
    './js/UIMediator.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(ASSETS_TO_CACHE);
            })
    );
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
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});
