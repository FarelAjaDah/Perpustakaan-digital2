function setupKelasUI() {
  const role   = localStorage.getItem("user_role");
  const isGuru = role === "Guru" || role === "Developer";

  document.getElementById("guruView").classList.toggle("hidden", !isGuru);
  document.getElementById("muridView").classList.toggle("hidden", isGuru);

  if (isGuru) {
    populateSelectBuku();

    if (window.pantuanInterval) clearInterval(window.pantuanInterval);
    window.pantuanInterval = setInterval(pantauJawaban, 3000);

    if (document.getElementById("activeCode").innerText === "-----") {
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
  select.innerHTML = pelajaran.map(b =>
    `<option value="${b.file}">${b.emoji} ${b.title}</option>`
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
//  RUANG KELAS - GURU
// =============================================
function updateClassStatus(status, content = "", onDone = null) {
  const codeElement = document.getElementById("activeCode");
  let currentCode   = codeElement.innerText.trim();

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
  const file = document.getElementById("selectQuizFile").value;
  if (!file) return showToast("Pilih file kuis dulu!");
  const contentPayload = JSON.stringify({ tipe: "pdf", namaFile: file });
  const btn  = document.getElementById("btnMulaiQuizFile");
  const orig = setButtonLoading(btn, "Mengirim...");
  updateClassStatus("Kuis", contentPayload, () => resetButton(btn, orig));
}

function pantauJawaban() {
  const code = document.getElementById("activeCode").innerText;
  if (code === "-----" || !code) return;
  fetch(`${FIREBASE_BASE}/answers/${code}.json`)
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
            <span class="student-name">👤 ${esc(data[key].nama)}</span>
            <span style="color:var(--text-soft);">${esc(data[key].waktu || '')}</span>
          </div>
          <div style="font-size:13px;">${esc(data[key].jawaban)}</div>
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

  const btn          = document.querySelector("#joinArea .btn-main");
  const originalText = btn ? btn.innerHTML : null;
  if (btn) { btn.innerHTML = `<span class="btn-spinner"></span> Menyambungkan...`; btn.disabled = true; }

  fetch(FIREBASE_URL)
    .then(res => res.json())
    .then(data => {
      if (btn) { btn.innerHTML = originalText; btn.disabled = false; }
      if (data && input === data.code) {
        lastSyncStatus = ""; // reset agar konten terbaru selalu dirender saat baru masuk
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

      const container  = document.getElementById("classContent");
      const statusText = document.getElementById("currentStatus");

      if (data.status !== lastStatus) {
        showToast(`Status: ${data.status}`);
        lastStatus = data.status;
      }

      if (data.status === "Presentasi") {
        statusText.innerText = "📺 GURU SEDANG PRESENTASI";
        if (data.status !== lastSyncStatus || container.querySelector('iframe')?.src !== `${location.origin}/books/${data.file}`) {
          container.innerHTML = `<iframe src="books/${data.file}" width="100%" height="420px" class="iframe" style="border:none;"></iframe>`;
          lastSyncStatus = data.status + data.file;
        }

      } else if (data.status === "Kuis") {
        statusText.innerText = "📝 KUIS SEDANG BERLANGSUNG";
        let parsedContent = data.content;
        if (typeof data.content === 'string') {
          try { parsedContent = JSON.parse(data.content); } catch (e) { parsedContent = data.content; }
        }

        const isPdf        = parsedContent && typeof parsedContent === 'object' && parsedContent.tipe === "pdf";
        const contentKey   = data.status + (isPdf ? parsedContent.namaFile : data.content);
        if (contentKey === lastSyncStatus) return;
        lastSyncStatus = contentKey;

        if (isPdf) {
          container.innerHTML = `
            <div style="padding:16px;" class="animate">
              <p style="font-weight:700; margin-bottom:12px; color:var(--text-main);">📄 Kuis dari File PDF:</p>
              <iframe src="books/${parsedContent.namaFile}" width="100%" height="300px" style="border:none; border-radius:12px;"></iframe>
              <textarea id="jawabanMuridText" placeholder="Ketik jawabanmu di sini..." style="width:100%; height:80px; margin-top:12px; padding:12px; border-radius:12px; border:1px solid var(--glass-border); font-family:inherit; background:var(--input-bg); color:var(--text-main);"></textarea>
              <button id="btnKirimJawaban" class="btn-main" style="margin-top:10px; background:var(--accent);" onclick="kirimJawabanKeGuru('${data.code}', '${localStorage.getItem("user_name")}')">Kirim Jawaban ✉️</button>
            </div>`;
        } else {
          container.innerHTML = `
            <div style="padding:20px; text-align:left;" class="animate">
              <p style="font-weight:700; margin-bottom:12px; color:var(--text-main);">❓ Soal: ${esc(data.content)}</p>
              <textarea id="jawabanMuridText" placeholder="Ketik jawabanmu..." style="width:100%; height:100px; padding:12px; border-radius:12px; border:1px solid var(--glass-border); font-family:inherit; background:var(--input-bg); color:var(--text-main);"></textarea>
              <button id="btnKirimJawaban" class="btn-main" style="margin-top:10px; background:var(--accent);" onclick="kirimJawabanKeGuru('${data.code}', '${localStorage.getItem("user_name")}')">Kirim Jawaban ✉️</button>
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
  const safeKey     = nama.replace(/[.#$/[\]\s]/g, '_');
  const uniqueKey   = `${safeKey}_${Date.now()}`;
  const URL_JAWABAN = `${FIREBASE_BASE}/answers/${code}/${uniqueKey}.json`;

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
        kirimBtn.disabled  = true;
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
  lastStatus     = "";
  lastSyncStatus = "";

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
  lastStatus     = "";
  lastSyncStatus = "";
}

function resetTampilanMurid() {
  document.getElementById("resetMuridArea").classList.add("hidden");
  if (syncInterval) { clearInterval(syncInterval); syncInterval = null; }
  showInputKodeKelas();
  showToast("Silakan masuk ke kelas baru.");
}
