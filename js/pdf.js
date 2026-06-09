// =============================================
//  PDF READER — Optimized
// =============================================

let pdfDoc           = null;
let pageNum          = 1;
let pageIsRendering  = false;
let pageNumIsPending = null;
let currentPdfFile   = null;
let pageCache        = {};

const WORKER_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
const MAX_CACHE_PAGES = 10; // Batasi cache agar tidak makan RAM

// =============================================
//  DETEKSI KEMAMPUAN DEVICE 
// =============================================
function getOptimalScale() {
  const cores = navigator.hardwareConcurrency || 2;
  const ram   = navigator.deviceMemory || 1;
  if (cores <= 2 || ram <= 1) return 0.8;
  if (cores <= 4 || ram <= 2) return 1.0;
  if (cores <= 6)             return 1.3;
  return 1.5;
}

// =============================================
//  BUKA PDF
// =============================================
function bukaPDFNative(fileName, title) {
  if (typeof pdfjsLib === 'undefined') {
    showToast('⚠️ Library PDF belum siap, coba lagi sebentar.');
    return;
  }

  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_CDN;
  }

  currentPdfFile = fileName;
  const url      = `books/${fileName}`;
  const modal    = document.getElementById('pdfReaderModal');
  if (!modal) return;

  modal.classList.remove('hidden');
  modal.classList.add('pdf-open');
  _resetScrollArea();

  const pdfTitleEl = document.getElementById('pdfTitle');
  const pageNumEl  = document.getElementById('page-num');
  const pageCountEl = document.getElementById('page-count');
  if (pdfTitleEl)  pdfTitleEl.innerText    = title || 'Membaca Buku...';
  if (pageNumEl)   pageNumEl.textContent   = '1';
  if (pageCountEl) pageCountEl.textContent = '?';
  updateProgressBar(0, 1);
  showPDFLoading(true);

  pdfjsLib.getDocument(url).promise
    .then((doc) => {
      pdfDoc = doc;
      const total = doc.numPages;
      if (pageCountEl) pageCountEl.textContent = total;

      const saved = getSavedPage(fileName);
      pageNum = (saved && saved > 0 && saved <= total) ? saved : 1;

      renderPage(pageNum);
      setupPDFSwipe();
    })
    .catch((err) => {
      console.error('PDF load error:', err);
      showPDFLoading(false);
      _showPDFError(fileName);
    });
}

// =============================================
//  RENDER HALAMAN — Offscreen canvas
// =============================================
function renderPage(num) {
  if (!pdfDoc) return;
  pageIsRendering = true;
  showPDFLoading(true);

  const SCALE   = getOptimalScale();
  const cacheKey = `${currentPdfFile}_p_${num}_s_${SCALE}`;

  // Dari cache (instan)
  if (pageCache[cacheKey]) {
    _paintCachedPage(cacheKey, num);
    return;
  }

  // Render baru
  pdfDoc.getPage(num).then((page) => {
    const viewport  = page.getViewport({ scale: SCALE });
    const offscreen = document.createElement('canvas');
    offscreen.width  = viewport.width;
    offscreen.height = viewport.height;
    const offCtx = offscreen.getContext('2d');

    page.render({ canvasContext: offCtx, viewport }).promise
      .then(() => {
        const canvas = document.getElementById('pdf-canvas');
        if (!canvas) { pageIsRendering = false; showPDFLoading(false); return; }

        canvas.width  = viewport.width;
        canvas.height = viewport.height;
        canvas.getContext('2d').drawImage(offscreen, 0, 0);

        // Simpan ke cache dengan batas ukuran
        _addToCache(cacheKey, offscreen);

        _afterRender(num);

        // Pre-render halaman berikutnya di background
        preRenderNextPage(num + 1, SCALE);
      })
      .catch((err) => { pageIsRendering = false; showPDFLoading(false); console.error('Render error:', err); });
  })
  .catch((err) => { pageIsRendering = false; showPDFLoading(false); console.error('getPage error:', err); });
}

function _paintCachedPage(cacheKey, num) {
  const canvas = document.getElementById('pdf-canvas');
  if (canvas) {
    const cached = pageCache[cacheKey];
    canvas.width  = cached.width;
    canvas.height = cached.height;
    canvas.getContext('2d').drawImage(cached, 0, 0);
  }
  _afterRender(num);
}

function _afterRender(num) {
  pageIsRendering = false;
  showPDFLoading(false);

  const pageNumEl = document.getElementById('page-num');
  if (pageNumEl) pageNumEl.textContent = num;
  updateProgressBar(num, pdfDoc ? pdfDoc.numPages : 1);
  if (currentPdfFile) savePage(currentPdfFile, num);

  const scrollArea = document.getElementById('pdfScrollArea');
  if (scrollArea) scrollArea.scrollTop = 0;

  if (pageNumIsPending !== null) {
    const pending = pageNumIsPending;
    pageNumIsPending = null;
    renderPage(pending);
  }
}

// Batasi ukuran cache agar tidak makan RAM
function _addToCache(key, canvas) {
  const keys = Object.keys(pageCache);
  if (keys.length >= MAX_CACHE_PAGES) {
    // Hapus entri paling lama
    const oldest = keys[0];
    pageCache[oldest].width  = 0;
    pageCache[oldest].height = 0;
    delete pageCache[oldest];
  }
  pageCache[key] = canvas;
}

