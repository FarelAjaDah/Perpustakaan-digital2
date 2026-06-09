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
    window.pantuanInterval = setInterval(pantauJawaban, 3000);

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
  const soal = books.filter(b => b.category === "Latihan" || b.category === "Ujian");
  if (soal.length === 0) {
    select.innerHTML = `<option value="">— Belum ada soal tersedia —</option>`;
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
      showToast("Sesi berhasil diakhiri! 👋");
      if (window.pantuanInterval) clearInterval(window.pantuanInterval);
      const jawabanList = document.getElementById("listJawabanMurid");
      if (jawabanList) jawabanList.innerHTML = `<p style="font-size:12px; color:var(--text-soft); text-align:center; padding:10px;">Sesi berakhir.</p>`;
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

function mulaiPresentasiPDF() {
  const select = document.getElementById("selectFileBuku");
  const file = select ? select.value : "";
  if (!file) return showToast("Pilih buku dulu!");
  const btn  = document.getElementById("btnMulaiPresentasi");
  const orig = setButtonLoading(btn, "Membagikan...");
  updateClassStatus("Presentasi", file, () => resetButton(btn, orig));
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
        const newKey = data.status + (data.file || "");
        if (newKey !== lastSyncStatus) {
          container.innerHTML = `<iframe src="books/${esc(data.file)}" width="100%" height="420px" class="iframe" style="border:none;"></iframe>`;
          lastSyncStatus = newKey;
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

  // Key aman untuk Firebase (tidak boleh ada karakter tertentu)
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
  showInputKodeKelas();
  showToast("Silakan masuk ke kelas baru.");
}
