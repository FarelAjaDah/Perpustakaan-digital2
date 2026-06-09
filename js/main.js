// =============================================
//  MAIN — Pustaka Digital
// =============================================

function initApp() {
  const role = localStorage.getItem("user_role");

  if (!role) {
    document.getElementById("mainPage").classList.add("hidden");
    document.getElementById("loginPage").classList.remove("hidden");
    return;
  }

  const devFab = document.getElementById("devFab");
  if (devFab) devFab.classList.toggle("hidden", role !== "Developer");

  document.getElementById("loginPage").classList.add("hidden");
  document.getElementById("mainPage").classList.remove("hidden");

  updateVisualRole();

  const welcomeEl = document.getElementById("welcomeText");
  if (welcomeEl) welcomeEl.innerText = `Halo, ${localStorage.getItem("user_name")}! 👋`;

  renderBooksSkeleton();
  // Delay kecil agar skeleton sempat terlihat
  setTimeout(() => renderBooks(""), 120);

  renderLastRead();
  updateOnlineStatus();
}

// =============================================
//  EVENT LISTENERS
// =============================================
document.addEventListener("DOMContentLoaded", () => {
  applySavedTheme();

  // Swipe navigasi tab (kiri/kanan)
  const mc = new Hammer(document.body);
  mc.get('swipe').set({ direction: Hammer.DIRECTION_HORIZONTAL, threshold: 40, velocity: 0.3 });

  mc.on("swipeleft", (e) => {
    if (e.target.closest('.category-container')) return;
    if (e.target.closest('#pdfScrollArea')) return;
    if (e.target.closest('#pdfReaderModal')) return;
    if (localStorage.getItem("user_role") && navigator.onLine) showSection('kelas');
  });

  mc.on("swiperight", (e) => {
    if (e.target.closest('.category-container')) return;
    if (e.target.closest('#pdfScrollArea')) return;
    if (e.target.closest('#pdfReaderModal')) return;
    if (localStorage.getItem("user_role")) showSection('books');
  });

  // Enter di login
  document.getElementById("usernameInput")?.addEventListener("keydown", e => { if (e.key === "Enter") handleLogin(); });
  document.getElementById("passcodeInput")?.addEventListener("keydown", e => { if (e.key === "Enter") handleLogin(); });
  document.getElementById("inputClassCode")?.addEventListener("keydown", e => { if (e.key === "Enter") joinClass(); });

  // Swipe tutup bottom sheet
  const bottomSheet = document.getElementById("bottomSheet");
  if (bottomSheet) {
    const sh = new Hammer(bottomSheet);
    sh.get('swipe').set({ direction: Hammer.DIRECTION_DOWN });
    sh.on("swipedown", () => {
      if (bottomSheet.classList.contains("active")) closeSheet();
    });
  }

  // Hemat baterai: pause polling saat tab tersembunyi
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (syncInterval)           { clearInterval(syncInterval);           syncInterval = null; }
      if (window.pantuanInterval) { clearInterval(window.pantuanInterval); window.pantuanInterval = null; }
    } else {
      // Pulihkan polling murid
      const liveArea = document.getElementById("liveClassArea");
      if (liveArea && !liveArea.classList.contains("hidden") && !syncInterval) {
        syncInterval = setInterval(syncWithGuru, 3000);
      }
      // Pulihkan polling guru
      const role = localStorage.getItem("user_role");
      const kelasSection = document.getElementById("kelasSection");
      if ((role === "Guru" || role === "Developer") &&
          kelasSection && !kelasSection.classList.contains("hidden") &&
          !window.pantuanInterval) {
        window.pantuanInterval = setInterval(pantauJawaban, 3000);
      }
    }
  });
});

window.addEventListener('online',  updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

window.onload = () => { initApp(); };

// Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('✅ SW aktif:', reg.scope))
      .catch(err => console.error('❌ SW gagal:', err));
  });
}

// =============================================
//  OFFLINE READINESS CHECKER
//  Tambahkan di main.js, di dalam DOMContentLoaded
// =============================================

// Dengarkan pesan dari Service Worker
navigator.serviceWorker.addEventListener('message', (event) => {

  // Notifikasi otomatis saat pertama kali install selesai
  if (event.data?.type === 'CACHE_READY') {
    if (!localStorage.getItem('cache_ready_notified')) {
      showToast('✅ Semua buku tersimpan — siap dipakai offline!');
      localStorage.setItem('cache_ready_notified', '1');
    }
  }

  // Hasil cek manual
  if (event.data?.type === 'CACHE_STATUS_RESULT') {
    const { total, cached, missing, ready, percent } = event.data;
    _tampilkanHasilCek(total, cached, missing, ready, percent);
  }
});

// =============================================
//  Fungsi cek manual — dipanggil dari tombol
// =============================================
function cekStatusOffline() {
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
    showToast('⚠️ Service Worker belum aktif. Coba muat ulang halaman.');
    return;
  }
  // Kirim perintah ke SW
  navigator.serviceWorker.controller.postMessage({ type: 'CHECK_CACHE_STATUS' });
  showToast('🔍 Memeriksa status offline...');
}

