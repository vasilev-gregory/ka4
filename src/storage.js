// App data lives in IndexedDB (large quota, can be marked persistent) and is mirrored to
// localStorage (synchronous, survives an interrupted async write on close; also fires the
// cross-tab "storage" event). On read, whichever copy is newer wins (by savedAt inside the JSON).
// Every successful write is also announced on a BroadcastChannel: the "storage" event alone
// isn't enough, because it doesn't fire when the localStorage write failed (quota) and only IDB got it.
const DB = "kach", STORE = "kv";
const bc = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("kach-storage") : null;
let dbp = null;
function db() {
  if (!dbp) {
    dbp = new Promise((res, rej) => {
      if (!("indexedDB" in window)) return rej(new Error("no indexedDB"));
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    dbp.catch(() => { dbp = null; });
  }
  return dbp;
}
async function idbGet(key) {
  const d = await db();
  return new Promise((res, rej) => {
    const r = d.transaction(STORE, "readonly").objectStore(STORE).get(key);
    r.onsuccess = () => res(r.result === undefined ? null : r.result);
    r.onerror = () => rej(r.error);
  });
}
async function idbSet(key, value) {
  const d = await db();
  return new Promise((res, rej) => {
    const tx = d.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}
const savedAt = (s) => { try { return JSON.parse(s).savedAt || 0; } catch (e) { return -1; } };

export const storage = {
  async get(key) {
    let a = null, b = null;
    try { a = await idbGet(key); } catch (e) {}
    try { b = localStorage.getItem(key); } catch (e) {}
    let value = a && b ? (savedAt(b) > savedAt(a) ? b : a) : a || b;
    if (value === null) throw new Error("key not found");
    if (value !== a) { try { await idbSet(key, value); } catch (e) {} } // first run after the switch: copy over
    return { key, value };
  },
  async set(key, value) {
    let ok = false;
    try { localStorage.setItem(key, value); ok = true; } catch (e) {} // may hit the 5 MB cap one day; IDB is primary
    try { await idbSet(key, value); ok = true; } catch (e) { if (!ok) throw e; }
    try { bc && bc.postMessage({ key }); } catch (e) {}
    return { key, value };
  },
  // Calls cb(rawValue) when another instance (tab, window, home-screen app) saved `key`.
  // May fire twice for one save (storage event + broadcast); the receiver dedupes by savedAt.
  subscribe(key, cb) {
    const onStorage = (e) => { if (e.key === key && e.newValue) cb(e.newValue); };
    const onMsg = (e) => {
      if (!e.data || e.data.key !== key) return;
      storage.get(key).then((r) => r && r.value && cb(r.value), () => {});
    };
    window.addEventListener("storage", onStorage);
    if (bc) bc.addEventListener("message", onMsg);
    return () => {
      window.removeEventListener("storage", onStorage);
      if (bc) bc.removeEventListener("message", onMsg);
    };
  },
  async delete(key) {
    try { localStorage.removeItem(key); } catch (e) {}
    try { const d = await db(); d.transaction(STORE, "readwrite").objectStore(STORE).delete(key); } catch (e) {}
    return { key, deleted: true };
  },
};

// Browser-level storage facts: whether the data is protected from eviction, and how much is used.
export async function storageStatus() {
  const out = { persisted: null, usage: null, quota: null };
  try { if (navigator.storage && navigator.storage.persisted) out.persisted = await navigator.storage.persisted(); } catch (e) {}
  try { if (navigator.storage && navigator.storage.estimate) { const e = await navigator.storage.estimate(); out.usage = e.usage; out.quota = e.quota; } } catch (e) {}
  return out;
}

export const canProtectStorage = () => !!(navigator.storage && navigator.storage.persist);

// Asks the browser not to evict the data. Returns whether it agreed; announces the change to the app.
export async function protectStorage() {
  let ok = false;
  try { if (canProtectStorage()) ok = await navigator.storage.persist(); } catch (e) {}
  window.dispatchEvent(new Event("kach-persist-changed"));
  return ok;
}

// A file shared to Кач from another app (see public/share-target-sw.js): returns it once as a File, or null.
export async function takeSharedFile() {
  try {
    if (!window.caches) return null;
    const cache = await caches.open("kach-share");
    const res = await cache.match("shared-file");
    if (!res) return null;
    await cache.delete("shared-file");
    const name = decodeURIComponent(res.headers.get("X-File-Name") || "file");
    return new File([await res.blob()], name, { type: res.headers.get("Content-Type") || "" });
  } catch (e) {
    return null;
  }
}
