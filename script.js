const FIREBASE_URL = "https://perpustakaan-digital-5e62a-default-rtdb.asia-southeast1.firebasedatabase.app/class_sync.json";
    const ACCESS_KEYS = { "AKUGURU": "Guru", "MURID": "Murid" };

    const books = [
      { title: "Matematika", file: "matematika.pdf", emoji: "📐", color: "#3b82f6", category: "Pelajaran" },
      { title: "Sejarah", file: "sejarah.pdf", emoji: "📜", color: "#f59e0b", category: "Pelajaran" },
      { title: "Biologi", file: "biologi.pdf", emoji: "🧬", color: "#10b981", category: "Pelajaran" },
      {title: "Bahasa Jepang", file: "jp.pdf", emoji: "🗾", color: "#ef4444", category: "Pelajaran" },
      {title: "Fisika", file: "fisika.pdf", emoji: "🔬", color: "#6366f1", category: "Pelajaran" },
      {title: "Kimia", file: "kimia.pdf", emoji: "⚗️", color: "#f97316", category: "Pelajaran" },
      { title: "One Piece", file: "op.pdf", emoji: "🏴‍☠️", color: "#ef4444", category: "Komik" },
      { title: "Solo Leveling", file: "sl.pdf", emoji: "⚔️", color: "#6366f1", category: "Komik" },
      { title: "Laskar Pelangi", file: "lp.pdf", emoji: "🌈", color: "#10b981", category: "Novel" },
      { title: "Harry Potter", file: "hp.pdf", emoji: "⚡", color: "#475569", category: "Novel" },
      { title: "laut bercerita", file: "laut.pdf", emoji: "🌊", color: "#3b82f6", category: "Novel" },
      {title: "Dilan 1990", file: "dilan.pdf", emoji: "🏍️", color: "#f59e0b", category: "Novel" },
      {title: "detective conan", file: "conan.pdf", emoji: "🕵️‍♂️", color: "#10b981", category: "Komik" },
      {title: "Kubo wont let me be invisible", file: "kubo.pdf", emoji: "👻", color: "#ef4444", category: "Novel" },
      {title: "Stop Overthinking", file: "stop.pdf", emoji: "🧠", color: "#6366f1", category: "Novel" },
    ];

    let currentCategory = "Semua";
    let syncInterval;

    function handleLogin() {
      const userVal = document.getElementById("usernameInput").value.trim();
      const passVal = document.getElementById("passcodeInput").value.trim().toUpperCase();
      
      if (ACCESS_KEYS[passVal]) {
        localStorage.setItem("user_role", ACCESS_KEYS[passVal]);
        localStorage.setItem("user_name", userVal || "User");
        initApp();
      } else {
        alert("Kode akses salah atau tidak terdaftar!");
      }
    }
        function updateOnlineStatus() {
    const statusDiv = document.getElementById("connectionStatus");
    const isOnline = navigator.onLine;

    if (isOnline) {
        statusDiv.innerText = "🌐 ONLINE: FITUR KELAS AKTIF";
        statusDiv.style.background = "rgba(16, 185, 129, 0.1)"; // Hijau transparan
        statusDiv.style.color = "#10b981";
        
        // Aktifkan kembali tombol-tombol kelas
        if(document.getElementById("nav-kelas")) {
            document.getElementById("nav-kelas").style.opacity = "1";
            document.getElementById("nav-kelas").style.pointerEvents = "auto";
        }
    } else {
        statusDiv.innerText = "📡 OFFLINE: MODE BACA SAJA";
        statusDiv.style.background = "rgba(239, 68, 68, 0.1)"; // Merah transparan
        statusDiv.style.color = "#ef4444";
        
        // Beri tahu user kalau fitur kelas tidak bisa diakses
        showToast("Koneksi hilang. Fitur Kelas dinonaktifkan.");
        
        // Opsional: Matikan akses ke menu kelas agar tidak error
        if(document.getElementById("nav-kelas")) {
            document.getElementById("nav-kelas").style.opacity = "0.5";
            document.getElementById("nav-kelas").style.pointerEvents = "none";
            showSection('books'); // Paksa pindah ke koleksi buku
        }
    }
}

