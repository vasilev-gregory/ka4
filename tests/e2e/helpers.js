// Shared helpers for browser scenarios.
import { expect } from "@playwright/test";

export const KEY = "gymapp-state-v1";

// Opens the app with fresh storage and fails the test on any uncaught page error.
export async function openApp(page) {
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto("./");
  await expect(page.getByRole("button", { name: "Тренировка" }).last()).toBeVisible();
  // wait for the first save so localStorage holds the seed
  await expect.poll(() => page.evaluate((k) => !!localStorage.getItem(k), KEY)).toBe(true);
  return errors;
}

export const tab = (page, name) => page.getByRole("button", { name }).last().click();

export const stored = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);

// Changes the stored data with mutate(d) (runs in the page, so it can't use test variables), writes it
// to both copies (localStorage + IndexedDB) and reloads, as if it had been saved earlier.
export async function seedStorage(page, mutate) {
  await page.evaluate(async ([k, src]) => {
    const d = JSON.parse(localStorage.getItem(k));
    new Function(`return (${src})`)()(d);
    d.savedAt = Date.now(); // a real time: a later save from another instance must still win
    const raw = JSON.stringify(d);
    localStorage.setItem(k, raw);
    await new Promise((r) => {
      const q = indexedDB.open("kach");
      q.onsuccess = () => { const tx = q.result.transaction("kv", "readwrite"); tx.objectStore("kv").put(raw, k); tx.oncomplete = r; };
    });
  }, [KEY, mutate.toString()]);
  await page.reload();
  await expect(page.getByRole("button", { name: "Тренировка" }).last()).toBeVisible();
}

export async function switchMode(page, label) {
  await tab(page, "Настройки");
  await page.getByRole("button", { name: label, exact: true }).click();
  await tab(page, "Тренировка");
}

// Starts a workout from the n-th program and closes the help sheet that pops up on the first workout.
export async function startWorkout(page, n = 0) {
  await page.getByRole("button", { name: "Начать" }).nth(n).click();
  const help = page.getByRole("dialog", { name: "Как работать с подходами" });
  if (await help.waitFor({ timeout: 1500 }).then(() => true, () => false)) await help.getByRole("button", { name: "Понятно" }).click();
}
