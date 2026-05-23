
let pdfDoc = null;
let pageNum = 1;
let pageIsRendering = false;
let pageNumIsPending = null;
const scale = 1.5; // OPSI KALO MAU HD YE BANG BIAR GAK KAYAK BURIK AMAT 2.0

function bukaPDFNative(fileName, title) {
  const url = `books/${fileName}`;
  const modal = document.getElementById('pdfReaderModal');
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'js/pdf.worker.min.js';
  
  modal.classList.remove('hidden');
  document.getElementById('pdfTitle').innerText = title || "Membaca Buku...";
  document.getElementById('page-num').textContent = "1";
  document.getElementById('page-count').textContent = "?";

  const canvas = document.getElementById('pdf-canvas');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = "14px Arial";
  ctx.fillText("Memproses Dokumen...", 10, 50);
  
  pdfjsLib.getDocument(url).promise.then(doc => {
    pdfDoc = doc;
    document.getElementById('page-count').textContent = doc.numPages;
    pageNum = 1;
    renderPage(pageNum);
  }).catch(err => {
    console.error(err);
    showToast("⚠️ File gagal dimuat. Pastikan file PDF sudah terunduh.");
    closePDFReader();
  });
}

function renderPage(num) {
  pageIsRendering = true;
  pdfDoc.getPage(num).then(page => {
    const canvas = document.getElementById('pdf-canvas');
    const ctx = canvas.getContext('2d');
    const viewport = page.getViewport({ scale });
    
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderCtx = { canvasContext: ctx, viewport: viewport };
    page.render(renderCtx).promise.then(() => {
      pageIsRendering = false;
      if (pageNumIsPending !== null) {
        renderPage(pageNumIsPending);
        pageNumIsPending = null;
      }
      document.getElementById('pdfScrollArea').scrollTop = 0;
    });
    
    document.getElementById('page-num').textContent = num;
  });
}

function queueRenderPage(num) {
  if (pageIsRendering) {
    pageNumIsPending = num;
  } else {
    renderPage(num);
  }
}

function onPrevPage() {
  if (pageNum <= 1) return;
  pageNum--;
  queueRenderPage(pageNum);
}

function onNextPage() {
  if (pageNum >= pdfDoc.numPages) return;
  pageNum++;
  queueRenderPage(pageNum);
}

function closePDFReader() {
  document.getElementById('pdfReaderModal').classList.add('hidden');
  pdfDoc = null;
}
