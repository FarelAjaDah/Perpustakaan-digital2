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
