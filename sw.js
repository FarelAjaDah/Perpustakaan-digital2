// =============================================
//  SERVICE WORKER — Pustaka Digital
// =============================================

const CACHE_NAME = 'pustaka-digital-V5'; // GANTI VERSI SEIAP UPDATE BIAR...BIARIN

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

const BOOKS_TO_CACHE = [ // SETIAP NAMBAH BUKU, TAMBAHKAN JUGA DI SINI YA BUJANG
  './books/indo 5.pdf',
  './books/pjok 5.pdf',
  './books/ppkn 5.pdf',
  './books/enggres 5.pdf',
  './books/IPAS 5.pdf',
  './books/Jurnal 1.pdf',
  './books/matematika 5.pdf',
  './books/koding.pdf',
  './books/mtk smp.pdf',
  './books/keagamaan smp.pdf',
  './books/INDONESIA SMP.pdf',
  './books/ENGGRES SMP.pdf',
  './books/IPA SMP.pdf',
  './books/ips smp.pdf',
  './books/PJOK SMP.pdf',
  './books/PPKN SMP.pdf',
  './books/informatika smp.pdf',
];

// Semua file yang seharusnya ada di cache (untuk cek manual)
const ALL_CACHED_FILES = [...ASSETS_TO_CACHE, ...BOOKS_TO_CACHE];

// =============================================
//  INSTALL — Cache semua file
// =============================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled([
        ...ASSETS_TO_CACHE.map(a => cache.add(a).catch(e => console.warn('Cache skip:', a, e))),
        ...BOOKS_TO_CACHE.map(a => cache.add(a).catch(e => console.warn('Cache skip:', a, e))),
      ]);
    }).then(() => {
      // Kirim pesan ke semua tab: cache selesai
      self.clients.matchAll({ includeUncontrolled: true }).then(clients => {
        clients.forEach(client => client.postMessage({ type: 'CACHE_READY' }));
      });
    })
  );
  self.skipWaiting();
});

// =============================================
//  ACTIVATE — Hapus cache lama
// =============================================
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

// =============================================
//  FETCH — Cache First → Network Fallback
// =============================================
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  if (!url.startsWith('http://') && !url.startsWith('https://')) return;
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
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
    })
  );
});

// =============================================
//  MESSAGE — Terima perintah cek cache dari halaman
// =============================================
self.addEventListener('message', async (event) => {
  if (event.data?.type !== 'CHECK_CACHE_STATUS') return;

  const cache  = await caches.open(CACHE_NAME);
  const total  = ALL_CACHED_FILES.length;
  let cached   = 0;
  let missing  = [];

  await Promise.all(
    ALL_CACHED_FILES.map(async (file) => {
      const match = await cache.match(file);
      if (match) {
        cached++;
      } else {
        missing.push(file);
      }
    })
  );

  // Kirim hasil balik ke halaman
  event.source.postMessage({
    type:    'CACHE_STATUS_RESULT',
    total,
    cached,
    missing,
    ready:   cached === total,
    percent: Math.round((cached / total) * 100),
  });
});

function saveToCache(request, response) {
  const responseToCache = response.clone();
  caches.open(CACHE_NAME).then((cache) => {
    cache.put(request, responseToCache);
  });
  return response;
}
