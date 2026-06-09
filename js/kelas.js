// =============================================
//  KELAS — Pustaka Digital
// =============================================

function setupKelasUI() {
  const role   = localStorage.getItem("user_role");
  const isGuru = role === "Guru" || role === "Developer";

  document.getElementById("guruView").classList.toggle("hidden", !isGuru);
  document.getElementById("muridView").classList.toggle("hidden", isGuru);

  if (isGuru) {
    populateSelectBuku();
    populateSelectQuizFile();

    // Reset interval agar tidak double
    if (window.pantuanInterval) clearInterval(window.pantuanInterval);
    window.pantuanInterval = setInterval(() => {
      pantauJawaban();
      pantauPresence();   // ← tambah pantau murid
    }, 3000);

    // Buat kode otomatis hanya jika belum ada
    const existingCode = document.getElementById("activeCode").innerText;
    if (!existingCode || existingCode === "-----") {
      const kode = generateKode();
      document.getElementById("activeCode").innerText = kode;
      generateQR(kode);
    }
  }
}

function populateSelectBuku() {
  const select = document.getElementById("selectFileBuku");
  if (!select) return;
  const pelajaran = books.filter(b => b.category === "Pelajaran");
  if (pelajaran.length === 0) {
    select.innerHTML = `<option value="">— Tidak ada buku pelajaran —</option>`;
    return;
  }
  select.innerHTML = pelajaran.map(b =>
    `<option value="${esc(b.file)}">${b.emoji} ${esc(b.title)}</option>`
  ).join('');
}

