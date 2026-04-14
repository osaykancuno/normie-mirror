// Normie Mirror — Service Worker

const CACHE_SHELL = 'normie-mirror-shell-v4';
const CACHE_API = 'normie-mirror-api-v1';
const API_HOST = 'api.normies.art';

const SHELL_FILES = [
  '/',
  '/index.html',
  '/css/main.css',
  '/css/animations.css',
  '/js/app.js',
  '/js/state.js',
  '/js/api/normies.js',
  '/js/api/cache.js',
  '/js/render/pixel-renderer.js',
  '/js/render/animation-engine.js',
  '/js/camera/camera-manager.js',
  '/js/camera/overlay.js',
  '/js/camera/touch-controls.js',
  '/js/capture/photo-capture.js',
  '/js/capture/video-capture.js',
  '/js/capture/filters.js',
  '/js/qr/qr-generator.js',
  '/js/screens/home-screen.js',
  '/js/screens/camera-screen.js',
  '/js/screens/capture-screen.js',
  '/js/screens/qr-screen.js',
  '/js/screens/gallery-screen.js',
  '/js/capture/gif-encoder.js',
  '/js/ui/components.js',
  '/js/utils/share.js',
  '/js/utils/storage.js',
  '/js/sw-register.js',
  '/manifest.json',
];

// Install: pre-cache shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_SHELL).then((cache) => {
      return cache.addAll(SHELL_FILES);
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_SHELL && key !== CACHE_API)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API calls: network-first with cache fallback
  if (url.hostname === API_HOST) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Only cache successful responses to prevent cache poisoning
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_API).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Shell files: cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request);
    })
  );
});