// Jalankan saat aplikasi pertama kali dibuka
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
updateOnlineStatus();

    function initApp() {
      const role = localStorage.getItem("user_role");
      if(!role) return;

      document.getElementById("loginPage").classList.add("hidden");
      document.getElementById("mainPage").classList.remove("hidden");
      document.getElementById("roleBadge").innerText = role + " Online";
      document.getElementById("welcomeText").innerText = `Halo, ${localStorage.getItem("user_name")}! 👋`;
      renderBooks("");
    }

    / --- PERBAIKAN FUNGSI RENDER (Tambah Animasi Stagger) --- /
  function renderBooks(kw) {
    const list = document.getElementById("bookList");
    const keyword = kw.toLowerCase();

    const filtered = books.filter(b => 
        b.title.toLowerCase().includes(keyword) || 
        b.category.toLowerCase().includes(keyword)
    );

    document.getElementById("bookCounter").innerText = `${filtered.length} materi ditemukan`;
    
    list.innerHTML = filtered.map((b, index) => `
        <div class="book-card animate" 
             style="animation-delay: ${index * 0.05}s" 
             onclick="openBookDetails('${b.title}', '${b.file}', '${b.emoji}', '${b.color}')">
            <div class="book-cover" style="background: ${b.color}15; color: ${b.color};">
                ${b.emoji}
            </div>
            <div style="font-weight: 800; font-size: 15px; color: var(--text-main);">${b.title}</div>
            <div style="font-size: 10px; color: var(--accent); font-weight: 700; margin-top: 5px; opacity: 0.8;">
                ${b.category.toUpperCase()}
            </div>
        </div>
    `).join('');
}
    function setCategory(cat) {
      currentCategory = cat;
      document.querySelectorAll('.cat-btn').forEach(btn => btn.classList.toggle('active-cat', btn.innerText.includes(cat)));
      renderBooks(document.getElementById("searchInput").value);
    }

   function showSection(type) {
  // Sembunyikan/Tampilkan daftar buku dan bagian kelas
  document.getElementById("bookList").classList.toggle("hidden", type !== 'books');
  document.getElementById("kelasSection").classList.toggle("hidden", type !== 'kelas');
  
  // Fitur Baru: Sembunyikan kategori & search bar jika masuk ke menu 'kelas' (Sync)
  const isBooks = type === 'books';
  document.querySelector(".category-container").classList.toggle("hidden", !isBooks);
  document.getElementById("searchInput").classList.toggle("hidden", !isBooks);
  document.getElementById("bookCounter").classList.toggle("hidden", !isBooks);

  // Update status aktif pada navbar
  document.getElementById("nav-books").classList.toggle("active", type === 'books');
  document.getElementById("nav-kelas").classList.toggle("active", type === 'kelas');
  
  if(type === 'kelas') setupKelasUI();
}

    function setupKelasUI() {
      const isGuru = localStorage.getItem("user_role") === "Guru";
      document.getElementById("guruView").classList.toggle("hidden", !isGuru);
      document.getElementById("muridView").classList.toggle("hidden", isGuru);
    }

    function updateClassStatus(tipe, file = null) {
      let code = document.getElementById("activeCode").innerText;
      if (code === "-----" || tipe === 'Selesai') {
        code = (tipe === 'Selesai') ? "-----" : Math.random().toString(36).substring(2, 7).toUpperCase();
      }

      fetch(FIREBASE_URL, { 
        method: 'PUT', 
        body: JSON.stringify({ code, status: tipe, file }) 
      }).then(() => {
        document.getElementById("activeCode").innerText = code;
      });
    }

    function mulaiPresentasi() {
      updateClassStatus("Presentasi", document.getElementById("pilihBuku").value);
    }

    function joinClass() {
      const input = document.getElementById("inputClassCode").value.toUpperCase();
      fetch(FIREBASE_URL).then(res => res.json()).then(data => {
        if (input === data.code) {
          document.getElementById("joinArea").classList.add("hidden");
          document.getElementById("liveClassArea").classList.remove("hidden");
          syncInterval = setInterval(syncWithGuru, 3000);
        } else { alert("Kode tidak valid!"); }
      });
    }

    function syncWithGuru() {
      fetch(FIREBASE_URL).then(res => res.json()).then(data => {
        document.getElementById("currentStatus").innerText = "STATUS: " + data.status;
        const container = document.getElementById("classContent");
        if(data.status === "Presentasi") {
          container.innerHTML = `<iframe src="books/${data.file}" width="100%" height="400px" style="border:none; border-radius:12px;"></iframe>`;
        } else if(data.status === "Selesai") {
    container.innerHTML = `
        <div style="text-align:center; padding:20px;">
            <h3 style="color:#ef4444;">Sesi Telah Berakhir</h3>
            <p>Terima kasih telah mengikuti kelas ini.</p>
        </div>`;
    
    // MUNCULKAN TOMBOL RESET
    document.getElementById("resetMuridArea").classList.remove("hidden");
    
    clearInterval(syncInterval);
}
      });
    }

    // Fungsi untuk ganti tampilan input kuis di Guru