function populateSelectQuizFile() {
  const select = document.getElementById("selectQuizFile");
  if (!select) return;

  let soal = books.filter(b => b.category === "Latihan" || b.category === "Ujian");
  // agar guru tetap bisa kirim kuis berbasis PDF
  if (soal.length === 0) {
    soal = books.filter(b => b.category === "Pelajaran");
  }

  if (soal.length === 0) {
    select.innerHTML = `<option value="">— Belum ada buku tersedia —</option>`;
    return;
  }

  select.innerHTML = soal.map(b =>
    `<option value="${esc(b.file)}">${b.emoji} ${esc(b.title)}</option>`
  ).join('');
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
//  GURU — UPDATE STATUS KELAS
// =============================================
function updateClassStatus(status, content = "", onDone = null) {
  const codeElement = document.getElementById("activeCode");
  let currentCode   = codeElement ? codeElement.innerText.trim() : "";

  if ((status === "Presentasi" || status === "Kuis") && (!currentCode || currentCode === "-----")) {
    currentCode = generateKode();
    if (codeElement) codeElement.innerText = currentCode;
    generateQR(currentCode);
  }

  if (status === "Selesai") {
    fetchWithTimeout(FIREBASE_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: "Selesai", content: "", code: "-----", file: "" })
    })
    .then(() => {
      if (codeElement) codeElement.innerText = "-----";
      const qrEl = document.getElementById("qrcode");
      if (qrEl) qrEl.innerHTML = "";
      // Sembunyikan panel presentasi live
      const presPanel = document.getElementById("guruPresentasiPanel");
      if (presPanel) presPanel.classList.add("hidden");
      livePDFDoc = null; guruCurrentFile = null; guruCurrentPage = 1;
      showToast("Sesi berhasil diakhiri! 👋");
      if (window.pantuanInterval) clearInterval(window.pantuanInterval);
      const jawabanList = document.getElementById("listJawabanMurid");
      if (jawabanList) jawabanList.innerHTML = `<p style="font-size:12px; color:var(--text-soft); text-align:center; padding:10px;">Sesi berakhir.</p>`;
      // Reset indikator murid
      const indicator = document.getElementById("muridCountIndicator");
      if (indicator) indicator.innerHTML = `<span class="presence-badge">👥 0 murid terhubung</span>`;
      if (onDone) onDone();
    })
    .catch(() => { showToast("❌ Gagal menghubungi server."); if (onDone) onDone(); });
    return;
  }

  const payload = {
    status,
    content: status === "Kuis" ? content : "",
    code: currentCode,
    file: status === "Presentasi" ? content : ""
  };

  fetchWithTimeout(FIREBASE_URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  .then(res => {
    if (res.ok) showToast(`Mode ${status} aktif! 🚀`);
    else showToast("⚠️ Respons server tidak normal.");
    if (onDone) onDone();
  })
  .catch(() => { showToast("❌ Gagal menyambung ke server."); if (onDone) onDone(); });
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

let guruCurrentFile = null;
let guruCurrentPage = 1;
let livePDFDoc      = null;
let livePDFRendering = false;
let livePDFPending  = null;

function mulaiPresentasiPDF() {
  const select = document.getElementById("selectFileBuku");
  const file = select ? select.value : "";
  if (!file) return showToast("Pilih buku dulu!");
  const btn  = document.getElementById("btnMulaiPresentasi");
  const orig = setButtonLoading(btn, "Membagikan...");

  guruCurrentFile = file;
  guruCurrentPage = 1;

  updateClassStatus("Presentasi", file, () => {
    resetButton(btn, orig);
    _bukaGuruPDFPanel(file, 1);
  });
}

// =============================================
//  GURU — Panel kontrol presentasi live
// =============================================
function _bukaGuruPDFPanel(file, startPage) {
  const panel = document.getElementById("guruPresentasiPanel");
  if (!panel) return;
  panel.classList.remove("hidden");

  const title = (books.find(b => b.file === file) || {}).title || file;
  const titleEl = document.getElementById("guruPresentasiTitle");
  if (titleEl) titleEl.innerText = title;

  livePDFDoc      = null;
  guruCurrentFile = file;
  guruCurrentPage = startPage;
  _renderGuruPage(file, startPage);
}

function _renderGuruPage(file, page) {
  if (typeof pdfjsLib === 'undefined') return;
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  const canvas  = document.getElementById("guruLiveCanvas");
  const pageEl  = document.getElementById("guruPageNum");
  const countEl = document.getElementById("guruPageCount");
  const loading = document.getElementById("guruCanvasLoading");
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (loading) loading.style.display = "flex";

  const doRender = (doc) => {
    livePDFDoc = doc;
    if (countEl) countEl.textContent = doc.numPages;
    const safePage = Math.max(1, Math.min(page, doc.numPages));
    guruCurrentPage = safePage;
    if (pageEl) pageEl.textContent = safePage;

    doc.getPage(safePage).then(p => {
      const vp  = p.getViewport({ scale: 1.0 });
      canvas.width  = vp.width;
      canvas.height = vp.height;
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
      return p.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
    }).then(() => {
      if (loading) loading.style.display = "none";
    }).catch(() => { if (loading) loading.style.display = "none"; });
  };
  // blok ini hanya terpakai saat pindah halaman di buku yang sama
  if (livePDFDoc) {
    doRender(livePDFDoc);
  } else {
    pdfjsLib.getDocument(`books/${file}`).promise
      .then(doRender)
      .catch(() => { if (loading) loading.style.display = "none"; });
  }
}

function guruNextPage() {
  if (!livePDFDoc || guruCurrentPage >= livePDFDoc.numPages) return;
  guruCurrentPage++;
  _renderGuruPage(guruCurrentFile, guruCurrentPage);
  _broadcastPage(guruCurrentPage);
}

function guruPrevPage() {
  if (!livePDFDoc || guruCurrentPage <= 1) return;
  guruCurrentPage--;
  _renderGuruPage(guruCurrentFile, guruCurrentPage);
  _broadcastPage(guruCurrentPage);
}

function _broadcastPage(page) {
  const codeEl = document.getElementById("activeCode");
  const code   = codeEl ? codeEl.innerText.trim() : "";
  if (!code || code === "-----") return;
  // pakai PUT dengan payload lengkap agar halaman pasti tersimpan
  fetchWithTimeout(FIREBASE_URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status:  "Presentasi",
      content: "",
      code,
      file:    guruCurrentFile || "",
      page
    })
  }).catch(() => {});
}

function tutupGuruPresentasi() {
  const panel = document.getElementById("guruPresentasiPanel");
  if (panel) panel.classList.add("hidden");
  livePDFDoc      = null;
  guruCurrentPage = 1;
  guruCurrentFile = null;
  updateClassStatus("Selesai");
}

// =============================================
//  MURID — Live PDF viewer
// =============================================
let muridLivePDFDoc  = null;
let muridCurrentPage = 0; // 0 = belum init
let muridPendingPage = null;

