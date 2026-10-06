// Persistence: several instances, IndexedDB/localStorage, failed writes.
import { test, expect } from "@playwright/test";
import { KEY, openApp, stored } from "./helpers.js";

const idbGet = (page) => page.evaluate((k) => new Promise((r) => {
  const q = indexedDB.open("kach");
  q.onsuccess = () => { const g = q.result.transaction("kv").objectStore("kv").get(k); g.onsuccess = () => r(g.result || null); };
  q.onerror = () => r(null);
}), KEY);

test("a stale second instance doesn't overwrite newer data when it goes to background", async ({ context }) => {
  const a = await context.newPage(); await openApp(a);
  const b = await context.newPage(); await openApp(b);
  await b.getByText("+ Новая программа").click();
  await b.locator("input").first().fill("Моя программа"); // saved as you type
  await expect.poll(async () => (await stored(b)).programs.some((p) => p.name === "Моя программа")).toBe(true);
  await b.close({ runBeforeUnload: true });
  await a.evaluate(() => window.dispatchEvent(new Event("pagehide")));
  const c = await context.newPage(); await openApp(c);
  await expect(c.locator("input").first()).toHaveValue("Моя программа"); // opens where b was left: the program
  await c.goBack();
  await expect(c.getByText("Моя программа")).toBeVisible();
});

test("an old install with data only in localStorage is copied to IndexedDB", async ({ page }) => {
  await openApp(page);
  await page.evaluate(async (k) => {
    const d = JSON.parse(localStorage.getItem(k)); d.programs[0].name = "OLD-LS-DATA"; delete d.savedAt;
    localStorage.setItem(k, JSON.stringify(d));
    await new Promise((r) => { const q = indexedDB.deleteDatabase("kach"); q.onsuccess = q.onerror = q.onblocked = () => r(); });
  }, KEY);
  await page.reload();
  await expect(page.getByText("OLD-LS-DATA")).toBeVisible();
  await expect.poll(async () => (await idbGet(page) || "").includes("OLD-LS-DATA")).toBe(true);
  await expect(page.getByText("Отправь файл")).toHaveCount(0); // no backup nag without data
});

test("the newer copy wins: IndexedDB over a stale localStorage", async ({ page }) => {
  await openApp(page);
  await page.evaluate(async (k) => {
    const base = JSON.parse(localStorage.getItem(k));
    const withName = (name, savedAt) => { const d = structuredClone(base); d.programs[0].name = name; d.savedAt = savedAt; return JSON.stringify(d); };
    localStorage.setItem(k, withName("LS-OLD", 1));
    await new Promise((r) => {
      const q = indexedDB.open("kach");
      q.onsuccess = () => { const tx = q.result.transaction("kv", "readwrite"); tx.objectStore("kv").put(withName("IDB-NEW", 100), k); tx.oncomplete = r; };
    });
  }, KEY);
  await page.reload();
  await expect(page.getByText("IDB-NEW")).toBeVisible();
  await expect(page.getByText("LS-OLD")).toHaveCount(0);
});

test("another instance's save arriving before ours is written: both changes survive", async ({ page }) => {
  await openApp(page);
  await page.evaluate((k) => {
    const base = JSON.parse(localStorage.getItem(k));
    [...document.querySelectorAll("button")].find((x) => x.textContent.includes("Без программы")).click(); // local, not saved yet
    const other = { ...base, savedAt: Date.now() + 1000, programs: [...base.programs, { id: "remote", name: "REMOTE", items: [] }] };
    window.dispatchEvent(new StorageEvent("storage", { key: k, newValue: JSON.stringify(other) }));
  }, KEY);
  await expect(page.getByText("Идёт тренировка")).toBeVisible();
  await expect.poll(async () => {
    const d = await stored(page);
    return d.active !== null && d.programs.some((p) => p.name === "REMOTE");
  }).toBe(true);
});

test("a save that only reached IndexedDB (localStorage full) still reaches the other instance", async ({ context }) => {
  const a = await context.newPage(); await openApp(a);
  const b = await context.newPage(); await openApp(b);
  await b.evaluate(() => {
    const orig = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (k.startsWith("gymapp-state")) throw new DOMException("full", "QuotaExceededError");
      return orig.call(this, k, v);
    };
  });
  await b.getByText("Без программы").click();
  await expect(a.getByText("Идёт тренировка")).toBeVisible();
  await a.evaluate(() => window.dispatchEvent(new Event("pagehide")));
  await b.close(); await a.close();
  const c = await context.newPage(); await openApp(c);
  await expect(c.getByText("Идёт тренировка")).toBeVisible();
});

test("a failed write is retried once the storage works again", async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => {
    window.__ls = Storage.prototype.setItem; window.__put = IDBObjectStore.prototype.put;
    Storage.prototype.setItem = () => { throw new Error("broken"); };
    IDBObjectStore.prototype.put = () => { throw new Error("broken"); };
  });
  await page.getByText("Без программы").click();
  await expect(page.getByText("Изменения не сохраняются")).toBeVisible();
  await page.evaluate(() => {
    Storage.prototype.setItem = window.__ls; IDBObjectStore.prototype.put = window.__put;
    window.dispatchEvent(new Event("pagehide"));
  });
  await expect.poll(async () => (await stored(page)).active !== null).toBe(true);
});
