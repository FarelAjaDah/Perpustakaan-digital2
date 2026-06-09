const STORAGE_KEYS = {
  LAST_READ:   "last_read_book",
  LAST_CLASS:  "last_class_cache",
  USER_ROLE:   "user_role",
  USER_NAME:   "user_name",
  THEME:       "theme",
};

// Simpan cache data kelas terakhir (untuk offline)
function cacheClassData(data) {
  try {
    localStorage.setItem(STORAGE_KEYS.LAST_CLASS, JSON.stringify({
      ...data,
      _cachedAt: Date.now()
    }));
  } catch (e) { /* storage penuh atau private mode */ }
}

// Ambil cache kelas
function getCachedClassData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LAST_CLASS);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

// Bersihkan semua data lokal kecuali tema
function clearUserData() {
  const theme = localStorage.getItem(STORAGE_KEYS.THEME);
  localStorage.clear();
  if (theme) localStorage.setItem(STORAGE_KEYS.THEME, theme);
}