function _bukaLivePDF(file, page) {
  const container = document.getElementById("classContent");
  if (!container) return;

  // Injeksi HTML live PDF viewer
  container.innerHTML = `
    <div id="livePDFViewer" style="display:flex; flex-direction:column; height:100%;">
      <div id="livePDFLoading" style="position:absolute; inset:0; background:var(--surface-2);
           display:flex; align-items:center; justify-content:center; flex-direction:column;
           gap:10px; z-index:5; border-radius:var(--r-lg);">
        <div class="loading-spinner"></div>
        <p style="font-size:12px; color:var(--text-2); font-weight:700;">Memuat buku...</p>
      </div>
      <div style="background:var(--surface-2); padding:8px 12px; border-radius:var(--r-lg) var(--r-lg) 0 0;
                  display:flex; align-items:center; gap:8px;">
        <span style="font-size:11px; font-weight:800; color:var(--green);">📺 LIVE</span>
        <span id="livePDFTitle" style="font-size:11px; color:var(--text-2); font-weight:600; flex:1;
              white-space:nowrap; overflow:hidden; text-overflow:ellipsis;"></span>
        <span id="livePDFPageInfo" style="font-size:11px; font-weight:800; color:var(--text-2); white-space:nowrap;"></span>
      </div>
      <div style="flex:1; overflow:auto; background:#c8d0c8; text-align:center; padding:10px;
                  border-radius:0 0 var(--r-lg) var(--r-lg); position:relative; min-height:280px;">
        <canvas id="muridLiveCanvas" style="max-width:100%; border-radius:8px; box-shadow:0 2px 12px rgba(0,0,0,0.15);"></canvas>
      </div>
    </div>`;

  container.style.position = "relative";

  const bookData = books.find(b => b.file === file);
  const titleEl  = document.getElementById("livePDFTitle");
  if (titleEl && bookData) titleEl.textContent = bookData.title;

  if (typeof pdfjsLib === 'undefined') return;
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  muridLivePDFDoc  = null;
  muridCurrentPage = 0;
  muridPendingPage = null; 

  pdfjsLib.getDocument(`books/${file}`).promise.then(doc => {
    muridLivePDFDoc = doc;
    const loading = document.getElementById("livePDFLoading");
    if (loading) loading.style.display = "none";
    // saat PDF masih loading
    const targetPage = muridPendingPage !== null ? muridPendingPage : page;
    muridPendingPage = null;
    _renderMuridPage(targetPage);
  }).catch(() => {
    const loading = document.getElementById("livePDFLoading");
    if (loading) loading.innerHTML = `<p style="color:var(--red); font-size:13px; font-weight:700;">❌ Gagal memuat buku</p>`;
  });
}

function _syncLivePage(page) {
  if (!muridLivePDFDoc) {
    muridPendingPage = page;
    return;
  }
  if (page === muridCurrentPage) return;
  _renderMuridPage(page);
}

function _renderMuridPage(page) {
  if (!muridLivePDFDoc) return;
  const safePage = Math.max(1, Math.min(page, muridLivePDFDoc.numPages));
  muridCurrentPage = safePage;

  const pageInfoEl = document.getElementById("livePDFPageInfo");
  if (pageInfoEl) pageInfoEl.textContent = `Hal. ${safePage} / ${muridLivePDFDoc.numPages}`;

  const canvas = document.getElementById("muridLiveCanvas");
  if (!canvas) return;


  canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

  muridLivePDFDoc.getPage(safePage).then(p => {
    const vp = p.getViewport({ scale: 1.0 });
    canvas.width  = vp.width;
    canvas.height = vp.height;
    return p.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
  }).catch(() => {});
}

function mulaiQuiz() {
  const soal = document.getElementById("quizText").value.trim();
  if (!soal) return showToast("Ketik soalnya dulu!");
  const btn  = document.getElementById("btnMulaiQuiz");
  const orig = setButtonLoading(btn, "Mengirim...");
  updateClassStatus("Kuis", soal, () => resetButton(btn, orig));
}

