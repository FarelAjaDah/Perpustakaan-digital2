// =============================================
//  QRISS ANJAY LANGSUNG SAJA ( QR )
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
    const stopBtn       = document.createElement("button");
    stopBtn.id          = "btnStopScan";
    stopBtn.innerHTML   = "❌ Batalkan Scan";
    stopBtn.className   = "btn-main";
    stopBtn.style.cssText = "margin-top: 10px; background: #ef4444;";
    stopBtn.onclick     = stopScan;
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