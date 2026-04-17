const CACHE_NAME = 'pustaka-v3-cache';
// Daftar file yang mau disimpan di HP agar bisa dibuka offline
const urlsToCache = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './books/biologi.pdf', // Tambahkan PDF yang mau bisa dibaca offline
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap'
];

// Install Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

// Ambil file dari cache jika offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});