function toggleQuizInput() {
    const tipe = document.getElementById("tipeQuiz").value;
    document.getElementById("inputManual").classList.toggle("hidden", tipe !== 'manual');
    document.getElementById("inputPdf").classList.toggle("hidden", tipe !== 'pdf');
}

// Fungsi Guru mengirim kuis
function mulaiQuiz() {
    const tipe = document.getElementById("tipeQuiz").value;
    let kontenKuis = "";
    
    if(tipe === 'manual') {
        kontenKuis = document.getElementById("quizText").value;
        if(!kontenKuis) return alert("Isi soal kuis dulu!");
    } else {
        kontenKuis = document.getElementById("pilihPdfQuiz").value;
    }

    updateClassStatus("Quiz", kontenKuis);
    alert("Kuis berhasil dikirim ke murid!");
}

// Update fungsi syncWithGuru (POV Murid) agar bisa menampilkan teks atau PDF
function syncWithGuru() {
    fetch(FIREBASE_URL).then(res => res.json()).then(data => {
        document.getElementById("currentStatus").innerText = "STATUS: " + data.status;
        const container = document.getElementById("classContent");
        const studentName = localStorage.getItem("user_name");
        const classCode = data.code; // Mengambil kode kelas yang aktif
        
        if(data.status === "Presentasi") {
            container.innerHTML = `<iframe src="books/${data.file}" width="100%" height="400px" style="border:none; border-radius:12px;"></iframe>`;
        } 
        else if(data.status === "Quiz") {
            // Cek apakah konten kuis berupa PDF atau Teks Manual
            if(data.file.endsWith('.pdf')) {
                container.innerHTML = `
                    <div style="width:100%; text-align:left;">
                        <p style="font-weight:bold; margin-bottom:10px;">📝 Kerjakan Soal PDF Berikut:</p>
                        <iframe src="books/${data.file}" width="100%" height="400px" style="border:none; border-radius:12px;"></iframe>
                    </div>`;
            } else {
              container.innerHTML = `
            <div style="padding:20px; background:white; border-radius:15px; width:100%; text-align:left; box-shadow:var(--shadow-sm);">
            <p style="font-weight:800; color:var(--accent); margin-bottom:10px;">📝 SOAL KUIS:</p>
            <p style="font-size:16px; white-space: pre-wrap;">${data.file}</p>
            <hr style="margin:15px 0; opacity:0.1;">
            <textarea id="jawabanMuridText" placeholder="Tulis jawabanmu di sini..." style="width:100%; height:100px; border-radius:10px; padding:10px; border:1px solid #ddd;"></textarea>
            <button class="btn-main" style="margin-top:10px; background:var(--accent);" 
                onclick="kirimJawabanKeGuru('${classCode}', '${studentName}')">Kirim Jawaban</button>
        </div>`;
            }
        } 
        else if(data.status === "Selesai") {
    container.innerHTML = `
        <div style="text-align:center; padding:20px;">
            <h3 style="color:#ef4444;">Sesi Telah Berakhir</h3>
            <p>Terima kasih telah mengikuti kelas ini.</p>
        </div>`;
    
    // Munculin tombol masuk ulang
    document.getElementById("resetMuridArea").classList.remove("hidden");
    
    // Stop sync
    clearInterval(syncInterval);
}
    });
}
function kirimJawabanKeGuru(code, nama) {
    const isiJawaban = document.getElementById("jawabanMuridText").value;
    if(!isiJawaban) return showToast("Isi jawaban dulu!");

    const URL_JAWABAN = `https://perpustakaan-digital-5e62a-default-rtdb.asia-southeast1.firebasedatabase.app/answers/${code}/${nama}.json`;

    fetch(URL_JAWABAN, {
        method: 'PUT',
        body: JSON.stringify({
            nama: nama,
            jawaban: isiJawaban,
            waktu: new Date().toLocaleTimeString()
        })
    }).then(() => {
        showToast("Jawaban berhasil terkirim!");
    });
}

    function toggleTheme() {
  const body = document.body;
  const current = body.getAttribute('data-theme');
  const newTheme = current === 'dark' ? 'light' : 'dark';
  
  body.setAttribute('data-theme', newTheme);
  
  // Opsional: Simpan pilihan tema di localStorage agar saat di-refresh tidak balik lagi
  localStorage.setItem("theme", newTheme);
}

