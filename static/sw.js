const CACHE_NAME = 'voice-transcriber-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Bypass Service Worker for API calls (let browser handle it directly)
  // This avoids timeouts and issues with large file uploads in the SW
  if (event.request.url.includes('/transcribe')) {
    return;
  }

  // Cache first for static assets
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});
