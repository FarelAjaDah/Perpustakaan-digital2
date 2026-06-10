// =============================================
//  PDF READER — Optimized + Robust
// =============================================

let pdfDoc           = null;
let pageNum          = 1;
let pageIsRendering  = false;
let pageNumIsPending = null;
let currentPdfFile   = null;
let pageCache        = {};
let _renderAttempts  = 0;
let _renderTimeout   = null;

const WORKER_CDN     = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
const MAX_CACHE_PAGES = 8;
const RENDER_TIMEOUT_MS = 15000; // 15 detik batas render

// =============================================
//  DETEKSI KEMAMPUAN DEVICE 
// =============================================
function getOptimalScale() {
  const cores = navigator.hardwareConcurrency || 2;
  const ram   = navigator.deviceMemory || 1;
  // HP low-end desa: skala lebih kecil agar cepat
  if (cores <= 2 || ram <= 1) return 0.75;
  if (cores <= 4 || ram <= 2) return 1.0;
  if (cores <= 6)             return 1.2;
  return 1.4;
}

// =============================================
//  BUKA PDF
// =============================================
let _loadAttempts = 0;
const MAX_LOAD_ATTEMPTS = 3;

function bukaPDFNative(fileName, title) {
  if (typeof pdfjsLib === 'undefined') {
    // pdfjsLib belum siap — tunggu sebentar lalu coba lagi
    showPDFLoading(true, 'Menyiapkan pembaca PDF...');
    setTimeout(() => bukaPDFNative(fileName, title), 1200);
    return;
  }

  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_CDN;
  }

  // Reset state
  currentPdfFile  = fileName;
  _renderAttempts = 0;
  _loadAttempts   = 0;

  _doLoadPDF(fileName, title);
}

function _doLoadPDF(fileName, title) {
  const url   = `books/${fileName}`;
  const modal = document.getElementById('pdfReaderModal');
  if (!modal) return;

  // Buka modal hanya sekali
  if (!modal.classList.contains('pdf-open')) {
    modal.classList.remove('hidden');
    modal.classList.add('pdf-open');
    _resetScrollArea();
  }

  const pdfTitleEl  = document.getElementById('pdfTitle');
  const pageNumEl   = document.getElementById('page-num');
  const pageCountEl = document.getElementById('page-count');
  if (pdfTitleEl)   pdfTitleEl.innerText    = title || 'Membaca Buku...';
  if (pageNumEl)    pageNumEl.textContent   = '1';
  if (pageCountEl)  pageCountEl.textContent = '?';
  updateProgressBar(0, 1);

  const attempt     = _loadAttempts + 1;
  const loadingMsg  = attempt === 1
    ? 'Membuka buku...'
    : `Mencoba lagi... (${attempt}/${MAX_LOAD_ATTEMPTS})`;
  showPDFLoading(true, loadingMsg);

  // Timeout: jika tidak ada respons dalam 20 detik
  const loadTimeout = setTimeout(() => {
    showPDFLoading(false);
    _handleLoadError(fileName, title, null, 'timeout');
  }, 20000);

  pdfjsLib.getDocument({
    url,
    disableRange:    false,
    disableStream:   false,
    disableFontFace: false,
    cMapUrl:         'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
    cMapPacked:      true,
  }).promise
    .then((doc) => {
      clearTimeout(loadTimeout);
      _loadAttempts = 0; // reset counter
      pdfDoc = doc;

      const total = doc.numPages;
      if (pageCountEl) pageCountEl.textContent = total;

      const saved = getSavedPage(fileName);
      pageNum = (saved && saved > 0 && saved <= total) ? saved : 1;

      renderPage(pageNum);
      setupPDFSwipe();
    })
    .catch((err) => {
      clearTimeout(loadTimeout);
      _handleLoadError(fileName, title, err, 'error');
    });
}

function _handleLoadError(fileName, title, err, reason) {
  console.warn(`PDF load ${reason} [attempt ${_loadAttempts + 1}]:`, err);

  // Cek apakah ini error "file tidak ada" (404) — tidak perlu retry
  const is404 = err && (
    err.message?.includes('404') ||
    err.name === 'MissingPDFException' ||
    err.message?.includes('Missing PDF')
  );

  if (is404) {
    showPDFLoading(false);
    _showPDFError(fileName);
    return;
  }

  // Untuk error lain (network timeout, SW belum siap, dll) — retry otomatis
  if (_loadAttempts < MAX_LOAD_ATTEMPTS - 1) {
    _loadAttempts++;
    const delay = _loadAttempts * 1500; // 1.5s, 3s
    showPDFLoading(true, `Koneksi lambat, coba lagi (${_loadAttempts}/${MAX_LOAD_ATTEMPTS - 1})...`);
    setTimeout(() => _doLoadPDF(fileName, title), delay);
  } else {
    // Semua retry habis — tampilkan tombol coba lagi manual
    _loadAttempts = 0;
    showPDFLoading(false);
    _showRetryOption(fileName, title,
      reason === 'timeout'
        ? 'Buku tidak merespons. Server mungkin sedang sibuk.'
        : 'Gagal membuka buku. Coba lagi atau buka ulang aplikasi.'
    );
  }
}

