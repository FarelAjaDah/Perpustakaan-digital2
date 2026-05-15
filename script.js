// ==============================================
//  PUSTAKA FURINA v5 - script.js
//  Last Updated: 11 Mei 2026
//  Bug Fixes: mulaiQuizFile, setCategory, swipe conflict,
//             Enter key joinClass, double applySavedTheme
// ==============================================

const FIREBASE_URL = "https://perpustakaan-digital-5e62a-default-rtdb.asia-southeast1.firebasedatabase.app/class_sync.json";

const ACCESS_KEYS = {
  "AKUGURU": "Guru",
  "MURID": "Murid"
};

const books = [
  { title: "Matematika",           file: "matematika.pdf",    emoji: "📐", color: "#3b82f6", category: "Pelajaran" },
  { title: "Sejarah",              file: "sejarah.pdf",       emoji: "📜", color: "#f59e0b", category: "Pelajaran" },
  { title: "Biologi",              file: "biologi.pdf",       emoji: "🧬", color: "#10b981", category: "Pelajaran" },
  { title: "Bahasa Jepang",        file: "jp.pdf",            emoji: "🗾", color: "#ef4444", category: "Pelajaran" },
  { title: "Fisika",               file: "fisika.pdf",        emoji: "🔬", color: "#6366f1", category: "Pelajaran" },
  { title: "Kimia",                file: "kimia.pdf",         emoji: "⚗️", color: "#f97316", category: "Pelajaran" },
  { title: "One Piece",            file: "op.pdf",            emoji: "🏴‍☠️", color: "#ef4444", category: "Komik"    },
  { title: "Solo Leveling",        file: "sl.pdf",            emoji: "⚔️", color: "#6366f1", category: "Komik"    },
  { title: "Detective Conan",      file: "conan.pdf",         emoji: "🕵️", color: "#10b981", category: "Komik"    },
  { title: "Laskar Pelangi",       file: "lp.pdf",            emoji: "🌈", color: "#10b981", category: "Novel"    },
  { title: "Harry Potter",         file: "hp.pdf",            emoji: "⚡", color: "#475569", category: "Novel"    },
  { title: "Laut Bercerita",       file: "laut.pdf",          emoji: "🌊", color: "#3b82f6", category: "Novel"    },
  { title: "Dilan 1990",           file: "dilan.pdf",         emoji: "🏍️", color: "#f59e0b", category: "Novel"    },
  { title: "Kubo Won't Let Me...", file: "kubo.pdf",          emoji: "👻", color: "#ef4444", category: "Novel"    },
  { title: "Stop Overthinking",    file: "stop.pdf",          emoji: "🧠", color: "#6366f1", category: "Novel"    },
  { title: "Soal Geografi 11",     file: "geografi 11.pdf",   emoji: "🗺️", color: "#f59e0b", category: "Ujian"    },
  { title: "Soal OSN Tingkat Kota",file: "osn-kota.pdf",      emoji: "🏆", color: "#f97316", category: "Ujian"    },
  { title: "Latihan Sosiologi 11", file: "sosiologi 11.pdf",  emoji: "👥", color: "#10b981", category: "Latihan"  },
  { title: "Literasi Digital pada masyarkat desa oleh Rural, I N", file: "Jurnal 1.pdf", emoji: "📖", color: "#3b82f6", category: "Jurnal" },
];

let currentCategory = "Semua";
let syncInterval = null;
let lastStatus = "";



// =============================================
//  AUTH & INIT
// =============================================
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

  document.getElementById("roleBadge").innerText = role.toUpperCase();
  document.getElementById("welcomeText").innerText = `Halo, ${localStorage.getItem("user_name")}! 👋`;

  renderBooks("");
  renderLastRead();
  updateOnlineStatus();
}

function logout() {
  if (confirm("Yakin mau keluar?")) {
    if (syncInterval) clearInterval(syncInterval);
    if (window.pantuanInterval) clearInterval(window.pantuanInterval);
    localStorage.clear();
    location.reload();
  }
}