// Tambahkan ini di dalam fungsi initApp agar tema yang dipilih tersimpan otomatis
function applySavedTheme() {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme) {
    document.body.setAttribute('data-theme', savedTheme);
  }
}

function showToast(message) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerText = message;
    document.body.appendChild(toast);
    
    toast.style.display = "block";
    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 500);
    }, 2000);
}
// Ganti fungsi alert bawaan dengan Toast yang lebih cantik
function showToast(msg) {
    const toast = document.getElementById("toast");
    toast.innerText = msg;
    toast.style.display = "block";
    setTimeout(() => { toast.style.display = "none"; }, 2500);
}
function resetTampilanMurid() {
    // Sembunyikan tombol reset
    document.getElementById("resetMuridArea").classList.add("hidden");
    
    // Hentikan sinkronisasi biar gak nyangkut
    clearInterval(syncInterval);
    
    // Balikin ke tampilan input kode
    showInputKodeKelas();
    
    showToast("Silakan masuk ke kelas baru.");
}
// Fungsi untuk menampilkan Detail Buku (Bottom Sheet)
function openBookDetails(title, file, emoji, color) {
    // Isi konten sheet
    document.getElementById("sheetTitle").innerText = title;
    document.getElementById("sheetEmoji").innerText = emoji;
    document.getElementById("sheetCategory").innerText = "Koleksi " + (books.find(b => b.title === title).category);
    
    // Set tombol baca
    document.getElementById("btnReadNow").onclick = () => {
    closeSheet();
    // Simpan progress lanjut membaca
    localStorage.setItem("last_read", JSON.stringify({title, file, emoji, color}));
    window.open(`books/${file}`, '_blank');
};

    // Munculkan sheet
    document.getElementById("sheetOverlay").classList.add("active");
    document.getElementById("bottomSheet").classList.add("active");
}

function closeSheet() {
    document.getElementById("sheetOverlay").classList.remove("active");
    document.getElementById("bottomSheet").classList.remove("active");
}

// Update fungsi renderBooks agar memanggil detail, bukan langsung buka file

    document.getElementById("bookCounter").innerText = `${filtered.length} buku tersedia`;
    list.innerHTML = filtered.map(b => `
        <div class="book-card animate" onclick="openBookDetails('${b.title}', '${b.file}', '${b.emoji}', '${b.color}')">
            <div class="book-cover" style="background: ${b.color}12; color: ${b.color};">${b.emoji}</div>
            <div style="font-weight: 700; font-size: 14px;">${b.title}</div>
            <div style="font-size: 10px; color: var(--text-soft); text-transform: uppercase; margin-top: 4px;">${b.category}</div>
        </div>
    `).join('');


// Contoh penggunaan showToast pada login
function handleLogin() {
    const userVal = document.getElementById("usernameInput").value.trim();
    // Gunakan toLowerCase agar tidak sensitif huruf besar/kecil
    const passVal = document.getElementById("passcodeInput").value.trim().toLowerCase();
    
    if (passVal === "developer") {
        // Simpan status sebagai Developer
        localStorage.setItem("user_role", "Developer");
        localStorage.setItem("user_name", userVal || "Admin Dev");
        
        // Sembunyikan login, tampilkan mainpage dulu
        document.getElementById("loginPage").classList.add("hidden");
        document.getElementById("mainPage").classList.remove("hidden");
        
        // Baru jalankan fungsi sandbox
        initApp(); // Inisialisasi data dasar
        initDeveloperMode(); 
        showToast("Mode Developer Aktif! 🛠️");
    } 
    else if (ACCESS_KEYS[passVal.toUpperCase()]) {
        // Login murid/guru biasa
        localStorage.setItem("user_role", ACCESS_KEYS[passVal.toUpperCase()]);
        localStorage.setItem("user_name", userVal || "User");
        initApp();
        showToast("Selamat datang!");
    } 
    else {
        showToast("Kode akses salah!");
    }
}

