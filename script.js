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
      
      if (passVal === "DEVELOPER") {
        localStorage.setItem("user_role", "Developer");
        localStorage.setItem("user_name", userVal || "Admin Dev");
        initApp();
        initDeveloperMode();
        showToast("Mode Developer Aktif! 🛠️");
    } else if (ACCESS_KEYS[passVal]) {
        localStorage.setItem("user_role", ACCESS_KEYS[passVal]);
        localStorage.setItem("user_name", userVal || "User");
        initApp();
        showToast("Selamat datang!");
    } else {
        showToast("Kode akses salah!");
    }
}
       function updateOnlineStatus() {
    const statusDiv = document.getElementById("connectionStatus");
    const isOnline = navigator.onLine;
    statusDiv.innerText = isOnline ? "🌐 ONLINE: FITUR KELAS AKTIF" : "📡 OFFLINE: MODE BACA";
    statusDiv.style.color = isOnline ? "#10b981" : "#ef4444";
}

// Jalankan saat aplikasi pertama kali dibuka
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
updateOnlineStatus();

   function initApp() {
    const role = localStorage.getItem("user_role");
    
    // Jika tidak ada role (belum login), pastikan mainPage tersembunyi
    if (!role) {
        document.getElementById("mainPage").classList.add("hidden");
        document.getElementById("loginPage").classList.remove("hidden");
        return;
    }

    // Jika sudah login
    document.getElementById("loginPage").classList.add("hidden");
    document.getElementById("mainPage").classList.remove("hidden"); // Nav bar ikut muncul karena di dalam sini
    
    document.getElementById("roleBadge").innerText = role.toUpperCase();
    document.getElementById("welcomeText").innerText = `Halo, ${localStorage.getItem("user_name")}! 👋`;
    
    renderBooks("");
    updateOnlineStatus();
}

    / SISTEM BUKU LAH INTINYA /
  function renderBooks(kw) {
    const list = document.getElementById("bookList");
    const keyword = kw.toLowerCase();

    const filtered = books.filter(b => 
        b.title.toLowerCase().includes(keyword) || 
        b.category.toLowerCase().includes(keyword)
    );

    document.getElementById("bookCounter").innerText = `${filtered.length} materi ditemukan`;
    
    list.innerHTML = filtered.map((b, index) => `
        <div class="book-card animate" style="animation-delay: ${index * 0.05}s" 
             onclick="openBookDetails('${b.title}', '${b.file}', '${b.emoji}', '${b.color}')">
            <div class="book-cover" style="background: ${b.color}15; color: ${b.color};">${b.emoji}</div>
            <div style="font-weight: 800; font-size: 15px; color: var(--text-main);">${b.title}</div>
            <div style="font-size: 10px; color: var(--accent); font-weight: 700; margin-top: 5px; opacity: 0.8;">
                ${b.category.toUpperCase()}
            </div>
            </div>
        </div>
    `).join('');
}
    function setCategory(cat) {
     currentCategory = cat;
    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.classList.toggle('active-cat', btn.innerText.includes(cat));
    });
    renderBooks(document.getElementById("searchInput").value);
}

 function showSection(type) {
    const isBooks = type === 'books';
    
    // Sembunyikan/Tampilkan Section Utama
    document.getElementById("bookSection").classList.toggle("hidden", !isBooks);
    document.getElementById("kelasSection").classList.toggle("hidden", isBooks);
    
    // Sembunyikan/Tampilkan Header Search (Area Pencarian)
    document.getElementById("searchArea").classList.toggle("hidden", !isBooks);

    // Update State Navigasi
    document.getElementById("nav-books").classList.toggle("active", isBooks);
    document.getElementById("nav-kelas").classList.toggle("active", type === 'kelas');
    
    if(type === 'kelas') setupKelasUI();
}

// POV Guru: Tampilkan UI khusus guru dan mulai pantau jawaban otomatis
   function setupKelasUI() {
    const role = localStorage.getItem("user_role");
    const isGuru = role === "Guru" || role === "Developer";
    const isMurid = role === "Murid" || role === "Developer";

    document.getElementById("guruView").classList.toggle("hidden", !isGuru);
    document.getElementById("muridView").classList.toggle("hidden", !isMurid);

    if (isGuru) {
        if(window.pantuanInterval) clearInterval(window.pantuanInterval);
        window.pantuanInterval = setInterval(pantauJawaban, 3000);
        
        // Generate random class code if empty
        if(document.getElementById("activeCode").innerText === "-----") {
            document.getElementById("activeCode").innerText = Math.random().toString(36).substring(2, 7).toUpperCase();
        }
    }
}
function updateClassStatus(status, content = "") {
    const codeElement = document.getElementById("activeCode");
    let currentCode = codeElement.innerText.trim();

    // 1. Logika Auto-Generate Kode jika masih kosong
    if ((status === "Presentasi" || status === "Kuis") && (currentCode === "-----" || currentCode === "")) {
        currentCode = Math.random().toString(36).substring(2, 7).toUpperCase();
        codeElement.innerText = currentCode;
    }

    if (status === "Selesai") {
        fetch(FIREBASE_URL, {
            method: 'PUT',
            body: JSON.stringify({
                status: "Selesai",
                content: "",
                code: "-----", 
                file: ""
            })
        }).then(() => {
            codeElement.innerText = "-----";
            showToast("Sesi berhasil diakhiri! 👋");
            if(window.pantuanInterval) clearInterval(window.pantuanInterval);
            document.getElementById("listJawabanMurid").innerHTML = `<p style="font-size: 12px; color: var(--text-soft);">Sesi berakhir.</p>`;
        });
        return; // Berhenti di sini jika selesai
    }

    fetch(FIREBASE_URL, {
        method: 'PUT',
        body: JSON.stringify({
            status: status,
            content: (status === "Kuis") ? content : "", // Jika kuis, content adalah soal
            code: currentCode,
            file: (status === "Presentasi") ? content : "" // Jika presentasi, content adalah nama file
        })
    })
    .then(response => {
        if(response.ok) {
            showToast(`Mode ${status} Aktif!`);
        }
    })
    .catch(err => {
        console.error("Firebase Error:", err);
        showToast("Gagal menyambung ke server");
    });
}