// =============================================
//  Tampilkan hasil sebagai popup/sheet kecil
// =============================================
function _tampilkanHasilCek(total, cached, missing, ready, percent) {
  // Hapus popup lama kalau ada
  const existing = document.getElementById('offlineStatusPopup');
  if (existing) existing.remove();

  const popup = document.createElement('div');
  popup.id    = 'offlineStatusPopup';
  popup.style.cssText = `
    position: fixed;
    bottom: calc(96px + var(--safe-bottom, 0px));
    left: 50%; transform: translateX(-50%);
    width: min(340px, 90vw);
    background: var(--surface);
    border: 1.5px solid var(--border);
    border-radius: 20px;
    padding: 20px;
    box-shadow: 0 12px 32px rgba(0,0,0,0.18);
    z-index: 99999;
    animation: toastIn 0.22s var(--ease);
    font-family: inherit;
  `;

  const barColor = ready ? '#10b981' : percent >= 50 ? '#f59e0b' : '#ef4444';
  const icon     = ready ? '✅' : '⚠️';
  const judul    = ready ? 'Siap Offline!' : 'Belum Sepenuhnya Tersimpan';
  const deskripsi = ready
    ? `Semua ${total} file sudah tersimpan di perangkat ini. Aplikasi bisa dipakai tanpa internet.`
    : `${cached} dari ${total} file tersimpan (${percent}%). ${missing.length} file belum ter-cache.`;

  const missingHTML = !ready && missing.length > 0
    ? `<div style="margin-top:10px; padding:10px; background:var(--surface-2); border-radius:10px; max-height:80px; overflow-y:auto;">
        ${missing.map(f => `<div style="font-size:11px; color:var(--text-2); padding:1px 0;">📄 ${f.replace('./books/', '').replace('./', '')}</div>`).join('')}
       </div>`
    : '';

  popup.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
      <span style="font-size:14px; font-weight:800;">${icon} ${judul}</span>
      <button onclick="document.getElementById('offlineStatusPopup').remove()"
        style="background:none; border:none; font-size:18px; cursor:pointer; color:var(--text-2); padding:0 4px;">✕</button>
    </div>
    <div style="background:var(--surface-2); border-radius:8px; height:8px; overflow:hidden; margin-bottom:10px;">
      <div style="height:100%; width:${percent}%; background:${barColor}; border-radius:8px; transition:width 0.4s ease;"></div>
    </div>
    <p style="font-size:12px; color:var(--text-2); line-height:1.5; margin-bottom:4px;">${deskripsi}</p>
    ${missingHTML}
    ${!ready ? `
    <button onclick="document.getElementById('offlineStatusPopup').remove(); showToast('Buka aplikasi saat ada internet untuk menyimpan file yang kurang.');"
      style="margin-top:12px; width:100%; padding:10px; border-radius:12px; 
             background:var(--accent); color:white; border:none; 
             font-weight:800; font-size:13px; cursor:pointer; font-family:inherit;">
      Mengerti
    </button>` : ''}
    <button onclick="document.getElementById('offlineStatusPopup').remove()"
      style="margin-top:${ready ? '12px' : '8px'}; width:100%; padding:10px; border-radius:12px; 
             background:var(--surface-2); color:var(--text-2); border:none; 
             font-weight:700; font-size:13px; cursor:pointer; font-family:inherit;">
      Tutup
    </button>
  `;

  document.body.appendChild(popup);

  // Auto tutup setelah 10 detik
  setTimeout(() => { if (popup.parentNode) popup.remove(); }, 10000);
}
// =============================================
//  PENCEGAHAN INSPEKSI (non-Developer)
// =============================================
document.addEventListener('contextmenu', (e) => {
  if (localStorage.getItem('user_role') !== 'Developer') {
    e.preventDefault();
    showToast('⚠️ Fitur ini tidak tersedia');
  }
});

document.addEventListener('keydown', (e) => {
  if (localStorage.getItem('user_role') === 'Developer') return;
  const blocked =
    e.key === 'F12' ||
    (e.ctrlKey && e.shiftKey && ['I','J','C'].includes(e.key.toUpperCase())) ||
    (e.ctrlKey && ['U','S'].includes(e.key.toUpperCase()));
  if (blocked) {
    e.preventDefault();
    showToast('⚠️ Fitur ini tidak tersedia');
  }
});

// =============================================
//  STATUS KONEKSI
// =============================================
function updateOnlineStatus() {
  const statusDiv    = document.getElementById("connectionStatus");
  const navKelas     = document.getElementById("nav-kelas");
  const offlineBanner = document.getElementById("offlineBanner");
  if (!statusDiv) return;

  const isOnline = navigator.onLine;
  statusDiv.innerText    = isOnline ? "🌐 Online — Fitur kelas aktif" : "📡 Offline — Mode baca";
  statusDiv.style.color  = isOnline ? "var(--green)" : "#ef4444";

  if (offlineBanner) offlineBanner.classList.toggle("show", !isOnline);

  if (navKelas) navKelas.style.display = isOnline ? "" : "none";
  if (!isOnline) showSection('books');
}
