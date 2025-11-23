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

  // Network first for API calls, Cache first for static assets
  if (event.request.url.includes('/transcribe')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
            // Optional: return a fallback response for offline API calls
            return new Response(JSON.stringify({ error: "Offline" }), { 
                headers: { 'Content-Type': 'application/json' } 
            });
        })
    );
  } else {
    event.respondWith(
      caches.match(event.request)
        .then((response) => response || fetch(event.request))
    );
  }
});
