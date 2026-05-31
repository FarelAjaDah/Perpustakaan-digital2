let pdfDoc           = null;
let pageNum          = 1;
let pageIsRendering  = false;
let pageNumIsPending = null;
const scale          = 1.5;

const WORKER_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

function bukaPDFNative(fileName, title) {
  if (typeof pdfjsLib === 'undefined') {
    showToast('⚠️ Library PDF belum siap, coba lagi sebentar.');
    return;
  }

  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_CDN;
  }

  const url   = `books/${fileName}`;
  const modal = document.getElementById('pdfReaderModal');
  if (!modal) return;

  // FIX: gunakan display flex eksplisit, bukan class hidden saja
  modal.style.display = 'flex';

  document.getElementById('pdfTitle').innerText     = title || 'Membaca Buku...';
  document.getElementById('page-num').textContent   = '1';
  document.getElementById('page-count').textContent = '?';

  const canvas = document.getElementById('pdf-canvas');
  // FIX: tambah willReadFrequently:true — ini yang bikin lag hilang
  const ctx    = canvas.getContext('2d', { willReadFrequently: true });
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  canvas.width  = 300;
  canvas.height = 100;
  ctx.font      = '14px Arial';
  ctx.fillStyle = '#666';
  ctx.fillText('Memuat halaman...', 20, 60);

  pdfjsLib.getDocument(url).promise
    .then((doc) => {
      pdfDoc = doc;
      document.getElementById('page-count').textContent = doc.numPages;
      pageNum = 1;
      renderPage(pageNum);
    })
    .catch((err) => {
      console.error('PDF load error:', err);
      showToast('⚠️ File gagal dimuat. Pastikan ada koneksi internet.');
      closePDFReader();
    });
}

function renderPage(num) {
  if (!pdfDoc) return;
  pageIsRendering = true;

  pdfDoc.getPage(num).then((page) => {
    const canvas   = document.getElementById('pdf-canvas');
    // FIX: konsisten pakai willReadFrequently di semua getContext
    const ctx      = canvas.getContext('2d', { willReadFrequently: true });
    const viewport = page.getViewport({ scale });

    canvas.height = viewport.height;
    canvas.width  = viewport.width;

    page.render({ canvasContext: ctx, viewport }).promise.then(() => {
      pageIsRendering = false;
      if (pageNumIsPending !== null) {
        renderPage(pageNumIsPending);
        pageNumIsPending = null;
      }
      const scrollArea = document.getElementById('pdfScrollArea');
      if (scrollArea) scrollArea.scrollTop = 0;
    });

    document.getElementById('page-num').textContent = num;
  }).catch((err) => {
    pageIsRendering = false;
    console.error('Render page error:', err);
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
  if (!pdfDoc || pageNum <= 1) return;
  pageNum--;
  queueRenderPage(pageNum);
}

function onNextPage() {
  if (!pdfDoc || pageNum >= pdfDoc.numPages) return;
  pageNum++;
  queueRenderPage(pageNum);
}

function closePDFReader() {
  const modal = document.getElementById('pdfReaderModal');
  if (modal) modal.style.display = 'none';
  pdfDoc           = null;
  pageIsRendering  = false;
  pageNumIsPending = null;
}