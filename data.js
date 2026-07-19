/**
 * VanzelionGame — data.js (Firebase + Cloudinary)
 * -------------------------------------------------
 * - Firestore  → simpan data produk, activity
 * - Cloudinary → simpan foto (upload unsigned)
 * - Firebase Auth → login admin
 * -------------------------------------------------
 */

/* ══════════════════════════════════════════════════
   CONFIG
══════════════════════════════════════════════════ */
const VG_FIREBASE_CONFIG = {
  apiKey:            "AIzaSyApNj55Cu6LCesgRiDQYXnYRWYsNiJpbsQ",
  authDomain:        "vanzelion.firebaseapp.com",
  projectId:         "vanzelion",
  storageBucket:     "vanzelion.firebasestorage.app",
  messagingSenderId: "696470812345",
  appId:             "1:696470812345:web:b3e280b18b3762887ecd68",
};

const VG_CLOUDINARY = {
  cloudName:   "dcnzfbfzj",
  uploadPreset: "vanzeliongame",
};

/* ══════════════════════════════════════════════════
   FIREBASE INIT (via CDN — ditambahkan di HTML)
══════════════════════════════════════════════════ */
let _db   = null;
let _auth = null;

function getDB() {
  if (!_db) {
    if (!firebase.apps.length) firebase.initializeApp(VG_FIREBASE_CONFIG);
    _db = firebase.firestore();
  }
  return _db;
}

function getAuth() {
  if (!_auth) {
    if (!firebase.apps.length) firebase.initializeApp(VG_FIREBASE_CONFIG);
    _auth = firebase.auth();
  }
  return _auth;
}

/* ══════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════ */
function vgLogActivity(message) {
  try {
    const db = getDB();
    db.collection("activity").add({ message, time: Date.now() });
  } catch(e) { console.warn("Activity log error:", e); }
}

/* ══════════════════════════════════════════════════
   PUBLIC API — VanzelionDB
══════════════════════════════════════════════════ */
const VanzelionDB = {

  /* ── PRODUCTS ──────────────────────────────────── */
  async getProducts() {
    const db = getDB();
    const snap = await db.collection("products")
      .orderBy("createdAt", "desc")
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async getProductById(id) {
    const db  = getDB();
    const doc = await db.collection("products").doc(id).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  },

  async addProduct(product) {
    const db  = getDB();
    const now = Date.now();
    const payload = { ...product, createdAt: now, updatedAt: now };
    const ref = await db.collection("products").add(payload);
    vgLogActivity(`Produk baru ditambahkan: "${product.title}"`);
    return { id: ref.id, ...payload };
  },

  async updateProduct(id, updates) {
    const db  = getDB();
    const now = Date.now();
    await db.collection("products").doc(id).update({ ...updates, updatedAt: now });
    vgLogActivity(`Produk diperbarui: "${updates.title || id}"`);
    return { id, ...updates, updatedAt: now };
  },

  async deleteProduct(id) {
    const db  = getDB();
    const doc = await db.collection("products").doc(id).get();
    const title = doc.exists ? doc.data().title : id;
    await db.collection("products").doc(id).delete();
    vgLogActivity(`Produk dihapus: "${title}"`);
    return true;
  },

  /* ── TOPUP KOIN ────────────────────────────────── */
  async getTopup() {
    const db   = getDB();
    try {
      const snap = await db.collection("topup")
        .orderBy("sortOrder", "asc")
        .get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch(e) {
      // Fallback: ambil tanpa orderBy kalau index belum dibuat
      const snap = await db.collection("topup").get();
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      return items.sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99));
    }
  },

  async getTopupById(id) {
    const db  = getDB();
    const doc = await db.collection("topup").doc(id).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  },

  async addTopup(item) {
    const db  = getDB();
    const now = Date.now();
    const payload = { ...item, createdAt: now, updatedAt: now };
    const ref = await db.collection("topup").add(payload);
    vgLogActivity(`Paket topup baru: "${item.title}"`);
    return { id: ref.id, ...payload };
  },

  async updateTopup(id, updates) {
    const db  = getDB();
    const now = Date.now();
    await db.collection("topup").doc(id).update({ ...updates, updatedAt: now });
    vgLogActivity(`Paket topup diperbarui: "${updates.title || id}"`);
    return { id, ...updates, updatedAt: now };
  },

  async deleteTopup(id) {
    const db  = getDB();
    const doc = await db.collection("topup").doc(id).get();
    const title = doc.exists ? doc.data().title : id;
    await db.collection("topup").doc(id).delete();
    vgLogActivity(`Paket topup dihapus: "${title}"`);
    return true;
  },

  /* ── ACTIVITY ──────────────────────────────────── */
  async getActivity() {
    try {
      const db   = getDB();
      const snap = await db.collection("activity")
        .orderBy("time", "desc")
        .limit(20)
        .get();
      return snap.docs.map(d => d.data());
    } catch(e) { return []; }
  },

  /* ── IMAGE UPLOAD (Cloudinary unsigned) ────────── */
  async uploadImages(fileList) {
    const files = Array.from(fileList);
    const url   = `https://api.cloudinary.com/v1_1/${VG_CLOUDINARY.cloudName}/image/upload`;

    return Promise.all(files.map(file => {
      const fd = new FormData();
      fd.append("file",         file);
      fd.append("upload_preset", VG_CLOUDINARY.uploadPreset);
      fd.append("folder",       "vanzeliongame");

      return fetch(url, { method: "POST", body: fd })
        .then(r => r.json())
        .then(data => {
          if (data.secure_url) return data.secure_url;
          throw new Error(data.error?.message || "Upload gagal");
        });
    }));
  },

  /* ── AUTH ──────────────────────────────────────── */
  async login(email, password) {
    try {
      const auth = getAuth();
      await auth.signInWithEmailAndPassword(email, password);
      return true;
    } catch(e) {
      console.warn("Login error:", e.message);
      return false;
    }
  },

  logout() {
    try { getAuth().signOut(); } catch(e) {}
  },

  isLoggedIn() {
    try {
      const auth = getAuth();
      return !!auth.currentUser;
    } catch(e) { return false; }
  },

  /* onAuthChange — panggil callback saat status auth berubah */
  onAuthChange(callback) {
    try { getAuth().onAuthStateChanged(callback); } catch(e) {}
  },
};
