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

test("leaving a program with unsaved changes asks first", async ({ page }) => {
  await openApp(page);
  await page.getByText("I. Ноги и плечи", { exact: true }).click();
  await page.locator("input").first().fill("Переименована");
  await page.goBack();
  await expect(page.getByText("Есть несохранённые изменения")).toBeVisible();
  await page.getByRole("button", { name: "Не сохранять" }).click();
  await expect(page.getByText("+ Новая программа")).toBeVisible();
  await expect(page.getByText("I. Ноги и плечи", { exact: true })).toBeVisible();
  // and the history is in step: one more back doesn't reopen anything
  await page.getByText("II. Грудь и спина").click();
  await page.goBack();
  await expect(page.getByText("+ Новая программа")).toBeVisible();
});

test("a stretching run left with system back after a minute is saved", async ({ page }) => {
  await page.clock.install();
  await openApp(page);
  await switchMode(page, "Растяжка");
  await page.getByText("+ Новая программа растяжки").click();
  await page.getByText("Добавить растяжку").click();
  await page.getByText("Пицца").first().click();
  await page.getByRole("button", { name: "Добавить (1)" }).click();
  await page.getByRole("button", { name: "Начать" }).last().click();
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "+ круг" }).click(); // longer than the minute we wait
  await page.clock.runFor(65_000);
  await page.goBack();
  await expect(page.getByText("Таймер программы")).toBeVisible(); // back in the editor
  await expect.poll(async () => (await stored(page)).stretch.sessions.length).toBe(1);
  expect((await stored(page)).stretch.sessions[0].complete).toBe(false);
});