// =============================================
//  STATUS KONEKSI
// =============================================
function updateOnlineStatus() {
  const statusDiv = document.getElementById("connectionStatus");
  const navKelas = document.getElementById("nav-kelas");

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


// =============================================
//  BUKU & KOLEKSI
// =============================================
function renderBooks(kw) {
  const list = document.getElementById("bookList");
  const role = localStorage.getItem("user_role");
  const keyword = (kw || "").toLowerCase();

  const filtered = books.filter(b => {
    const matchKeyword = b.title.toLowerCase().includes(keyword);
    const matchCategory = (currentCategory === "Semua") || (b.category === currentCategory);

    if ((b.category === "Latihan" || b.category === "Ujian") && role === "Murid") {
      return false;
    }

    return matchCategory && matchKeyword;
  });

  document.getElementById("bookCounter").innerText = `${filtered.length} buku ditemukan`;

  // IMPROVEMENT: empty state kalau tidak ada hasil
  if (filtered.length === 0) {
    list.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 48px 20px; color: var(--text-soft);" class="animate">
        <div style="font-size: 52px; margin-bottom: 16px; opacity: 0.5;">🔍</div>
        <p style="font-weight: 800; font-size: 15px; color: var(--text-main); margin-bottom: 6px;">Buku tidak ditemukan</p>
        <p style="font-size: 13px;">Coba kata kunci lain atau ganti kategori</p>
      </div>
    `;
    return;
  }

  list.innerHTML = filtered.map((b, index) => `
    <div class="book-card animate" style="animation-delay: ${index * 0.05}s"
         onclick="openBookDetails('${b.title.replace(/'/g, "\\'")}', '${b.file}', '${b.emoji}', '${b.color}')">
      <div class="book-cover" style="background: ${b.color}20; color: ${b.color};">${b.emoji}</div>
      <div style="font-weight: 800; font-size: 14px; color: var(--text-main); line-height: 1.3;">${b.title}</div>
      <div style="font-size: 10px; color: var(--accent); font-weight: 700; margin-top: 6px; opacity: 0.8;">
        ${b.category.toUpperCase()}
      </div>
    </div>
  `).join('');
}

// BUG FIX: setCategory — sebelumnya bisa matiin active-cat di tombol yang harusnya aktif
// karena pakai .includes() yang bisa partial-match antar nama kategori.
// Sekarang pakai data-category attribute untuk exact match.
function setCategory(cat) {
  currentCategory = cat;
  document.querySelectorAll('.cat-btn').forEach(btn => {
    const btnCat = btn.getAttribute('data-category');
    btn.classList.toggle('active-cat', btnCat === cat);
  });
  renderBooks(document.getElementById("searchInput").value);
}

function renderLastRead() {
  const lastReadData = localStorage.getItem("last_read_book");
  const container = document.getElementById("lastReadContainer");
  const cardPlace = document.getElementById("lastReadCard");

  if (!container || !cardPlace) return;

  if (lastReadData) {
    try {
      const book = JSON.parse(lastReadData);
      container.classList.remove("hidden");
      cardPlace.innerHTML = `
        <div onclick="openBookDetails('${book.title.replace(/'/g, "\\'")}', '${book.file}', '${book.emoji}', '${book.color || ''}')"
             style="background: var(--card-bg); padding: 15px; border-radius: 20px; display: flex; align-items: center; gap: 15px; box-shadow: var(--shadow-sm); border: 1px solid var(--glass-border); cursor: pointer;">
          <div style="font-size: 30px;">${book.emoji}</div>
          <div style="flex: 1;">
            <h4 style="margin: 0; font-size: 14px;">${book.title}</h4>
            <p style="margin: 0; font-size: 11px; color: var(--text-soft);">Klik untuk lanjut membaca</p>
          </div>
          <div style="color: var(--accent); font-size: 20px;">➔</div>
        </div>
      `;
    } catch (e) {
      localStorage.removeItem("last_read_book");
      container.classList.add("hidden");
    }
  } else {
    container.classList.add("hidden");
  }
}


// =============================================
//  NAVIGASI & SECTION
// =============================================
function showSection(type) {
  const isBooks = type === 'books';

  document.getElementById("bookSection").classList.toggle("hidden", !isBooks);
  document.getElementById("kelasSection").classList.toggle("hidden", isBooks);
  document.getElementById("searchArea").classList.toggle("hidden", !isBooks);

  document.getElementById("nav-books").classList.toggle("active", isBooks);
  document.getElementById("nav-kelas").classList.toggle("active", !isBooks);

  if (type === 'kelas') setupKelasUI();
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

function openBookDetails(title, file, emoji, color) {
  document.getElementById("sheetTitle").innerText = title;
  document.getElementById("sheetEmoji").innerText = emoji;

  const bookData = books.find(b => b.file === file);
  document.getElementById("sheetCategory").innerText = bookData ? bookData.category : "Materi";

  const url = `books/${file}`;
  document.getElementById("sheetPreview").innerHTML = `
    <div style="height: 60vh; -webkit-overflow-scrolling: touch; overflow-y: scroll;">
      <iframe src="${url}" width="100%" height="100%" style="border:none; border-radius:15px;"></iframe>
    </div>
  `;

  document.getElementById("btnReadNow").onclick = () => {
    closeSheet();
    const lastRead = { file, title, emoji, color: color || (bookData ? bookData.color : ''), time: new Date().getTime() };
    localStorage.setItem("last_read_book", JSON.stringify(lastRead));
    renderLastRead();
    amanBukaBuku(file);
  };

  openSheet();
}

async function amanBukaBuku(fileName) {
  try {
    const response = await fetch(`books/${fileName}`, { method: 'HEAD' });
    if (response.ok) {
      window.open(`books/${fileName}`, '_blank');
    } else {
      showToast("⚠️ File belum tersedia atau tidak ditemukan.");
    }
  } catch (err) {
    window.open(`books/${fileName}`, '_blank');
  }
}


// =============================================
//  RUANG KELAS - SETUP
// =============================================
function setupKelasUI() {
  const role = localStorage.getItem("user_role");
  const isGuru = role === "Guru" || role === "Developer";

  document.getElementById("guruView").classList.toggle("hidden", !isGuru);
  document.getElementById("muridView").classList.toggle("hidden", isGuru);

  if (isGuru) {
    if (window.pantuanInterval) clearInterval(window.pantuanInterval);
    window.pantuanInterval = setInterval(pantauJawaban, 3000);

    if (document.getElementById("activeCode").innerText === "-----") {
      const kode = generateKode();
      document.getElementById("activeCode").innerText = kode;
      generateQR(kode);
    }
  }
}

function generateKode() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

function refreshKodeKelas() {
  const kode = generateKode();
  document.getElementById("activeCode").innerText = kode;
  generateQR(kode);
  showToast("Kode kelas diperbarui! 🔑");
}


// =============================================
//  RUANG KELAS - GURU
// =============================================
function updateClassStatus(status, content = "", onDone = null) {
  const codeElement = document.getElementById("activeCode");
  let currentCode = codeElement.innerText.trim();

  if ((status === "Presentasi" || status === "Kuis") && (currentCode === "-----" || !currentCode)) {
    currentCode = generateKode();
    codeElement.innerText = currentCode;
    generateQR(currentCode);
  }

  if (status === "Selesai") {
    fetch(FIREBASE_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: "Selesai", content: "", code: "-----", file: "" })
    }).then(() => {
      codeElement.innerText = "-----";
      document.getElementById("qrcode").innerHTML = "";
      showToast("Sesi berhasil diakhiri! 👋");
      if (window.pantuanInterval) clearInterval(window.pantuanInterval);
      document.getElementById("listJawabanMurid").innerHTML = `<p style="font-size:12px; color:var(--text-soft);">Sesi berakhir.</p>`;
      if (onDone) onDone();
    }).catch(() => { showToast("❌ Gagal menghubungi server."); if (onDone) onDone(); });
    return;
  }

  fetch(FIREBASE_URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status,
      content: status === "Kuis" ? content : "",
      code: currentCode,
      file: status === "Presentasi" ? content : ""
    })
  }).then(res => {
    if (res.ok) showToast(`Mode ${status} aktif! 🚀`);
    if (onDone) onDone();
  }).catch(() => { showToast("❌ Gagal menyambung ke server."); if (onDone) onDone(); });
}

function setButtonLoading(btn, loadingText) {
  if (!btn) return null;
  const orig = btn.innerHTML;
  btn.innerHTML = `<span class="btn-spinner"></span> ${loadingText}`;
  btn.disabled = true;
  return orig;
}

function resetButton(btn, originalText) {
  if (!btn) return;
  btn.innerHTML = originalText;
  btn.disabled = false;
}

function mulaiPresentasiPDF() {
  const file = document.getElementById("selectFileBuku").value;
  const btn = document.querySelector("#guruView button[onclick='mulaiPresentasiPDF()']");
  const orig = setButtonLoading(btn, "Membagikan...");
  updateClassStatus("Presentasi", file, () => resetButton(btn, orig));
}

function mulaiQuiz() {
  const soal = document.getElementById("quizText").value.trim();
  if (!soal) return showToast("Ketik soalnya dulu!");
  const btn = document.querySelector("#guruView button[onclick='mulaiQuiz()']");
  const orig = setButtonLoading(btn, "Mengirim...");
  updateClassStatus("Kuis", soal, () => resetButton(btn, orig));
}

// BUG FIX: sebelumnya mengirim object JS langsung sebagai `content`,
// yang menyebabkan Firebase menerima data tidak konsisten dan murid
// tidak bisa parse data.content.tipe dengan benar.
// Sekarang dikirim sebagai JSON string dan di-parse di sisi murid.
function mulaiQuizFile() {
  const file = document.getElementById("selectQuizFile").value;
  if (!file) return showToast("Pilih file kuis dulu!");
  const contentPayload = JSON.stringify({ tipe: "pdf", namaFile: file });
  const btn = document.querySelector("#guruView button[onclick='mulaiQuizFile()']");
  const orig = setButtonLoading(btn, "Mengirim...");
  updateClassStatus("Kuis", contentPayload, () => resetButton(btn, orig));
}

function pantauJawaban() {
  const code = document.getElementById("activeCode").innerText;
  if (code === "-----" || !code) return;

  fetch(`https://perpustakaan-digital-5e62a-default-rtdb.asia-southeast1.firebasedatabase.app/answers/${code}.json`)
    .then(res => res.json())
    .then(data => {
      const container = document.getElementById("listJawabanMurid");
      if (!data) {
        container.innerHTML = `<p style="font-size:12px; opacity:0.5; text-align:center; padding:10px;">Menunggu jawaban murid...</p>`;
        return;
      }
      container.innerHTML = Object.keys(data).map(key => `
        <div class="answer-bubble animate">
          <div class="answer-header">
            <span class="student-name">👤 ${data[key].nama}</span>
            <span style="color:var(--text-soft);">${data[key].waktu || ''}</span>
          </div>
          <div style="font-size:13px;">${data[key].jawaban}</div>
        </div>
      `).join('');
    })
    .catch(() => { /* silent fail saat offline */ });
}


