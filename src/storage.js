// App data lives in IndexedDB (large quota, can be marked persistent) and is mirrored to
// localStorage (synchronous, survives an interrupted async write on close; also fires the
// cross-tab "storage" event). On read, whichever copy is newer wins (by savedAt inside the JSON).
const DB = "kach", STORE = "kv";
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
    return { key, value };
  },
  async delete(key) {
    try { localStorage.removeItem(key); } catch (e) {}
    try { const d = await db(); d.transaction(STORE, "readwrite").objectStore(STORE).delete(key); } catch (e) {}
    return { key, deleted: true };
  },
};