// =============================================
//  RENDER HALAMAN — Offscreen canvas + timeout guard
// =============================================
function renderPage(num) {
  if (!pdfDoc) return;
  pageIsRendering = true;
  showPDFLoading(true, `Memuat halaman ${num}...`);

  // Guard: jika render macet > RENDER_TIMEOUT_MS, beri opsi retry
  _clearRenderTimeout();
  _renderTimeout = setTimeout(() => {
    if (pageIsRendering) {
      pageIsRendering = false;
      showPDFLoading(false);
      _showRenderStuck(num);
    }
  }, RENDER_TIMEOUT_MS);

  const SCALE    = getOptimalScale();
  const cacheKey = `${currentPdfFile}_p_${num}_s_${SCALE}`;

  if (pageCache[cacheKey]) {
    _clearRenderTimeout();
    _paintCachedPage(cacheKey, num);
    return;
  }

  pdfDoc.getPage(num).then((page) => {
    const viewport  = page.getViewport({ scale: SCALE });
    const offscreen = document.createElement('canvas');
    offscreen.width  = viewport.width;
    offscreen.height = viewport.height;
    const offCtx    = offscreen.getContext('2d');

    const renderTask = page.render({ canvasContext: offCtx, viewport });

    renderTask.promise
      .then(() => {
        _clearRenderTimeout();
        _renderAttempts = 0; // reset counter jika berhasil

        const canvas = document.getElementById('pdf-canvas');
        if (!canvas) { pageIsRendering = false; showPDFLoading(false); return; }

        canvas.width  = viewport.width;
        canvas.height = viewport.height;
        canvas.getContext('2d').drawImage(offscreen, 0, 0);

        _addToCache(cacheKey, offscreen);
        _afterRender(num);

        // Pre-render halaman berikutnya di background (delay agar UI tidak terblok)
        setTimeout(() => preRenderNextPage(num + 1, SCALE), 300);
      })
      .catch((err) => {
        _clearRenderTimeout();
        pageIsRendering = false;
        showPDFLoading(false);
        console.error('Render error:', err);

        // Retry otomatis maksimal 2 kali
        if (_renderAttempts < 2) {
          _renderAttempts++;
          showToast(`⚙️ Coba render ulang... (${_renderAttempts}/2)`);
          setTimeout(() => renderPage(num), 1500);
        } else {
          _renderAttempts = 0;
          _showRenderStuck(num);
        }
      });
  })
  .catch((err) => {
    _clearRenderTimeout();
    pageIsRendering = false;
    showPDFLoading(false);
    console.error('getPage error:', err);
    _showRenderStuck(num);
  });
}

function _clearRenderTimeout() {
  if (_renderTimeout) { clearTimeout(_renderTimeout); _renderTimeout = null; }
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
    const pending    = pageNumIsPending;
    pageNumIsPending = null;
    renderPage(pending);
  }
}

