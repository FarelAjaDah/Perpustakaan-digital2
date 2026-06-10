// =============================================
//  SERVICE WORKER — Pustaka Digital
//  VERSI OFFLINE-FIRST LENGKAP
// =============================================

const CACHE_NAME = 'pustaka-digital-V10';

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
  './js/update-logic.js',
  './js/pdf.worker.min.js', 
];

const BOOKS_TO_CACHE = [
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

const ALL_CACHED_FILES = [...ASSETS_TO_CACHE, ...BOOKS_TO_CACHE];

// =============================================
//  INSTALL — Cache aset dulu, buku di background
// =============================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.allSettled(
        ASSETS_TO_CACHE.map(a => cache.add(a).catch(e => console.warn('Skip asset:', a, e)))
      );

      // Beritahu tab bahwa aset utama sudah siap
      const clients = await self.clients.matchAll({ includeUncontrolled: true });
      clients.forEach(c => c.postMessage({ type: 'ASSETS_READY' }));
      // Buku diunduh satu per satu agar tidak overwhelm koneksi lambat
      _cacheBooksSequentially(cache);
    })
  );
});

// Cache buku satu per satu, beri jeda antar file
async function _cacheBooksSequentially(cache) {
  let cached = 0;
  const total = BOOKS_TO_CACHE.length;

  for (const book of BOOKS_TO_CACHE) {
    try {
      const existing = await cache.match(book);
      if (!existing) {
        await cache.add(book);
      }
      cached++;

      // Kirim progress ke semua tab
      const clients = await self.clients.matchAll({ includeUncontrolled: true });
      clients.forEach(c => c.postMessage({
        type: 'BOOK_CACHE_PROGRESS',
        cached,
        total,
        percent: Math.round((cached / total) * 100),
        lastFile: book.replace('./books/', '')
      }));

    } catch (e) {
      console.warn('Gagal cache buku:', book, e);
      cached++;
    }
    // Jeda 200ms antar buku agar tidak banjiri bandwidth
    await new Promise(r => setTimeout(r, 200));
  }

  // Semua buku selesai
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  clients.forEach(c => c.postMessage({ type: 'CACHE_READY', total, cached }));
}

// =============================================
//  ACTIVATE
// =============================================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(
        names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
      ))
      .then(async () => {
        await self.clients.claim();
        const clients = await self.clients.matchAll({ includeUncontrolled: true });
        clients.forEach(c => c.postMessage({ type: 'SW_ACTIVATED' }));
      })
  );
});

// =============================================
//  FETCH — Cache First, Network Fallback
// =============================================
self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  if (!url.startsWith('http://') && !url.startsWith('https://')) return;

  // Jangan intersep Firebase / Google API
  if (
    url.includes('firebasedatabase') ||
    url.includes('googleapis') ||
    url.includes('google.com') ||
    url.includes('firebaseio.com')
  ) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached; // ← langsung dari cache, tidak ke network

      return fetch(event.request)
        .then((res) => {
          if (res && res.status === 200 &&
              (res.type === 'basic' || res.type === 'cors')) {
            return saveToCache(event.request, res);
          }
          return res;
        })
        .catch(() => {
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return new Response('', { status: 503, statusText: 'Offline' });
        });
    })
  );
});

// =============================================
//  MESSAGE
// =============================================
self.addEventListener('message', async (event) => {

  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (event.data?.type === 'CHECK_CACHE_STATUS') {
    const cache   = await caches.open(CACHE_NAME);
    const total   = ALL_CACHED_FILES.length;
    let cached    = 0;
    let missing   = [];

    await Promise.all(
      ALL_CACHED_FILES.map(async (file) => {
        const match = await cache.match(file);
        if (match) cached++;
        else missing.push(file);
      })
    );

    if (event.source) {
      event.source.postMessage({
        type: 'CACHE_STATUS_RESULT',
        total, cached, missing,
        ready:   cached === total,
        percent: Math.round((cached / total) * 100),
      });
    }
  }
});

function saveToCache(request, response) {
  const clone = response.clone();
  caches.open(CACHE_NAME).then(c => c.put(request, clone));
  return response;
}