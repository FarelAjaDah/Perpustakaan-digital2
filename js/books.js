// =============================================
//  DATA BUKU 
// =============================================
const books = [
  { title: "Koding dan Kecerdasan Artifisial",                            file: "koding.pdf",        emoji: "💻", color: "#8b5cf6", category: "Pelajaran" },
  { title: "Matematika Kelas 5",                                          file: "matematika 5.pdf",  emoji: "➗", color: "#3b82f6", category: "Pelajaran" },
  { title: "Bahasa Indonesia Kelas 5",                                    file: "indo 5.pdf",       emoji: "🔤", color: "#ef4444", category: "Pelajaran" },
  { title: "Pendidikan Jasmani, Olahraga, dan Kesehatan Kelas 5",        file: "pjok 5.pdf",         emoji: "⚽", color: "#10b981", category: "Pelajaran" },
  { title: "Pendidikan Pancasila Kelas 5",                               file: "ppkn 5.pdf",         emoji: "🇮🇩", color: "#f59e0b", category: "Pelajaran" },
  { title: "Bahasa Inggris Kelas 5",                                     file: "enggres 5.pdf",         emoji: "💬", color: "#ec4899", category: "Pelajaran" },
  { title: "Ilmu Pengetahuan Alam dan Sosial Kelas 5",                   file: "IPAS 5.pdf",         emoji: "🌍", color: "#14b8a6", category: "Pelajaran" },
  { title: "Literasi Digital pada Masyarakat Desa (Rural, I.N.)",        file: "Jurnal 1.pdf",       emoji: "📖", color: "#3b82f6", category: "Jurnal"    },
  { title: "Matematika Kelas 8",                                         file: "mtk smp.pdf",        emoji: "📐", color: "#3b82f6", category: "Pelajaran" },
  { title: "Pendidikan Agama dan Budi Pekerti kelas 8",                   file: "keagamaan smp.pdf",     emoji: "🕊️", color: "#fbbf24", category: "Pelajaran" },
  { title: "Bahasa Indonesia Kelas 8",                                    file: "INDONESIA SMP.pdf",     emoji: "📕", color: "#ef4444", category: "Pelajaran" },
  { title: "Bahasa Inggris Kelas 8",                                     file: "ENGGRES SMP.pdf",       emoji: "📗", color: "#ec4899", category: "Pelajaran" },
  { title: "Ilmu Pengetahuan Alam kelas 8",                   file: "IPA SMP.pdf",       emoji: "🔬", color: "#14b8a6", category: "Pelajaran" },
  { title: "Ilmu Pengetahuan Sosial kelas 8",                   file: "ips smp.pdf",       emoji: "🏛️", color: "#22c55e", category: "Pelajaran" },
  { title:"Pendidikan Jasmani, Olahraga, dan Kesehatan Kelas 8",        file: "PJOK SMP.pdf",      emoji: "🏀", color: "#10b981", category: "Pelajaran" },
  { title: "Pendidikan Pancasila Kelas 8",                               file: "PPKN SMP.pdf",      emoji: "🛡️", color: "#f59e0b", category: "Pelajaran" },
  { title: "Informatika Kelas 8",                            file: "informatika smp.pdf", emoji: "🖥️", color: "#8b5cf6", category: "Pelajaran" },
];

// Warna badge per kategori
const CAT_COLOR = {
  Pelajaran: { bg: '#dbeafe', text: '#1d4ed8' },
  Komik:     { bg: '#fee2e2', text: '#b91c1c' },
  Novel:     { bg: '#d1fae5', text: '#065f46' },
  Ujian:     { bg: '#fef3c7', text: '#92400e' },
  Latihan:   { bg: '#ede9fe', text: '#5b21b6' },
  Jurnal:    { bg: '#e0f2fe', text: '#075985' },
};