// =============================================
//  RUANG KELAS - MURID
// =============================================
function joinClass() {
  const input = document.getElementById("inputClassCode").value.trim().toUpperCase();
  if (!input) return showToast("Masukkan kode kelas dulu!");

  // IMPROVEMENT: loading state supaya user tau sedang proses
  const btn = document.querySelector("#joinArea .btn-main");
  const originalText = btn ? btn.innerHTML : null;
  if (btn) { btn.innerHTML = `<span class="btn-spinner"></span> Menyambungkan...`; btn.disabled = true; }

  fetch(FIREBASE_URL)
    .then(res => res.json())
    .then(data => {
      if (btn) { btn.innerHTML = originalText; btn.disabled = false; }
      if (data && input === data.code) {
        document.getElementById("joinArea").classList.add("hidden");
        document.getElementById("liveClassArea").classList.remove("hidden");
        syncInterval = setInterval(syncWithGuru, 3000);
        showToast("Berhasil masuk kelas! 🎉");
      } else {
        showToast("Kode salah atau kelas belum dibuka!");
      }
    })
    .catch(() => {
      if (btn) { btn.innerHTML = originalText; btn.disabled = false; }
      showToast("❌ Tidak bisa terhubung. Periksa koneksi.");
    });
}

function syncWithGuru() {
  fetch(FIREBASE_URL)
    .then(res => res.json())
    .then(data => {
      if (!data || data.status === "Selesai") {
        handleSesiBerakhir();
        return;
      }

      const container = document.getElementById("classContent");
      const statusText = document.getElementById("currentStatus");

      if (data.status !== lastStatus) {
        showToast(`Status: ${data.status}`);
        lastStatus = data.status;
      }

      if (data.status === "Presentasi") {
        statusText.innerText = "📺 GURU SEDANG PRESENTASI";
        container.innerHTML = `<iframe src="books/${data.file}" width="100%" height="420px" class="iframe" style="border:none;"></iframe>`;
      } else if (data.status === "Kuis") {
        statusText.innerText = "📝 KUIS SEDANG BERLANGSUNG";

        // BUG FIX: data.content sekarang bisa berupa JSON string (dari mulaiQuizFile)
        // atau plain string (dari mulaiQuiz). Parse dulu, kalau gagal berarti plain string.
        let parsedContent = data.content;
        if (typeof data.content === 'string') {
          try {
            parsedContent = JSON.parse(data.content);
          } catch (e) {
            parsedContent = data.content; // tetap plain string
          }
        }

        const isPdf = parsedContent && typeof parsedContent === 'object' && parsedContent.tipe === "pdf";

        if (isPdf) {
          container.innerHTML = `
            <div style="padding:16px;" class="animate">
              <p style="font-weight:700; margin-bottom:12px; color:var(--text-main);">📄 Kuis dari File PDF:</p>
              <iframe src="books/${parsedContent.namaFile}" width="100%" height="300px" style="border:none; border-radius:12px;"></iframe>
              <textarea id="jawabanMuridText" placeholder="Ketik jawabanmu di sini..." style="width:100%; height:80px; margin-top:12px; padding:12px; border-radius:12px; border:1px solid var(--glass-border); font-family:inherit; background:var(--input-bg); color:var(--text-main);"></textarea>
              <button class="btn-main" style="margin-top:10px; background:var(--accent);" onclick="kirimJawabanKeGuru('${data.code}', '${localStorage.getItem("user_name")}')">Kirim Jawaban ✉️</button>
            </div>`;
        } else {
          container.innerHTML = `
            <div style="padding:20px; text-align:left;" class="animate">
              <p style="font-weight:700; margin-bottom:12px; color:var(--text-main);">❓ Soal: ${data.content}</p>
              <textarea id="jawabanMuridText" placeholder="Ketik jawabanmu..." style="width:100%; height:100px; padding:12px; border-radius:12px; border:1px solid var(--glass-border); font-family:inherit; background:var(--input-bg); color:var(--text-main);"></textarea>
              <button class="btn-main" style="margin-top:10px; background:var(--accent);" onclick="kirimJawabanKeGuru('${data.code}', '${localStorage.getItem("user_name")}')">Kirim Jawaban ✉️</button>
            </div>`;
        }
      } else {
        statusText.innerText = "⏳ MENUNGGU GURU...";
        container.innerHTML = `<div style="padding:40px; text-align:center; color:var(--text-soft);">Sesi belum dimulai oleh guru.</div>`;
      }
    })
    .catch(() => { /* silent fail */ });
}

