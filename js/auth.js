// =============================================
//  INI EEE APA YA BACA SENIDIRI LAH
// =============================================
const ACCESS_KEYS = {
  "AKUGURU": "Guru",
  "MURID":   "Murid"
};

function handleLogin() {
  const userVal = document.getElementById("usernameInput").value.trim();
  const passVal = document.getElementById("passcodeInput").value.trim().toUpperCase();

  if (!userVal) {
    showToast("Masukkan nama pengguna dulu!");
    return;
  }

  if (passVal === "DEVELOPER") {
    localStorage.setItem("user_role", "Developer");
    localStorage.setItem("user_name", userVal || "Admin Dev");
    initApp();
    showToast("Mode Developer Aktif! 🛠️");
  } else if (ACCESS_KEYS[passVal]) {
    localStorage.setItem("user_role", ACCESS_KEYS[passVal]);
    localStorage.setItem("user_name", userVal);
    initApp();
    showToast(`Selamat datang, ${userVal}! 👋`);
  } else {
    showToast("Kode akses salah! Coba lagi.");
  }
}

function logout() {
  if (confirm("Yakin mau keluar?")) {
    if (syncInterval) clearInterval(syncInterval);
    if (window.pantuanInterval) clearInterval(window.pantuanInterval);
    localStorage.removeItem("user_role");
    localStorage.removeItem("user_name");
    location.reload();
  }
}

function updateVisualRole() {
  const role  = localStorage.getItem("user_role");
  const badge = document.getElementById("roleBadge");
  if (!role || !badge) return;

  document.body.setAttribute("data-user-role", role);

  if (role === "Guru") {
    badge.innerText = "🧐Akun Sensei";
  } else if (role === "Developer") {
    badge.innerText = "🛠️ Developer";
  } else {
    badge.innerText = "📖 Akun Murid";
  }
}

// =============================================
//  MODE ADMIN 😈😈
// =============================================

function quickSwitch(newRole) {
  localStorage.setItem("user_role", newRole);
  localStorage.setItem("user_name", "Dev-" + newRole);
  initApp();
  showSection('kelas');
  toggleDevMenu();
  showToast(`Switched ke role: ${newRole} 🛠️`);
}