// =============================================
//  RENDER BUKU
// =============================================
function renderBooks(kw) {
  const list    = document.getElementById("bookList");
  const role    = localStorage.getItem("user_role");
  const keyword = (kw || "").toLowerCase().trim();

  const filtered = books.filter(b => {
    // Murid tidak bisa lihat kategori Ujian
    if (b.category === "Ujian" && role === "Murid") return false;

    const matchKeyword  = !keyword ||
      b.title.toLowerCase().includes(keyword) ||
      b.category.toLowerCase().includes(keyword);

    const matchCategory = currentCategory === "Semua" || b.category === currentCategory;

    return matchKeyword && matchCategory;
  });

  const counter = document.getElementById("bookCounter");
  if (counter) counter.innerText = `${filtered.length} buku ditemukan`;

  if (!list) return;

  if (filtered.length === 0) {
    list.innerHTML = `
      <div style="grid-column:1/-1; text-align:center; padding:48px 20px; color:var(--text-2);" class="animate">
        <div style="font-size:52px; margin-bottom:16px; opacity:0.5;">🔍</div>
        <p style="font-weight:800; font-size:15px; color:var(--text); margin-bottom:6px;">Buku tidak ditemukan</p>
        <p style="font-size:13px;">Coba kata kunci lain atau ganti kategori</p>
      </div>`;
    return;
  }

  list.innerHTML = filtered.map((b, index) => {
    const cc = CAT_COLOR[b.category] || { bg: '#f3f4f6', text: '#374151' };
    const savedPage = typeof getSavedPage === 'function' ? getSavedPage(b.file) : null;
    const pageInfo  = (savedPage && savedPage > 1)
      ? `<div style="margin-top:6px;"><span class="last-read-page">Hal. ${savedPage}</span></div>`
      : '';
    // Escape judul untuk inline onclick
    const safeTitle = b.title.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const safeFile  = b.file.replace(/'/g, "\\'");
    return `
    <div class="book-card animate" style="animation-delay:${index * 0.04}s; --card-color:${b.color};"
         onclick="openBookDetails('${safeTitle}', '${safeFile}', '${b.emoji}', '${b.color}')">
      <div class="book-cover" style="background:${b.color}20; color:${b.color};">${b.emoji}</div>
      <div class="book-title">${esc(b.title)}</div>
      <span class="book-cat" style="background:${cc.bg}; color:${cc.text};">${esc(b.category)}</span>
      ${pageInfo}
    </div>`;
  }).join('');
}

// =============================================
//  SKELETON LOADING
// =============================================
function renderBooksSkeleton() {
  const list = document.getElementById("bookList");
  if (!list) return;
  list.innerHTML = Array(8).fill(`<div class="skeleton"></div>`).join('');
}

// =============================================
//  FILTER KATEGORI
// =============================================
function setCategory(cat) {
  currentCategory = cat;
  document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.classList.toggle('active-cat', btn.getAttribute('data-category') === cat);
  });
  const searchVal = document.getElementById("searchInput");
  renderBooks(searchVal ? searchVal.value : "");
}

// =============================================
//  TERAKHIR DIBACA
// =============================================
function renderLastRead() {
  const lastReadData = localStorage.getItem("last_read_book");
  const container    = document.getElementById("lastReadContainer");
  const cardPlace    = document.getElementById("lastReadCard");
  if (!container || !cardPlace) return;

  if (!lastReadData) {
    container.classList.add("hidden");
    return;
  }

  try {
    const book      = JSON.parse(lastReadData);
    const savedPage = typeof getSavedPage === 'function' ? getSavedPage(book.file) : null;
    const pageLabel = (savedPage && savedPage > 1) ? `Halaman ${savedPage}` : 'Klik untuk lanjut membaca';

    const safeTitle = (book.title || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const safeFile  = (book.file  || '').replace(/'/g, "\\'");

    container.classList.remove("hidden");
    cardPlace.innerHTML = `
      <div class="last-read-card"
           onclick="openBookDetails('${safeTitle}', '${safeFile}', '${esc(book.emoji)}', '${esc(book.color || '')}')">
        <div class="last-read-emoji">${esc(book.emoji)}</div>
        <div class="last-read-info">
          <div class="title">${esc(book.title)}</div>
          <div class="sub">${esc(pageLabel)}</div>
        </div>
        <div class="last-read-arrow">➔</div>
      </div>`;
  } catch (e) {
    localStorage.removeItem("last_read_book");
    container.classList.add("hidden");
  }
}

// =============================================
//  DETAIL BUKU (bottom sheet)
// =============================================
function openBookDetails(title, file, emoji, color) {
  const sheetTitle    = document.getElementById("sheetTitle");
  const sheetEmoji    = document.getElementById("sheetEmoji");
  const sheetCategory = document.getElementById("sheetCategory");
  const sheetPreview  = document.getElementById("sheetPreview");
  const btnReadNow    = document.getElementById("btnReadNow");

  if (!sheetTitle) return;

  sheetTitle.innerText    = title;
  sheetEmoji.innerText    = emoji;

  const bookData = books.find(b => b.file === file);
  sheetCategory.innerText = bookData ? bookData.category : "Materi";

  const savedPage = typeof getSavedPage === 'function' ? getSavedPage(file) : null;
  const pageLabel = (savedPage && savedPage > 1)
    ? `<p style="margin-top:8px; font-size:12px; color:var(--green); font-weight:700;">📑 Terakhir di halaman ${savedPage}</p>`
    : '';

  sheetPreview.innerHTML = `
    <div style="padding:24px; background:${color || 'var(--accent-soft)'}20; border-radius:15px; margin-bottom:20px;">
      <div style="font-size:64px;">${emoji}</div>
      <p style="margin-top:12px; font-weight:800; font-size:14px; color:var(--text);">Buku siap dibaca!</p>
      ${pageLabel}
    </div>`;

  btnReadNow.onclick = () => {
    closeSheet();
    const lastRead = {
      file, title, emoji,
      color: color || (bookData ? bookData.color : ''),
      time: Date.now()
    };
    localStorage.setItem("last_read_book", JSON.stringify(lastRead));
    renderLastRead();
    bukaPDFNative(file, title);
  };

  openSheet();
}
