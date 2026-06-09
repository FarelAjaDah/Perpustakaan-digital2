// =============================================
//  SERVICE WORKER — Pustaka Digital
// =============================================

const CACHE_NAME = 'pustaka-digital-V5';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './manifest.json',
  './js/auth.js',
  './js/books.js',
  './js/firebase.js',
  './js/kelas.js',
  './js/main.js',
  './js/pdf.js',
  './js/qr.js',
  './js/storage.js',
  './js/ui.js',
];

const BOOKS_TO_CACHE = [
  './books/bindo 5.pdf',
  './books/pjok 5.pdf',
  './books/ppkn 5.pdf',
  './books/bing 5.pdf',
  './books/IPAS 5.pdf',
  './books/Jurnal 1.pdf',
  './books/matematika 5.pdf',
  './books/koding.pdf',
];

// Daftar service worker saat halaman dimuat
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // allSettled agar satu file gagal tidak block semua
      return Promise.allSettled([
        ...ASSETS_TO_CACHE.map(a => cache.add(a).catch(e => console.warn('Cache skip:', a, e))),
        ...BOOKS_TO_CACHE.map(a => cache.add(a).catch(e => console.warn('Cache skip:', a, e))),
      ]);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Cache First → Network Fallback
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Hanya handle http/https
  if (!url.startsWith('http://') && !url.startsWith('https://')) return;

  // Firebase & Google APIs: selalu dari network (real-time data)
  if (url.includes('firebasedatabase') || url.includes('googleapis') || url.includes('google.com')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            (networkResponse.type === 'basic' || networkResponse.type === 'cors')
          ) {
            return saveToCache(event.request, networkResponse);
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline fallback untuk navigasi
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
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