function mulaiQuizFile() {
  const select = document.getElementById("selectQuizFile");
  const file = select ? select.value : "";
  if (!file) return showToast("Pilih file kuis dulu!");
  const contentPayload = JSON.stringify({ tipe: "pdf", namaFile: file });
  const btn  = document.getElementById("btnMulaiQuizFile");
  const orig = setButtonLoading(btn, "Mengirim...");
  updateClassStatus("Kuis", contentPayload, () => resetButton(btn, orig));
}

function pantauJawaban() {
  const codeEl = document.getElementById("activeCode");
  const code   = codeEl ? codeEl.innerText.trim() : "";
  if (!code || code === "-----") return;

  fetch(`${FIREBASE_BASE}/answers/${code}.json`)
    .then(res => {
      if (!res.ok) throw new Error("Network error");
      return res.json();
    })
    .then(data => {
      const container = document.getElementById("listJawabanMurid");
      if (!container) return;

      if (!data || Object.keys(data).length === 0) {
        container.innerHTML = `<p style="font-size:12px; opacity:0.5; text-align:center; padding:10px;">Menunggu jawaban murid...</p>`;
        return;
      }

      container.innerHTML = Object.keys(data).map(key => `
        <div class="answer-bubble animate">
          <div class="answer-header">
            <span class="student-name">👤 ${esc(data[key].nama)}</span>
            <span style="color:var(--text-soft);">${esc(data[key].waktu || '')}</span>
          </div>
          <div style="font-size:13px; word-break:break-word;">${esc(data[key].jawaban)}</div>
        </div>
      `).join('');
    })
    .catch(() => { /* silent fail saat offline */ });
}

// =============================================
//  PRESENCE SYSTEM — Indikator murid terhubung
// =============================================
let presenceInterval  = null;
let currentClassCode  = null;
let currentMuridKey   = null;

// Murid daftarkan diri ke Firebase saat join
function registerPresence(code, nama) {
  const safeKey    = String(nama).replace(/[.#$/[\]\s]/g, '_');
  currentMuridKey  = `${safeKey}_${Date.now()}`;
  currentClassCode = code;

  const URL_PRESENCE = `${FIREBASE_BASE}/presence/${code}/${currentMuridKey}.json`;

  function sendHeartbeat() {
    if (!navigator.onLine) return;
    fetch(URL_PRESENCE, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nama: String(nama), aktif: Date.now() })
    }).catch(() => {});
  }

  // Kirim sekali langsung, lalu setiap 5 detik
  sendHeartbeat();
  if (presenceInterval) clearInterval(presenceInterval);
  presenceInterval = setInterval(sendHeartbeat, 5000);
}

// Hapus presence saat murid keluar kelas
function unregisterPresence() {
  if (presenceInterval) { clearInterval(presenceInterval); presenceInterval = null; }
  if (!currentClassCode || !currentMuridKey) return;

  fetch(`${FIREBASE_BASE}/presence/${currentClassCode}/${currentMuridKey}.json`, {
    method: 'DELETE'
  }).catch(() => {});

  currentClassCode = null;
  currentMuridKey  = null;
}

// Guru pantau berapa murid aktif (heartbeat < 15 detik)
function pantauPresence() {
  const codeEl = document.getElementById("activeCode");
  const code   = codeEl ? codeEl.innerText.trim() : "";
  if (!code || code === "-----") return;

  fetch(`${FIREBASE_BASE}/presence/${code}.json`)
    .then(res => res.json())
    .then(data => {
      const indicator = document.getElementById("muridCountIndicator");
      if (!indicator) return;

      if (!data) {
        indicator.innerHTML = `<span class="presence-badge">👥 0 murid terhubung</span>`;
        return;
      }

      // Hitung murid yang heartbeat-nya masih fresh (< 15 detik)
      const now    = Date.now();
      const aktif  = Object.values(data).filter(m => (now - m.aktif) < 15000);
      const jumlah = aktif.length;

      indicator.innerHTML = jumlah > 0
        ? `<span class="presence-badge active">🟢 ${jumlah} murid terhubung</span>`
        : `<span class="presence-badge">👥 0 murid terhubung</span>`;
    })
    .catch(() => {});
}

