function initApp() {
  const role = localStorage.getItem("user_role");

  if (!role) {
    document.getElementById("mainPage").classList.add("hidden");
    document.getElementById("loginPage").classList.remove("hidden");
    return;
  }

  const devFab = document.getElementById("devFab");
  if (role === "Developer" || role === "Guru") {
    devFab.classList.remove("hidden");
  } else {
    devFab.classList.add("hidden");
  }

  document.getElementById("loginPage").classList.add("hidden");
  document.getElementById("mainPage").classList.remove("hidden");

  updateVisualRole();
  document.getElementById("welcomeText").innerText = `Halo, ${localStorage.getItem("user_name")}! 👋`;

  renderBooks("");
  renderLastRead();
  updateOnlineStatus();
}

// =============================================
//  EVENT LISTENERS & INIT
// =============================================
document.addEventListener("DOMContentLoaded", () => {
  applySavedTheme();

  const mc = new Hammer(document.body);
  mc.get('swipe').set({ direction: Hammer.DIRECTION_HORIZONTAL });

  mc.on("swipeleft", (e) => {
    if (e.target.closest('.category-container')) return;
    if (localStorage.getItem("user_role") && navigator.onLine) {
      showSection('kelas');
    }
  });

  mc.on("swiperight", (e) => {
    if (e.target.closest('.category-container')) return;
    if (localStorage.getItem("user_role")) {
      showSection('books');
    }
  });

  document.getElementById("usernameInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleLogin();
  });
  document.getElementById("passcodeInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleLogin();
  });
  document.getElementById("inputClassCode").addEventListener("keydown", (e) => {
    if (e.key === "Enter") joinClass();
  });

  const bottomSheet = document.getElementById("bottomSheet");
  if (bottomSheet) {
    const sheetHammer = new Hammer(bottomSheet);
    sheetHammer.get('swipe').set({ direction: Hammer.DIRECTION_DOWN });
    sheetHammer.on("swipedown", () => {
      if (bottomSheet.classList.contains("active")) closeSheet();
    });
  }

  // Hemat baterai & kuota: pause polling saat tab tidak aktif
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (syncInterval)            { clearInterval(syncInterval);            }
      if (window.pantuanInterval)  { clearInterval(window.pantuanInterval);  }
    } else {
      // Resume saat tab aktif kembali
      if (document.getElementById("liveClassArea") &&
          !document.getElementById("liveClassArea").classList.contains("hidden")) {
        if (!syncInterval) syncInterval = setInterval(syncWithGuru, 3000);
      }
      const role = localStorage.getItem("user_role");
      if ((role === "Guru" || role === "Developer") &&
          document.getElementById("kelasSection") &&
          !document.getElementById("kelasSection").classList.contains("hidden")) {
        if (!window.pantuanInterval) window.pantuanInterval = setInterval(pantauJawaban, 3000);
      }
    }
  });
});

window.addEventListener('online',  updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

window.onload = () => {
  initApp();
};

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('✅ Service Worker aktif:', reg.scope))
      .catch(err => console.error('❌ Service Worker gagal:', err));
  });
}

// =============================================
//  STATUS KONEKSI
// =============================================
function updateOnlineStatus() {
  const statusDiv = document.getElementById("connectionStatus");
  const navKelas  = document.getElementById("nav-kelas");

  if (!statusDiv || !navKelas) return;

  const isOnline = navigator.onLine;
  statusDiv.innerText = isOnline ? "🌐 ONLINE — FITUR KELAS AKTIF" : "📡 OFFLINE — MODE BACA";
  statusDiv.style.color = isOnline ? "#10b981" : "#ef4444";

  if (!isOnline) {
    showSection('books');
    navKelas.style.display = "none";
  } else {
    navKelas.style.display = "";
  }
}
