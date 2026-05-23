const books = [
  { title: "Matematika",           file: "matematika.pdf",    emoji: "📐", color: "#3b82f6", category: "Pelajaran" },
  { title: "Sejarah",              file: "sejarah.pdf",       emoji: "📜", color: "#f59e0b", category: "Pelajaran" },
  { title: "Biologi",              file: "biologi.pdf",       emoji: "🧬", color: "#10b981", category: "Pelajaran" },
  { title: "Bahasa Jepang",        file: "jp.pdf",            emoji: "🗾", color: "#ef4444", category: "Pelajaran" },
  { title: "Fisika",               file: "fisika.pdf",        emoji: "🔬", color: "#6366f1", category: "Pelajaran" },
  { title: "Kimia",                file: "kimia.pdf",         emoji: "⚗️", color: "#f97316", category: "Pelajaran" },
  { title: "One Piece",            file: "op.pdf",            emoji: "🏴‍☠️", color: "#ef4444", category: "Komik"    },
  { title: "Solo Leveling",        file: "sl.pdf",            emoji: "⚔️", color: "#6366f1", category: "Komik"    },
  { title: "Detective Conan",      file: "conan.pdf",         emoji: "🕵️", color: "#10b981", category: "Komik"    },
  { title: "Laskar Pelangi",       file: "lp.pdf",            emoji: "🌈", color: "#10b981", category: "Novel"    },
  { title: "Harry Potter",         file: "hp.pdf",            emoji: "⚡", color: "#475569", category: "Novel"    },
  { title: "Laut Bercerita",       file: "laut.pdf",          emoji: "🌊", color: "#3b82f6", category: "Novel"    },
  { title: "Dilan 1990",           file: "dilan.pdf",         emoji: "🏍️", color: "#f59e0b", category: "Novel"    },
  { title: "Kubo Won't Let Me...", file: "kubo.pdf",          emoji: "👻", color: "#ef4444", category: "Novel"    },
  { title: "Stop Overthinking",    file: "stop.pdf",          emoji: "🧠", color: "#6366f1", category: "Novel"    },
  { title: "Soal Geografi 11",     file: "geografi 11.pdf",   emoji: "🗺️", color: "#f59e0b", category: "Ujian"    },
  { title: "Soal OSN Tingkat Kota",file: "osn-kota.pdf",      emoji: "🏆", color: "#f97316", category: "Ujian"    },
  { title: "Latihan Sosiologi 11", file: "sosiologi 11.pdf",  emoji: "👥", color: "#10b981", category: "Latihan"  },
  { title: "Literasi Digital pada masyarkat desa oleh Rural, I N", file: "Jurnal 1.pdf", emoji: "📖", color: "#3b82f6", category: "Jurnal" },
];

function renderBooks(kw) {
  const list    = document.getElementById("bookList"); 
  const role    = localStorage.getItem("user_role");
  const keyword = (kw || "").toLowerCase();

  const filtered = books.filter(b => {
    const matchKeyword  = b.title.toLowerCase().includes(keyword);
    const matchKeywordCat = b.category.toLowerCase().includes(keyword);
    const matchCategory = (currentCategory === "Semua") || (b.category === currentCategory);

    if (( b.category === "Ujian") && role === "Murid") {
      return false;
    }

    return matchCategory && matchKeyword;
  });

  document.getElementById("bookCounter").innerText = `${filtered.length} buku ditemukan`;

  if (filtered.length === 0) {
    list.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 48px 20px; color: var(--text-soft);" class="animate">
        <div style="font-size: 52px; margin-bottom: 16px; opacity: 0.5;">🔍</div>
        <p style="font-weight: 800; font-size: 15px; color: var(--text-main); margin-bottom: 6px;">Buku tidak ditemukan</p>
        <p style="font-size: 13px;">Coba kata kunci lain atau ganti kategori</p>
      </div>
    `;
    return;
  }

  list.innerHTML = filtered.map((b, index) => `
    <div class="book-card animate" style="animation-delay: ${index * 0.05}s"
         onclick="openBookDetails('${b.title.replace(/'/g, "\\'")}', '${b.file}', '${b.emoji}', '${b.color}')">
      <div class="book-cover" style="background: ${b.color}20; color: ${b.color};">${b.emoji}</div>
      <div style="font-weight: 800; font-size: 14px; color: var(--text-main); line-height: 1.3;">${b.title}</div>
      <div style="font-size: 10px; color: var(--accent); font-weight: 700; margin-top: 6px; opacity: 0.8;">
        ${b.category.toUpperCase()}
      </div>
    </div>
  `).join('');
}

function setCategory(cat) {
  currentCategory = cat;
  document.querySelectorAll('.cat-btn').forEach(btn => {
    const btnCat = btn.getAttribute('data-category');
    btn.classList.toggle('active-cat', btnCat === cat);
  });
  renderBooks(document.getElementById("searchInput").value);
}

function renderLastRead() {
  const lastReadData = localStorage.getItem("last_read_book");
  const container    = document.getElementById("lastReadContainer");
  const cardPlace    = document.getElementById("lastReadCard");

  if (!container || !cardPlace) return;

  if (lastReadData) {
    try {
      const book = JSON.parse(lastReadData);
      container.classList.remove("hidden");
      cardPlace.innerHTML = `
        <div onclick="openBookDetails('${book.title.replace(/'/g, "\\'")}', '${book.file}', '${book.emoji}', '${book.color || ''}')"
             style="background: var(--card-bg); padding: 15px; border-radius: 20px; display: flex; align-items: center; gap: 15px; box-shadow: var(--shadow-sm); border: 1px solid var(--glass-border); cursor: pointer;">
          <div style="font-size: 30px;">${book.emoji}</div>
          <div style="flex: 1;">
            <h4 style="margin: 0; font-size: 14px;">${book.title}</h4>
            <p style="margin: 0; font-size: 11px; color: var(--text-soft);">Klik untuk lanjut membaca</p>
          </div>
          <div style="color: var(--accent); font-size: 20px;">➔</div>
        </div>
      `;
    } catch (e) {
      localStorage.removeItem("last_read_book");
      container.classList.add("hidden");
    }
  } else {
    container.classList.add("hidden");
  }
}

function openBookDetails(title, file, emoji, color) {
  document.getElementById("sheetTitle").innerText = title;
  document.getElementById("sheetEmoji").innerText = emoji;

  const bookData = books.find(b => b.file === file);
  document.getElementById("sheetCategory").innerText = bookData ? bookData.category : "Materi";

  document.getElementById("sheetPreview").innerHTML = `
    <div style="padding: 24px; background: ${color || 'var(--accent-soft)'}20; border-radius: 15px; margin-bottom: 20px;">
      <div style="font-size: 64px;">${emoji}</div>
      <p style="margin-top: 12px; font-weight: 800; font-size: 14px; color: var(--text-main);">Buku siap dibaca!</p>
    </div>
  `;

  document.getElementById("btnReadNow").onclick = () => {
    closeSheet();
    const lastRead = { file, title, emoji, color: color || (bookData ? bookData.color : ''), time: new Date().getTime() };
    localStorage.setItem("last_read_book", JSON.stringify(lastRead));
    renderLastRead();
    
    // Panggil reader PDF Native
    bukaPDFNative(file, title);
  };

  openSheet();
}