// =============================================
//  MURID — BERGABUNG KE KELAS
// =============================================
function joinClass() {
  const inputEl = document.getElementById("inputClassCode");
  const input   = inputEl ? inputEl.value.trim().toUpperCase() : "";
  if (!input) return showToast("Masukkan kode kelas dulu!");

  const btn          = document.querySelector("#joinArea .btn-main");
  const originalText = btn ? btn.innerHTML : null;
  if (btn) { btn.innerHTML = `<span class="btn-spinner"></span> Menyambungkan...`; btn.disabled = true; }

  fetchWithTimeout(FIREBASE_URL, {}, 8000)
    .then(res => res.json())
    .then(data => {
      if (btn) { btn.innerHTML = originalText; btn.disabled = false; }
      if (data && input === data.code) {
        lastSyncStatus = "";
        document.getElementById("joinArea").classList.add("hidden");
        document.getElementById("liveClassArea").classList.remove("hidden");

        // Daftarkan presence murid
        const nama = localStorage.getItem("user_name") || "Murid";
        registerPresence(input, nama);

        // Langsung sync sekali sebelum interval
        syncWithGuru();
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
    .then(res => {
      if (!res.ok) throw new Error("Network error");
      return res.json();
    })
    .then(data => {
      if (!data || data.status === "Selesai") {
        handleSesiBerakhir();
        return;
      }

      const container  = document.getElementById("classContent");
      const statusText = document.getElementById("currentStatus");
      if (!container || !statusText) return;

      // Toast hanya saat status berubah
      if (data.status !== lastStatus) {
        showToast(`Status: ${data.status}`);
        lastStatus = data.status;
      }

      if (data.status === "Presentasi") {
        statusText.innerText = "📺 GURU SEDANG PRESENTASI";
        const targetPage = data.page || 1;
        const newKey = data.status + (data.file || "");

        // Buka PDF reader live pertama kali atau ganti file
        if (newKey !== lastSyncStatus) {
          lastSyncStatus = newKey;
          _bukaLivePDF(data.file, targetPage);
        } else {
          // Sinkronisasi halaman jika guru pindah halaman
          _syncLivePage(targetPage);
        }

      } else if (data.status === "Kuis") {
        statusText.innerText = "📝 KUIS SEDANG BERLANGSUNG";

        let parsedContent = data.content;
        if (typeof data.content === 'string') {
          try { parsedContent = JSON.parse(data.content); } catch (e) { /* bukan JSON */ }
        }

        const isPdf      = parsedContent && typeof parsedContent === 'object' && parsedContent.tipe === "pdf";
        const contentKey = data.status + (isPdf ? parsedContent.namaFile : data.content);
        if (contentKey === lastSyncStatus) return;
        lastSyncStatus = contentKey;

        const userName = esc(localStorage.getItem("user_name") || "Murid");
        const safeCode = esc(data.code || "");

        if (isPdf) {
          container.innerHTML = `
            <div style="padding:16px;" class="animate">
              <p style="font-weight:700; margin-bottom:12px; color:var(--text);">📄 Kuis dari File PDF:</p>
              <iframe src="books/${esc(parsedContent.namaFile)}" width="100%" height="300px" style="border:none; border-radius:12px;"></iframe>
              <textarea id="jawabanMuridText" placeholder="Ketik jawabanmu di sini..." 
                style="width:100%; height:80px; margin-top:12px; padding:12px; border-radius:12px; 
                       border:1px solid var(--glass-border); font-family:inherit; 
                       background:var(--input-bg); color:var(--text); resize:none;"></textarea>
              <button id="btnKirimJawaban" class="btn-main" style="margin-top:10px; background:var(--accent);" 
                onclick="kirimJawabanKeGuru('${safeCode}', '${userName}')">Kirim Jawaban ✉️</button>
            </div>`;
        } else {
          container.innerHTML = `
            <div style="padding:20px; text-align:left;" class="animate">
              <p style="font-weight:700; margin-bottom:12px; color:var(--text);">❓ Soal: ${esc(data.content)}</p>
              <textarea id="jawabanMuridText" placeholder="Ketik jawabanmu..." 
                style="width:100%; height:100px; padding:12px; border-radius:12px; 
                       border:1px solid var(--glass-border); font-family:inherit; 
                       background:var(--input-bg); color:var(--text); resize:none;"></textarea>
              <button id="btnKirimJawaban" class="btn-main" style="margin-top:10px; background:var(--accent);" 
                onclick="kirimJawabanKeGuru('${safeCode}', '${userName}')">Kirim Jawaban ✉️</button>
            </div>`;
        }

      } else {
        if (lastSyncStatus !== "menunggu") {
          statusText.innerText = "⏳ MENUNGGU GURU...";
          container.innerHTML  = `<div style="padding:40px; text-align:center; color:var(--text-soft);">Sesi belum dimulai oleh guru.</div>`;
          lastSyncStatus = "menunggu";
        }
      }
    })
    .catch(() => { /* silent fail */ });
}

function kirimJawabanKeGuru(code, nama) {
  const isiJawaban = document.getElementById("jawabanMuridText")?.value?.trim();
  if (!isiJawaban) return showToast("Jawaban tidak boleh kosong!");

  const preview = isiJawaban.length > 80 ? isiJawaban.substring(0, 80) + "..." : isiJawaban;
  if (!confirm(`Kirim jawaban ini?\n\n"${preview}"`)) return;

  const kirimBtn     = document.getElementById("btnKirimJawaban");
  const originalText = kirimBtn ? kirimBtn.innerHTML : null;
  if (kirimBtn) {
    kirimBtn.innerHTML = '<span class="btn-spinner"></span> Mengirim...';
    kirimBtn.disabled  = true;
  }

  const safeKey   = String(nama).replace(/[.#$/[\]\s]/g, '_');
  const uniqueKey = `${safeKey}_${Date.now()}`;
  const URL_JAWABAN = `${FIREBASE_BASE}/answers/${code}/${uniqueKey}.json`;

  fetchWithTimeout(URL_JAWABAN, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nama:    String(nama),
      jawaban: isiJawaban,
      waktu:   new Date().toLocaleTimeString('id-ID')
    })
  })
  .then(res => {
    if (res.ok) {
      showToast("Jawaban terkirim! ✅");
      const input = document.getElementById("jawabanMuridText");
      if (input) input.disabled = true;
      if (kirimBtn) {
        kirimBtn.innerHTML = "✅ Terkirim";
        kirimBtn.disabled  = true;
        kirimBtn.style.background = "#10b981";
      }
    } else {
      showToast("❌ Gagal kirim. Coba lagi.");
      if (kirimBtn) { kirimBtn.innerHTML = originalText; kirimBtn.disabled = false; }
    }
  })
  .catch(() => {
    showToast("❌ Tidak ada koneksi.");
    if (kirimBtn) { kirimBtn.innerHTML = originalText; kirimBtn.disabled = false; }
  });
}

function handleSesiBerakhir() {
  if (syncInterval) { clearInterval(syncInterval); syncInterval = null; }
  lastStatus     = "";
  lastSyncStatus = "";
  muridLivePDFDoc  = null;
  muridCurrentPage = 0;
  muridPendingPage = null; 

  // Hapus presence murid saat sesi berakhir
  unregisterPresence();

  const statusEl  = document.getElementById("currentStatus");
  const contentEl = document.getElementById("classContent");
  const resetArea = document.getElementById("resetMuridArea");

  if (statusEl)  statusEl.innerText = "✅ SESI TELAH BERAKHIR";
  if (contentEl) contentEl.innerHTML = `
    <div style="padding:40px; text-align:center;">
      <p style="font-size:32px; margin-bottom:12px;">🎓</p>
      <p style="margin-bottom:20px; color:var(--text-soft);">Guru telah mengakhiri sesi ini.</p>
      <button onclick="resetTampilanMurid()" class="btn-main" style="max-width:200px; margin:0 auto;">Keluar Kelas</button>
    </div>`;
  if (resetArea) resetArea.classList.remove("hidden");
  showToast("Sesi belajar telah selesai! 👋");
}

function showInputKodeKelas() {
  document.getElementById("joinArea").classList.remove("hidden");
  document.getElementById("liveClassArea").classList.add("hidden");
  const inputEl = document.getElementById("inputClassCode");
  if (inputEl) inputEl.value = "";
  lastStatus     = "";
  lastSyncStatus = "";
}

function resetTampilanMurid() {
  document.getElementById("resetMuridArea").classList.add("hidden");
  if (syncInterval) { clearInterval(syncInterval); syncInterval = null; }

  // Hapus presence saat murid keluar manual
  unregisterPresence();

  showInputKodeKelas();
  showToast("Silakan masuk ke kelas baru.");
}
