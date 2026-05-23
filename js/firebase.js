const FIREBASE_BASE = "https://perpustakaan-digital-5e62a-default-rtdb.asia-southeast1.firebasedatabase.app";
const FIREBASE_URL  = `${FIREBASE_BASE}/class_sync.json`;

let currentCategory = "Semua";
let syncInterval    = null;
let lastStatus      = "";
let lastSyncStatus  = ""; 


// =============================================
//  BABU PEMBANTU PEMBANTAI ANJAY
// =============================================
function esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