function kirimJawabanKeGuru(code, nama) {
  const isiJawaban = document.getElementById("jawabanMuridText")?.value?.trim();
  if (!isiJawaban) return showToast("Jawaban tidak boleh kosong!");

  const preview = isiJawaban.length > 80 ? isiJawaban.substring(0, 80) + "..." : isiJawaban;
if (!confirm(`Kirim jawaban ini?\n\n"${preview}"`)) return;
  const kirimBtn = document.querySelector("#classContent .btn-main");
  const originalText = kirimBtn ? kirimBtn.innerHTML : null;
  if (kirimBtn) {
    kirimBtn.innerHTML = '<span class="btn-spinner"></span> Mengirim...';
    kirimBtn.disabled = true;
  }

  const URL_JAWABAN = `https://perpustakaan-digital-5e62a-default-rtdb.asia-southeast1.firebasedatabase.app/answers/${code}/${nama}.json`;

  fetch(URL_JAWABAN, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nama, jawaban: isiJawaban, waktu: new Date().toLocaleTimeString() })
  }).then(res => {
    if (res.ok) {
      showToast("Jawaban terkirim! ✅");
      const input = document.getElementById("jawabanMuridText");
      if (input) input.disabled = true;
      if (kirimBtn) {
        kirimBtn.innerHTML = "✅ Terkirim";
        kirimBtn.disabled = true;
        kirimBtn.style.background = "#10b981";
      }
    } else {
      showToast("❌ Gagal kirim. Coba lagi.");
      if (kirimBtn) { kirimBtn.innerHTML = originalText; kirimBtn.disabled = false; }
    }
  }).catch(() => {
    showToast("❌ Tidak ada koneksi.");
    if (kirimBtn) { kirimBtn.innerHTML = originalText; kirimBtn.disabled = false; }
  });
}

