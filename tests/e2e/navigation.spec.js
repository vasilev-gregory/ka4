// System back (browser history) closes the top screen instead of leaving the app.
import { test, expect } from "@playwright/test";
import { openApp, switchMode, stored, tab } from "./helpers.js";

test("back closes detail screens one by one, then stays in the app", async ({ page }) => {
  await openApp(page);
  await tab(page, "Замеры");
  await page.getByText("Новый замер").click();
  await expect(page.getByRole("button", { name: "Сохранить", exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByText("Новый замер")).toBeVisible();
  expect(page.url()).toContain("/ka4/");
});

test("program changes are saved as you go; back returns to the list", async ({ page }) => {
  await openApp(page);
  await page.getByText("I. Ноги и плечи", { exact: true }).click();
  await page.locator("input").first().fill("Переименована");
  await page.goBack();
  await expect(page.getByText("Переименована")).toBeVisible();
  await page.getByText("Переименована").click();
  await page.getByRole("button", { name: "Убрать" }).first().click();
  await page.getByText("Вернуть").click();
  await expect(page.getByRole("button", { name: "Убрать" })).toHaveCount(7);
});

test("system back folds a running stretch into the strip; it goes on and ends from there", async ({ page }) => {
  await page.clock.install();
  await openApp(page);
  await switchMode(page, "Растяжка");
  await page.getByRole("button", { name: "+ Новая программа" }).click();
  await page.getByText("Добавить растяжку").click();
  await page.getByText("Пицца").first().click();
  await page.getByRole("button", { name: "Добавить (1)" }).click();
  await page.getByRole("button", { name: "Начать" }).last().click();
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "+ круг" }).click(); // longer than the minute we wait
  await page.clock.runFor(65_000);
  await page.goBack();
  await expect(page.getByRole("button", { name: "Развернуть растяжку" })).toBeVisible(); // folded, not ended
  await expect(page.getByText("Таймер программы")).toBeVisible(); // the editor under it is still there
  await page.getByRole("button", { name: "Развернуть растяжку" }).click();
  await page.getByRole("button", { name: "Закрыть" }).first().click();
  await expect.poll(async () => (await stored(page)).stretch.sessions.length).toBe(1);
  expect((await stored(page)).stretch.sessions[0].complete).toBe(false);
  await page.goBack(); // the entry the player had is gone with it: back leaves the editor
  await expect(page.getByRole("button", { name: "+ Новая программа" })).toBeVisible();
});

test("closed by the system in the background, the app opens where it was left: the program, the picker, the picks", async ({ page, context }) => {
  await openApp(page);
  await page.getByText("I. Ноги и плечи", { exact: true }).click();
  await page.getByRole("button", { name: "Добавить упражнение" }).click();
  const picker = page.getByPlaceholder("Поиск по-русски или по-английски");
  await picker.fill("обратных разведений на заднюю дельту сидя в тренажере");
  await expect(page.getByText("Точно такого нет, ближе всего:")).toBeVisible();
  await page.getByText("Обратные разведения в тренажёре на заднюю дельту (пекдек)").click();
  await expect(page.getByRole("button", { name: "Добавить (1)" })).toBeVisible();

  // a messenger meanwhile, the system closes the app: it starts again in a fresh page
  const again = await context.newPage();
  await page.close();
  await again.goto("./");
  await expect(again.getByPlaceholder("Поиск по-русски или по-английски")).toHaveValue(/обратных разведений/);
  await again.getByRole("button", { name: "Добавить (1)" }).click();
  await expect(again.getByText("Обратные разведения в тренажёре на заднюю дельту (пекдек)")).toBeVisible(); // in the program
  await again.goBack(); // back walks the restored screens down to the list
  await expect(again.getByText("II. Грудь и спина", { exact: true })).toBeVisible();
});