function refreshKodeKelas() {
    const baru = Math.random().toString(36).substring(2, 7).toUpperCase();
    document.getElementById("activeCode").innerText = baru;
    showToast("Kode kelas diperbarui! 🔑");
}

 function mulaiPresentasiPDF() {
    const file = document.getElementById("selectFileBuku").value;
    // Panggil updateClassStatus, dia akan otomatis buat kode jika belum ada
    updateClassStatus("Presentasi", file);
}

    function joinClass() {
    const input = document.getElementById("inputClassCode").value.trim().toUpperCase();
    fetch(FIREBASE_URL).then(res => res.json()).then(data => {
        if (data && input === data.code) {
            document.getElementById("joinArea").classList.add("hidden");
            document.getElementById("liveClassArea").classList.remove("hidden");
            syncInterval = setInterval(syncWithGuru, 3000);
            showToast("Berhasil masuk kelas!");
        } else {
            showToast("Kode salah!");
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
    const soal = document.getElementById("quizText").value;
    if(!soal) return showToast("Ketik soalnya dulu!");
    updateClassStatus("Kuis", soal);
}

// Update fungsi syncWithGuru (POV Murid) agar bisa menampilkan teks atau PDF
function syncWithGuru() {
    fetch(FIREBASE_URL).then(res => res.json()).then(data => {
        if (!data) return;
        const container = document.getElementById("classContent");
        const statusText = document.getElementById("currentStatus");

        if (data.status === "Presentasi") {
            statusText.innerText = "GURU SEDANG PRESENTASI";
            container.innerHTML = `<iframe src="books/${data.file}" width="100%" height="400px" style="border:none; border-radius:15px;"></iframe>`;
        } else if (data.status === "Quiz") {
            statusText.innerText = "KUIS SEDANG BERLANGSUNG";
            container.innerHTML = `
                <div style="padding:20px; text-align:left;">
                    <p style="font-weight:700; margin-bottom:15px;">Soal: ${data.content}</p>
                    <textarea id="jawabanMuridText" placeholder="Ketik jawabanmu..." style="width:100%; height:100px; padding:10px; border-radius:10px;"></textarea>
                    <button class="btn-main" onclick="kirimJawabanKeGuru('${data.code}', '${localStorage.getItem("user_name")}')" style="margin-top:10px; width:100%;">Kirim Jawaban</button>
                </div>`;
        } else {
            statusText.innerText = "MENUNGGU GURU...";
            container.innerHTML = `<div style="padding:40px; text-align:center;">Sesi Belum Dimulai</div>`;
        }
    });
}

function kirimJawabanKeGuru(code, nama) {
    const isi = document.getElementById("jawabanMuridText").value;
    if(!isi) return showToast("Tulis jawaban dulu!");
    
    fetch(`https://perpustakaan-digital-5e62a-default-rtdb.asia-southeast1.firebasedatabase.app/answers/${code}/${nama}.json`, {
        method: 'PUT',
        body: JSON.stringify({ nama, jawaban: isi, waktu: new Date().toLocaleTimeString() })
    }).then(() => showToast("Terkirim!"));
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
    const current = document.body.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', next);
    localStorage.setItem("theme", next);
}

function applySavedTheme() {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme) {
    document.body.setAttribute('data-theme', savedTheme);
  }
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
    document.getElementById("sheetTitle").innerText = title;
    document.getElementById("sheetEmoji").innerText = emoji;
    document.getElementById("sheetCategory").innerText = "Materi Pelajaran";
    document.getElementById("btnReadNow").onclick = () => {
        closeSheet();
        localStorage.setItem("last_read", JSON.stringify({title, file, emoji, color}));
        window.open(`books/${file}`, '_blank');
    };
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
    const passVal = document.getElementById("passcodeInput").value.trim().toUpperCase();
    
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
    const code = document.getElementById("activeCode").innerText;
    if(code === "-----") return;

    fetch(`https://perpustakaan-digital-5e62a-default-rtdb.asia-southeast1.firebasedatabase.app/answers/${code}.json`)
    .then(res => res.json())
    .then(data => {
        const container = document.getElementById("listJawabanMurid");
        if(!data) {
            container.innerHTML = `<p style="font-size: 12px; opacity: 0.5;">Menunggu jawaban...</p>`;
            return;
        }
        const html = Object.keys(data).map(key => `
            <div class="answer-bubble animate" style="background:var(--input-bg); padding:10px; border-radius:12px; margin-bottom:8px;">
                <div style="font-size:11px; font-weight:800; color:var(--accent);">👤 ${data[key].nama}</div>
                <div style="font-size:13px; margin-top:4px;">${data[key].jawaban}</div>
            </div>
        `).join('');
        container.innerHTML = html;
    });
}

// Panggil fungsi applySavedTheme di window.onload
window.onload = () => {
    if (localStorage.getItem("theme")) document.body.setAttribute('data-theme', localStorage.getItem("theme"));
    initApp();
};

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

// Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(err => console.log(err));
}
  applySavedTheme();
  initApp();


    function logout() {
      if(confirm("Keluar?")) { localStorage.clear(); location.reload(); }
    }
    if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('Sistem Offline Aktif!', reg))
      .catch(err => console.error('Gagal sistem offline', err));
  });
}