function handleSesiBerakhir() {
  if (syncInterval) { clearInterval(syncInterval); syncInterval = null; }
  lastStatus = "";

  document.getElementById("currentStatus").innerText = "✅ SESI TELAH BERAKHIR";
  document.getElementById("classContent").innerHTML = `
    <div style="padding:40px; text-align:center;">
      <p style="font-size:32px; margin-bottom:12px;">🎓</p>
      <p style="margin-bottom:20px; color:var(--text-soft);">Guru telah mengakhiri sesi ini.</p>
      <button onclick="location.reload()" class="btn-main" style="max-width:200px; margin:0 auto;">Keluar Kelas</button>
    </div>`;
  document.getElementById("resetMuridArea").classList.remove("hidden");
  showToast("Sesi belajar telah selesai! 👋");
}

function showInputKodeKelas() {
  document.getElementById("joinArea").classList.remove("hidden");
  document.getElementById("liveClassArea").classList.add("hidden");
  document.getElementById("inputClassCode").value = "";
  lastStatus = "";
}

function resetTampilanMurid() {
  document.getElementById("resetMuridArea").classList.add("hidden");
  if (syncInterval) { clearInterval(syncInterval); syncInterval = null; }
  showInputKodeKelas();
  showToast("Silakan masuk ke kelas baru.");
}