// Fungsi "Satpam" File
async function amanBukaBuku(fileName) {
    try {
        // Melakukan fetch ringan untuk cek status file
        const response = await fetch(`books/${fileName}`, { method: 'HEAD' });
        document.getElementById("btnReadNow").onclick = () => {
    closeSheet();
    localStorage.setItem("last_read", JSON.stringify({title, file, emoji, color}));
    // Memanggil fungsi pengecekan file
    amanBukaBuku(file); 
};
        
        if (response.ok) {
            // Jika file ditemukan, jalankan fungsi buka buku yang sudah ada
            window.open(`books/${fileName}`, '_blank');
        } else {
            // Jika file tidak ada (Error 404)
            showToast("⚠️ File belum diunduh atau tidak ditemukan.");
        }
    } catch (err) {
        // Jika offline total atau ada masalah sistem
        showToast("❌ Gagal memuat file secara offline.");
    }
}
function showInputKodeKelas() {
    // Tampilkan kembali form input kode
    document.getElementById("joinArea").classList.remove("hidden");
    
    // Sembunyikan area kelas aktif
    document.getElementById("liveClassArea").classList.add("hidden");
    
    // Kosongkan input kode
    document.getElementById("inputClassCode").value = "";
}

function initDeveloperMode() {
    const sandbox = document.getElementById("devSandbox");
    
    // Pastikan sandbox tampil
    sandbox.classList.remove("hidden");
    
    // Ambil isi dari view asli
    const guruContent = document.getElementById("guruView").innerHTML;
    const muridContent = document.getElementById("muridView").innerHTML;
    
    // Masukkan ke simulasi dan PAKSA hapus class 'hidden' pada anak elemennya
    const simGuru = document.getElementById("simulasiGuru");
    const simMurid = document.getElementById("simulasiMurid");
    
    simGuru.innerHTML = guruContent;
    simMurid.innerHTML = muridContent;
    
    // Cari elemen di dalam simulasi yang mungkin masih punya class 'hidden'
    simGuru.querySelectorAll('.hidden').forEach(el => el.classList.remove('hidden'));
    simMurid.querySelectorAll('.hidden').forEach(el => el.classList.remove('hidden'));
    
    // Sembunyikan elemen utama agar tidak berantakan di layar HP
    document.getElementById("bookList").style.display = "none";
    document.getElementById("continueReading").style.display = "none";
    
    console.log("Sandbox Berhasil Dimuat");
}

function pantauJawaban() {
    const codeElement = document.getElementById("activeCode");
    if(!codeElement) return;
    
    const code = codeElement.innerText;
    if(code === "-----") return;

    const URL_AMBIL_JAWABAN = `https://perpustakaan-digital-5e62a-default-rtdb.asia-southeast1.firebasedatabase.app/answers/${code}.json`;

    fetch(URL_AMBIL_JAWABAN)
    .then(res => res.json())
    .then(data => {
        const container = document.getElementById("listJawabanMurid");
        const isScrolledToBottom = container.scrollHeight - container.clientHeight <= container.scrollTop + 1;
        if(!data) {
            container.innerHTML = `<p style="font-size: 12px; color: var(--text-soft);">Belum ada jawaban masuk...</p>`;
            return;
        }

        // Mengubah objek Firebase menjadi Array agar bisa di-render
        const daftarJawaban = Object.keys(data).map(key => data[key]);

        container.innerHTML = daftarJawaban.map(item => `
            <div style="background: var(--input-bg); padding: 12px; border-radius: 12px; margin-bottom: 8px; border-left: 4px solid var(--accent); animation: fadeInUp 0.3s ease;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <b style="font-size: 13px; color: var(--text-main);">${item.nama}</b>
                    <span style="font-size: 10px; color: var(--text-soft);">${item.waktu || ''}</span>
                </div>
                <p style="font-size: 14px; margin-top: 6px; color: var(--text-main); line-height: 1.4;">${item.jawaban}</p>
            </div>
        `).join('');
    })
    .catch(err => console.error("Gagal mengambil jawaban:", err));
}

function setupKelasUI() {
    const isGuru = localStorage.getItem("user_role") === "Guru";
    document.getElementById("guruView").classList.toggle("hidden", !isGuru);
    document.getElementById("muridView").classList.toggle("hidden", isGuru);

    // TAMBAHKAN INI: Jika login sebagai guru, cek jawaban otomatis setiap 3 detik
    if(isGuru) {
        // Hapus interval lama jika ada (mencegah penumpukan)
        if(window.pantuanInterval) clearInterval(window.pantuanInterval);
        
        window.pantuanInterval = setInterval(pantauJawaban, 3000);
    }
}
// Panggil fungsi applySavedTheme di window.onload
window.onload = () => {
  applySavedTheme();
  initApp();
};

    function logout() {
      if(confirm("Keluar?")) { localStorage.clear(); location.reload(); }
    }
