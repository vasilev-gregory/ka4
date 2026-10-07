// Importing other apps' exports: from Settings, and as a file shared to Кач (Web Share Target).
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { openApp, stored, tab } from "./helpers.js";

const HEVY = "tests/fixtures/hevy-ru.csv";

test("Settings → load a Hevy export: preview, import adds workouts and keeps the existing ones", async ({ page }) => {
  await page.clock.setSystemTime(new Date(2026, 9, 5, 12)); // History shows the month of the fixtures' workouts
  await openApp(page);
  await tab(page, "Настройки");
  await page.getByText("Данные и приложение").click();
  await page.locator("input[type=file][accept*='.csv']").setInputFiles(HEVY);
  const sheet = page.getByRole("dialog", { name: "Импорт из Hevy" });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText(/Добавится 3 тренировки/)).toBeVisible();
  await sheet.getByRole("button", { name: "Импортировать" }).click();
  await expect(page.getByText("Добавлено 3 тренировки")).toBeVisible();
  await expect.poll(async () => (await stored(page)).workouts.length).toBe(3);

  // the same file again: nothing to add
  await page.locator("input[type=file][accept*='.csv']").setInputFiles(HEVY);
  await expect(sheet.getByText(/уже есть в истории/)).toBeVisible();
  await sheet.getByRole("button", { name: "Закрыть" }).click();
  await expect(sheet).toHaveCount(0);
  // the closed sheet drops its history entry right after; a sheet opened before that would be closed by it
  await expect.poll(() => page.evaluate(() => history.state && history.state.overlay)).toBeFalsy();

  // GymKeeper on top: added as well, Hevy's workouts stay
  await page.locator("input[type=file][accept*='.csv']").setInputFiles("tests/fixtures/gymkeeper.csv");
  const gk = page.getByRole("dialog", { name: "Импорт из GymKeeper" });
  await expect(gk.getByText(/Добавится 2 тренировки/)).toBeVisible();
  await expect(gk.getByText("Замеров: 2.")).toBeVisible();
  await gk.getByRole("button", { name: "Импортировать" }).click();
  await expect.poll(async () => (await stored(page)).workouts.length).toBe(5);

  await tab(page, "История");
  await expect(page.getByText("Ноги-плечи1").first()).toBeVisible();
});

test.describe("shared from another app", () => {
  test.use({ serviceWorkers: "allow" });

  test("a file shared to Кач opens the import sheet", async ({ page }) => {
    await page.goto("./");
    // the app reloads itself once the new service worker takes over (main.jsx); wait until it controls the page
    await expect.poll(async () => {
      await page.waitForLoadState();
      return page.evaluate(() => !!navigator.serviceWorker.controller).catch(() => false);
    }, { timeout: 15000 }).toBe(true);
    // what Android does when Кач is picked in the share sheet: POST the file to the share target
    const csv = readFileSync(HEVY, "utf8");
    // the takeover reload may still land after the controller shows up: a step it interrupts is simply tried again
    await expect(async () => {
      await page.waitForLoadState();
      const landed = await page.evaluate(async (text) => {
        const form = new FormData();
        form.append("file", new File([text], "workout_data.csv", { type: "text/csv" }));
        const res = await fetch("share-target", { method: "POST", body: form });
        return res.url;
      }, csv);
      expect(landed).toContain("?shared=1");
    }).toPass({ timeout: 15000 });
    await page.goto("./?shared=1");
    await expect(page.getByRole("dialog", { name: "Импорт из Hevy" })).toBeVisible();
    expect(page.url()).not.toContain("shared"); // a reload won't import again
  });
});
