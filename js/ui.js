// =============================================
//  notif wa ( toast )
// =============================================

function showToast(msg) {
  const toast   = document.getElementById("toast");
  toast.innerText = msg;
  toast.style.display = "block";
  clearTimeout(toast._timer);
  toast._timer  = setTimeout(() => { toast.style.display = "none"; }, 2500);
}

// =============================================
//  BOTTOM SHEET
// =============================================
function openSheet() {
  document.getElementById("sheetOverlay").classList.add("active");
  document.getElementById("bottomSheet").classList.add("active");
}

function closeSheet() {
  document.getElementById("sheetOverlay").classList.remove("active");
  document.getElementById("bottomSheet").classList.remove("active");
}

// =============================================
//  TEMA? TEMA ITU APA YA ?
// =============================================
function toggleTheme() {
  const current = document.body.getAttribute('data-theme');
  const next    = current === 'dark' ? 'light' : 'dark';
  document.body.setAttribute('data-theme', next);
  localStorage.setItem("theme", next);
}

function applySavedTheme() {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme) document.body.setAttribute('data-theme', savedTheme);
}

function showSection(type) {
  const isBooks = type === 'books';

  document.getElementById("bookSection").classList.toggle("hidden", !isBooks);
  document.getElementById("kelasSection").classList.toggle("hidden", isBooks);
  document.getElementById("searchArea").classList.toggle("hidden", !isBooks);

  document.getElementById("nav-books").classList.toggle("active", isBooks);
  document.getElementById("nav-kelas").classList.toggle("active", !isBooks);

  if (type === 'kelas') setupKelasUI();
}

function toggleDevMenu() {
  document.getElementById("devMenu").classList.toggle("hidden");
}

function toggleFullScreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    if (document.exitFullscreen) document.exitFullscreen();
  }
}