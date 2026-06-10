// =============================================
//  SERVICE WORKER — Pustaka Digital
// =============================================

const CACHE_NAME = 'pustaka-digital-V7'; // <-- naikkan versi setiap deploy!

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
];

const BOOKS_TO_CACHE = [ // setiap  nambah buku, pastikan update daftar ini juga ya!
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
//  INSTALL
// =============================================
self.addEventListener('install', (event) => {
  // JANGAN skipWaiting otomatis — tunggu user konfirmasi
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled([
        ...ASSETS_TO_CACHE.map(a => cache.add(a).catch(e => console.warn('Cache skip:', a, e))),
        ...BOOKS_TO_CACHE.map(a  => cache.add(a).catch(e => console.warn('Cache skip:', a, e))),
      ]);
    }).then(() => {
      self.clients.matchAll({ includeUncontrolled: true }).then(clients => {
        clients.forEach(c => c.postMessage({ type: 'CACHE_READY' }));
      });
    })
  );
  // Tidak skipWaiting di sini — biarkan banner yang memutuskan
});

// =============================================
//  ACTIVATE
// =============================================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
    ).then(() => {
      self.clients.claim();
      // Beritahu semua tab bahwa SW baru sudah aktif → trigger reload
      self.clients.matchAll({ includeUncontrolled: true }).then(clients => {
        clients.forEach(c => c.postMessage({ type: 'SW_ACTIVATED' }));
      });
    })
  );
});

// =============================================
//  FETCH — Cache First
// =============================================
self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  if (!url.startsWith('http://') && !url.startsWith('https://')) return;
  if (url.includes('firebasedatabase') || url.includes('googleapis') || url.includes('google.com')) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((res) => {
          if (res && res.status === 200 && (res.type === 'basic' || res.type === 'cors')) {
            return saveToCache(event.request, res);
          }
          return res;
        })
        .catch(() => {
          if (event.request.mode === 'navigate') return caches.match('./index.html');
        });
    })
  );
});

// =============================================
//  MESSAGE
// =============================================
self.addEventListener('message', async (event) => {

  // User tekan "Perbarui Sekarang" → SW baru ambil alih
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  // Cek status cache manual
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

    event.source.postMessage({
      type:    'CACHE_STATUS_RESULT',
      total, cached, missing,
      ready:   cached === total,
      percent: Math.round((cached / total) * 100),
    });
  }
});

function saveToCache(request, response) {
  const clone = response.clone();
  caches.open(CACHE_NAME).then(c => c.put(request, clone));
  return response;
}