function preRenderNextPage(nextNum, scale) {
  if (!pdfDoc || nextNum > pdfDoc.numPages) return;
  const nextCacheKey = `${currentPdfFile}_p_${nextNum}_s_${scale}`;
  if (pageCache[nextCacheKey]) return;

  pdfDoc.getPage(nextNum)
    .then((page) => {
      const viewport  = page.getViewport({ scale });
      const preCanvas = document.createElement('canvas');
      preCanvas.width  = viewport.width;
      preCanvas.height = viewport.height;
      page.render({ canvasContext: preCanvas.getContext('2d'), viewport }).promise
        .then(() => { _addToCache(nextCacheKey, preCanvas); })
        .catch(() => {});
    })
    .catch(() => {});
}

function queueRenderPage(num) {
  if (pageIsRendering) { pageNumIsPending = num; }
  else { renderPage(num); }
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

// =============================================
//  TUTUP PDF
// =============================================
function closePDFReader() {
  const modal = document.getElementById('pdfReaderModal');
  if (modal) modal.classList.remove('pdf-open');

  // Bersihkan cache buku yang baru ditutup
  if (currentPdfFile) {
    Object.keys(pageCache).forEach(key => {
      if (key.startsWith(currentPdfFile)) {
        pageCache[key].width  = 0;
        pageCache[key].height = 0;
        delete pageCache[key];
      }
    });
  }

  pdfDoc           = null;
  pageNum          = 1;
  pageIsRendering  = false;
  pageNumIsPending = null;
  currentPdfFile   = null;

  _destroyPDFSwipe();
}

// =============================================
//  HELPERS — private
// =============================================
function _resetScrollArea() {
  const scrollArea = document.getElementById('pdfScrollArea');
  if (!scrollArea) return;

  // Hapus hanya elemen error/konten lama, jaga overlay & hint
  Array.from(scrollArea.children).forEach(child => {
    if (child.id !== 'pdfLoadingOverlay' && child.id !== 'pdfSwipeHint') {
      child.remove();
    }
  });

  let canvas = document.getElementById('pdf-canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'pdf-canvas';
    canvas.style.cssText = 'max-width:100%; box-shadow:var(--shadow-2); border-radius:var(--r-md);';
    scrollArea.appendChild(canvas);
  } else {
    canvas.style.display = '';
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  }
}

function _showPDFError(fileName) {
  const scrollArea = document.getElementById('pdfScrollArea');
  if (!scrollArea) return;

  // Sembunyikan canvas
  const canvas = document.getElementById('pdf-canvas');
  if (canvas) canvas.style.display = 'none';

  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = 'padding:48px 24px; text-align:center;';
  errorDiv.innerHTML = `
    <div style="font-size:52px; margin-bottom:16px;">📭</div>
    <p style="font-weight:800; font-size:16px; color:var(--text); margin-bottom:8px;">Buku belum tersedia</p>
    <p style="font-size:13px; line-height:1.6; color:var(--text-2);">
      File <b>${esc(fileName)}</b> belum ada di server.<br>Hubungi pengelola perpustakaan.
    </p>
    <button onclick="closePDFReader()" class="btn-main" style="margin-top:24px; max-width:180px;">← Kembali</button>
  `;
  scrollArea.appendChild(errorDiv);
}

// =============================================
//  PROGRESS BAR
// =============================================
function updateProgressBar(current, total) {
  const bar = document.getElementById('pdfProgressBar');
  if (!bar || !total) return;
  bar.style.width = Math.round((current / total) * 100) + '%';
}

// =============================================
//  LOADING OVERLAY
// =============================================
function showPDFLoading(show) {
  const el = document.getElementById('pdfLoadingOverlay');
  if (el) el.style.display = show ? 'flex' : 'none';
}

// =============================================
//  SIMPAN & AMBIL HALAMAN TERAKHIR
// =============================================
function savePage(fileName, page) {
  try {
    localStorage.setItem('pdf_page_' + fileName.replace(/[^a-z0-9]/gi, '_'), String(page));
  } catch (e) { /* storage penuh */ }
}

function getSavedPage(fileName) {
  try {
    const val = localStorage.getItem('pdf_page_' + fileName.replace(/[^a-z0-9]/gi, '_'));
    const parsed = val ? parseInt(val, 10) : 1;
    return isNaN(parsed) ? 1 : parsed;
  } catch (e) { return 1; }
}

// =============================================
//  SWIPE GESTURE
// =============================================
function setupPDFSwipe() {
  const scrollArea = document.getElementById('pdfScrollArea');
  if (!scrollArea) return;
  _destroyPDFSwipe();

  const mc = new Hammer(scrollArea);
  mc.get('swipe').set({ direction: Hammer.DIRECTION_HORIZONTAL, threshold: 30, velocity: 0.3 });
  mc.on('swipeleft',  () => onNextPage());
  mc.on('swiperight', () => onPrevPage());
  scrollArea._hammerPDFInstance = mc;

  // Tampilkan swipe hint sekali
  const hint = document.getElementById('pdfSwipeHint');
  if (hint) {
    hint.classList.add('show');
    setTimeout(() => hint.classList.remove('show'), 2500);
  }
}

function _destroyPDFSwipe() {
  const scrollArea = document.getElementById('pdfScrollArea');
  if (!scrollArea) return;
  if (scrollArea._hammerPDFInstance) {
    scrollArea._hammerPDFInstance.destroy();
    scrollArea._hammerPDFInstance = null;
  }
}