function _addToCache(key, canvas) {
  const keys = Object.keys(pageCache);
  if (keys.length >= MAX_CACHE_PAGES) {
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
//  JUMP TO PAGE (input manual)
// =============================================
function jumpToPage() {
  const input = document.getElementById('pageJumpInput');
  if (!input || !pdfDoc) return;
  const target = parseInt(input.value, 10);
  if (isNaN(target) || target < 1 || target > pdfDoc.numPages) {
    showToast(`⚠️ Halaman harus 1 – ${pdfDoc.numPages}`);
    input.value = pageNum;
    return;
  }
  pageNum = target;
  input.value = '';
  input.blur();
  queueRenderPage(pageNum);
}

// =============================================
//  TUTUP PDF
// =============================================
function closePDFReader() {
  _clearRenderTimeout();
  const modal = document.getElementById('pdfReaderModal');
  if (modal) modal.classList.remove('pdf-open');

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
  _renderAttempts  = 0;

  _destroyPDFSwipe();
}

// =============================================
//  HELPERS — private
// =============================================
function _resetScrollArea() {
  const scrollArea = document.getElementById('pdfScrollArea');
  if (!scrollArea) return;

  Array.from(scrollArea.children).forEach(child => {
    if (child.id !== 'pdfLoadingOverlay' && child.id !== 'pdfSwipeHint') {
      child.remove();
    }
  });

  let canvas = document.getElementById('pdf-canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'pdf-canvas';
    canvas.style.cssText = 'max-width:100%; box-shadow:var(--shadow-2); border-radius:var(--r-md); display:block; margin:0 auto;';
    scrollArea.appendChild(canvas);
  } else {
    canvas.style.display = '';
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  }
}

// Tampilkan saat render macet — tombol coba lagi
function _showRenderStuck(num) {
  const scrollArea = document.getElementById('pdfScrollArea');
  if (!scrollArea) return;

  // Hapus pesan error lama
  const oldErr = scrollArea.querySelector('.pdf-error-inline');
  if (oldErr) oldErr.remove();

  const errDiv = document.createElement('div');
  errDiv.className = 'pdf-error-inline';
  errDiv.style.cssText = 'padding:32px 20px; text-align:center;';
  errDiv.innerHTML = `
    <div style="font-size:44px; margin-bottom:12px;">😴</div>
    <p style="font-weight:800; font-size:15px; color:var(--text); margin-bottom:6px;">Halaman lambat dimuat</p>
    <p style="font-size:13px; color:var(--text-2); margin-bottom:18px; line-height:1.5;">
      Mungkin server sedang sibuk. Coba tap tombol di bawah.
    </p>
    <button onclick="retryRenderPage(${num})" class="btn-main" style="max-width:200px; margin:0 auto 10px;">
      🔄 Coba Lagi
    </button>
    <br>
    <button onclick="closePDFReader()" style="
      background:none; border:none; color:var(--text-2); font-size:13px;
      font-weight:700; cursor:pointer; margin-top:4px; font-family:inherit; padding:6px;">
      ← Kembali ke daftar buku
    </button>`;
  scrollArea.appendChild(errDiv);
}

function retryRenderPage(num) {
  const errDiv = document.querySelector('.pdf-error-inline');
  if (errDiv) errDiv.remove();
  _renderAttempts = 0;
  renderPage(num || pageNum);
}

function _showRetryOption(fileName, title, msg) {
  const scrollArea = document.getElementById('pdfScrollArea');
  if (!scrollArea) return;
  const canvas = document.getElementById('pdf-canvas');
  if (canvas) canvas.style.display = 'none';

  const errDiv = document.createElement('div');
  errDiv.style.cssText = 'padding:48px 24px; text-align:center;';
  errDiv.innerHTML = `
    <div style="font-size:52px; margin-bottom:16px;">🐢</div>
    <p style="font-weight:800; font-size:16px; color:var(--text); margin-bottom:8px;">Koneksi Lambat</p>
    <p style="font-size:13px; line-height:1.6; color:var(--text-2); margin-bottom:20px;">${msg}</p>
    <button onclick="closePDFReader(); setTimeout(()=>bukaPDFNative('${fileName.replace(/'/g,"\\'")}','${title.replace(/'/g,"\\'")}'),200);" 
      class="btn-main" style="max-width:200px; margin:0 auto 10px;">🔄 Coba Lagi</button>
    <br>
    <button onclick="closePDFReader()" style="
      background:none; border:none; color:var(--text-2); font-size:13px;
      font-weight:700; cursor:pointer; margin-top:4px; font-family:inherit; padding:6px;">
      ← Kembali</button>`;
  scrollArea.appendChild(errDiv);
}

function _showPDFError(fileName) {
  const scrollArea = document.getElementById('pdfScrollArea');
  if (!scrollArea) return;
  const canvas = document.getElementById('pdf-canvas');
  if (canvas) canvas.style.display = 'none';

  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = 'padding:48px 24px; text-align:center;';
  errorDiv.innerHTML = `
    <div style="font-size:52px; margin-bottom:16px;">📭</div>
    <p style="font-weight:800; font-size:16px; color:var(--text); margin-bottom:8px;">Buku belum tersedia</p>
    <p style="font-size:13px; line-height:1.6; color:var(--text-2);">
      File <b>${esc(fileName)}</b> belum ada.<br>Hubungi pengelola perpustakaan.
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
//  LOADING OVERLAY — dengan pesan dinamis
// =============================================
function showPDFLoading(show, msg) {
  const el  = document.getElementById('pdfLoadingOverlay');
  if (!el) return;
  el.style.display = show ? 'flex' : 'none';
  if (show && msg) {
    const msgEl = el.querySelector('p');
    if (msgEl) msgEl.textContent = msg;
  }
}

// =============================================
//  SIMPAN & AMBIL HALAMAN TERAKHIR
// =============================================
function savePage(fileName, page) {
  try {
    localStorage.setItem('pdf_page_' + fileName.replace(/[^a-z0-9]/gi, '_'), String(page));
  } catch (e) {}
}

function getSavedPage(fileName) {
  try {
    const val    = localStorage.getItem('pdf_page_' + fileName.replace(/[^a-z0-9]/gi, '_'));
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

// =============================================
//  SYNC page-num display (visible sekarang)
// =============================================
const _origAfterRender = _afterRender;
function _syncPageDisplay(num) {
  const el = document.getElementById('page-num');
  if (el) el.textContent = num;
  const inp = document.getElementById('pageJumpInput');
  if (inp) inp.value = '';  // kosongkan setelah jump
}