// =============================================
//  QR CODE
// =============================================
function generateQR(code) {
  const el = document.getElementById("qrcode");
  el.innerHTML = "";
  new QRCode(el, { text: code, width: 128, height: 128 });
}

let html5QrScanner = null;

function startScan() {
  if (html5QrScanner) return;

  const reader = document.getElementById("reader");
  reader.classList.remove("hidden");

  if (!document.getElementById("btnStopScan")) {
    const stopBtn = document.createElement("button");
    stopBtn.id = "btnStopScan";
    stopBtn.innerHTML = "❌ Batalkan Scan";
    stopBtn.className = "btn-main";
    stopBtn.style.cssText = "margin-top: 10px; background: #ef4444;";
    stopBtn.onclick = stopScan;
    reader.parentNode.insertBefore(stopBtn, reader.nextSibling);
  }

  html5QrScanner = new Html5Qrcode("reader");
  html5QrScanner.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: { width: 250, height: 250 } },
    (decodedText) => {
      document.getElementById("inputClassCode").value = decodedText;
      stopScan();
      joinClass();
    }
  ).catch(err => {
    showToast("Gagal buka kamera: " + err);
    stopScan();
  });
}

function stopScan() {
  if (html5QrScanner) {
    html5QrScanner.stop().then(() => {
      html5QrScanner = null;
      document.getElementById("reader").classList.add("hidden");
      const btn = document.getElementById("btnStopScan");
      if (btn) btn.remove();
    }).catch(() => {
      html5QrScanner = null;
    });
  }
}

// =============================================
//  TEMA
// =============================================
function toggleTheme() {
  const current = document.body.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.body.setAttribute('data-theme', next);
  localStorage.setItem("theme", next);
}

function applySavedTheme() {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme) document.body.setAttribute('data-theme', savedTheme);
}


// =============================================
//  TOAST
// =============================================
function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.innerText = msg;
  toast.style.display = "block";
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.style.display = "none"; }, 2500);
}


// =============================================
//  DEVELOPER MODE
// =============================================
function toggleDevMenu() {
  document.getElementById("devMenu").classList.toggle("hidden");
}

function quickSwitch(newRole) {
  localStorage.setItem("user_role", newRole);
  localStorage.setItem("user_name", "Dev-" + newRole);
  initApp();
  showSection('kelas');
  toggleDevMenu();
  showToast(`Switched ke role: ${newRole} 🛠️`);
}

function toggleFullScreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    if (document.exitFullscreen) document.exitFullscreen();
  }
}


// =============================================
//  EVENT LISTENERS & INIT
// =============================================
document.addEventListener("DOMContentLoaded", () => {
  applySavedTheme();
  const mc = new Hammer(document.body);
  mc.get('swipe').set({ direction: Hammer.DIRECTION_HORIZONTAL });

  mc.on("swipeleft", (e) => {
    if (e.target.closest('.category-container')) return; // guard scroll horizontal
    if (localStorage.getItem("user_role") && navigator.onLine) {
      showSection('kelas');
    }
  });

  mc.on("swiperight", (e) => {
    if (e.target.closest('.category-container')) return; // guard scroll horizontal
    if (localStorage.getItem("user_role")) {
      showSection('books');
    }
  });

  // Enter key di login
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
});

window.addEventListener('online', updateOnlineStatus);
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
