const CACHE_NAME = 'pustaka-furina-v5'; // jangan lupa diganti mas
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/hammer.js/2.0.8/hammer.min.js'
];

// Install & Precaching file inti
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Cache First, then Network
self.addEventListener('fetch', (event) => {
  // Jangan cegat request ke Firebase agar tidak bug
  if (event.request.url.includes('firebasedatabase') || event.request.url.includes('google')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          if (event.request.url.includes('.pdf')) {
            return saveToCache(event.request, networkResponse);
          }
          return networkResponse;
        }
        return saveToCache(event.request, networkResponse);
      }).catch(() => {
        console.log("Offline: File tidak ditemukan");
      });
    })
  );
});

function saveToCache(request, response) {
  const responseToCache = response.clone();
  caches.open(CACHE_NAME).then((cache) => {
    cache.put(request, responseToCache);
  });
  return response;
}

// Last updated: 11 Mei 2026
