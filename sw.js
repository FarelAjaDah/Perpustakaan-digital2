const CACHE_NAME = 'pustaka-furina-v4'; // Ganti nama versi agar browser update
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './manifest.json'
];

// Install & Precaching file inti
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting(); // Paksa SW baru aktif segera
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache); // Hapus cache versi lama
          }
        })
      );
    })
  );
});

// Cache First, then Network
self.addEventListener('fetch', (event) => {
  // Jangan cegat request ke Firebase (Online Features) agar tidak bug
  if (event.request.url.includes('firebasedatabase') || event.request.url.includes('google')) {
    return; 
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Jika ada di cache, kasih langsung
      if (response) {
        return response;
      }

      // Jika tidak ada, ambil dari internet
      return fetch(event.request).then((networkResponse) => {
        // Hanya simpan file yang sukses (status 200)
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          // Jika itu file PDF, kita tetap coba simpan
          if (event.request.url.includes('.pdf')) {
             return saveToCache(event.request, networkResponse);
          }
          return networkResponse;
        }

        return saveToCache(event.request, networkResponse);
      }).catch(() => {
        // Jika internet mati dan file tidak ada di cache
        console.log("Offline: File tidak ditemukan");
      });
    })
  );
});

// Fungsi pembantu untuk menyimpan ke cache otomatis
function saveToCache(request, response) {
  const responseToCache = response.clone();
  caches.open(CACHE_NAME).then((cache) => {
    cache.put(request, responseToCache);
  });
  return response;
}

[// 27 april 2026 = terakhir edit } 
  ]
