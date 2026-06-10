// =============================================
//  UPDATE BANNER — Pustaka Digital
// =============================================

// Simpan referensi SW baru yang sudah waiting
let _pendingSW = null;

function initUpdateChecker() {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.ready.then(reg => {

    // Cek saat pertama load: ada SW yang waiting?
    if (reg.waiting) {
      _pendingSW = reg.waiting;
      showUpdateBanner();
    }

    // Dengarkan kalau ada SW baru masuk
    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        // SW baru sudah install tapi belum aktif (waiting)
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          _pendingSW = newWorker;
          showUpdateBanner();
        }
      });
    });
  });

  // Dengarkan pesan RELOAD dari SW setelah skipWaiting
  navigator.serviceWorker.addEventListener('message', e => {
    if (e.data?.type === 'SW_ACTIVATED') {
      window.location.reload();
    }
  });
}

function showUpdateBanner() {
  const banner = document.getElementById('updateBanner');
  if (banner) {
    banner.style.display = 'flex';
    // Geser body agar konten tidak tertutup banner
    const bannerH = banner.offsetHeight || 50;
    document.body.style.paddingTop = `calc(var(--safe-top) + ${bannerH}px)`;
  }
}

function dismissUpdate() {
  const banner = document.getElementById('updateBanner');
  if (banner) banner.style.display = 'none';
  document.body.style.paddingTop = '';
}

function applyUpdate() {
  // Minta SW lama berhenti, SW baru ambil alih
  if (_pendingSW) {
    _pendingSW.postMessage({ type: 'SKIP_WAITING' });
  }
  // Jika tidak ada _pendingSW (edge case), langsung reload
  setTimeout(() => window.location.reload(), 400);
}

// Jalankan saat DOM siap
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initUpdateChecker);
} else {
  initUpdateChecker();
}