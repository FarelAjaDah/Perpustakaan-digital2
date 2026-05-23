const CACHE_NAME = 'pustaka-furina-V4'; // jangan lupa diganti ya mas 🥰
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './manifest.json',
  './js/pdf.min.js',
  './js/pdf.worker.min.js',
];

// Install & Precaching file inti
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
  ASSETS_TO_CACHE.map(asset => cache.add(asset))) 
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

// Last updated:24 mei 2026 - 02:03 AM (GMT +7)
