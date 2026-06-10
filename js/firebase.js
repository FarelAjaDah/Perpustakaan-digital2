// =============================================
//  FIREBASE CONFIG — Pustaka Digital
// =============================================
const FIREBASE_BASE = "https://perpustakaan-digital-5e62a-default-rtdb.asia-southeast1.firebasedatabase.app";
const FIREBASE_URL  = `${FIREBASE_BASE}/class_sync.json`;

let currentCategory = "Semua";
let syncInterval    = null;
let lastStatus      = "";
let lastSyncStatus  = "";

// =============================================
//  XSS ESCAPE HELPER
// =============================================
function esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// =============================================
//  FETCH HELPER — dengan timeout & retry
// =============================================
async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}