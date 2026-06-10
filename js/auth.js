// =============================================
//  AUTH — Pustaka Digital
// =============================================
const ACCESS_KEYS = {
  "AKUGURU": "Guru",
  "MURID":   "Murid"
};

function handleLogin() {
  const userVal = document.getElementById("usernameInput").value.trim();
  const passVal = document.getElementById("passcodeInput").value.trim().toUpperCase();

  if (!userVal) {
    showToast("⚠️ Masukkan nama pengguna dulu!");
    return;
  }
  if (!passVal) {
    showToast("⚠️ Masukkan kode akses dulu!");
    return;
  }

  if (passVal === "DEVELOPER") {
    localStorage.setItem("user_role", "Developer");
    localStorage.setItem("user_name", userVal);
    initApp();
    showToast("Mode Developer Aktif! 🛠️");
  } else if (ACCESS_KEYS[passVal]) {
    localStorage.setItem("user_role", ACCESS_KEYS[passVal]);
    localStorage.setItem("user_name", userVal);
    initApp();
    showToast(`Selamat datang, ${userVal}! 👋`);
  } else {
    showToast("❌ Kode akses salah! Coba lagi.");
    // Goyangkan input kode untuk feedback visual
    const passInput = document.getElementById("passcodeInput");
    passInput.style.animation = "shake 0.35s ease";
    setTimeout(() => { passInput.style.animation = ""; }, 400);
  }
}

function logout() {
  const existing = document.getElementById("logoutConfirm");
  if (existing) { existing.remove(); return; }

  const box = document.createElement("div");
  box.id = "logoutConfirm";
  box.style.cssText = `
    position: fixed; bottom: calc(96px + var(--safe-bottom)); left: 50%;
    transform: translateX(-50%);
    background: var(--surface); color: var(--text);
    border: 1.5px solid var(--border);
    padding: 16px 20px; border-radius: 20px;
    box-shadow: 0 12px 32px rgba(0,0,0,0.18);
    z-index: 99999; display: flex; align-items: center;
    gap: 14px; white-space: nowrap;
    animation: toastIn 0.22s var(--ease);
    font-family: inherit;
  `;
  box.innerHTML = `
    <span style="font-size:14px; font-weight:700;">Yakin mau keluar?</span>
    <button onclick="doLogout()" style="
      background:#e05252; color:white; border:none;
      padding:8px 16px; border-radius:10px;
      font-weight:800; font-size:13px; cursor:pointer;
      font-family:inherit;">Keluar</button>
    <button onclick="document.getElementById('logoutConfirm').remove()" style="
      background:var(--surface-2); color:var(--text-2); border:none;
      padding:8px 14px; border-radius:10px;
      font-weight:700; font-size:13px; cursor:pointer;
      font-family:inherit;">Batal</button>
  `;
  document.body.appendChild(box);
  setTimeout(() => { if (box.parentNode) box.remove(); }, 5000);
}

function doLogout() {
  const box = document.getElementById("logoutConfirm");
  if (box) box.remove();
  // Bersihkan semua interval aktif
  if (syncInterval) clearInterval(syncInterval);
  if (window.pantuanInterval) clearInterval(window.pantuanInterval);
  localStorage.removeItem("user_role");
  localStorage.removeItem("user_name");
  showToast("Sampai jumpa! 👋");
  setTimeout(() => location.reload(), 1500);
}

function updateVisualRole() {
  const role  = localStorage.getItem("user_role");
  const badge = document.getElementById("roleBadge");
  if (!role || !badge) return;

  document.body.setAttribute("data-user-role", role);

  if (role === "Guru") {
    badge.innerText = "🧑‍🏫 Guru";
  } else if (role === "Developer") {
    badge.innerText = "🛠️ Developer";
  } else {
    badge.innerText = "📖 Murid";
  }
}

// =============================================
//  DEVELOPER: Quick Switch
// =============================================
function quickSwitch(newRole) {
  localStorage.setItem("user_role", newRole);
  localStorage.setItem("user_name", "Dev-" + newRole);
  initApp();
  showSection('kelas');
  toggleDevMenu();
  showToast(`Switched ke role: ${newRole} 🛠️`);
}