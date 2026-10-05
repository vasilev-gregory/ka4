// Clicks through every main screen and fails on JS errors.
import { test, expect } from "@playwright/test";
import { openApp, startWorkout, switchMode, tab } from "./helpers.js";

test("every screen renders, strength and stretching", async ({ page }) => {
  const errors = await openApp(page);
  for (const name of ["История", "Замеры", "Настройки", "Тренировка"]) {
    await tab(page, name);
    await expect(page.locator("body")).not.toBeEmpty();
  }
  await tab(page, "Замеры");
  await page.getByText("Новый замер").click();
  await expect(page.getByRole("button", { name: "Сохранить", exact: true })).toBeVisible();

  await tab(page, "Тренировка");
  await startWorkout(page);
  await page.getByRole("button", { name: "Подход сделан" }).first().click();
  await page.getByText("Добавить упражнение").first().click();
  await page.getByText("Pull up").first().click();
  await page.getByText("Dips").first().click();
  await page.getByRole("button", { name: "Добавить (2)" }).click();
  await expect(page.getByText("Pull up").first()).toBeVisible();

  await page.getByText("Squat").first().click();
  await page.getByRole("button", { name: "Изменить" }).click();
  await page.locator("input[type=file][accept='image/*']").first().setInputFiles("tests/e2e/fixtures/photo.jpg");
  await expect(page.locator("img[src^='data:image/jpeg']").first()).toBeVisible();
  await page.getByRole("button", { name: "Назад" }).click();

  await page.getByRole("button", { name: "Пауза" }).click();
  await page.getByRole("button", { name: "Завершить" }).click();
  const keep = page.getByText("Оставить программу как была");
  if (await keep.count()) await keep.click();
  await tab(page, "История");
  await expect(page.getByText("I. Ноги и плечи").first()).toBeVisible();

  await switchMode(page, "Растяжка");
  await page.getByText("+ Новая программа растяжки").click();
  await page.getByText("Добавить растяжку").click();
  await page.getByText("Четвёрка").first().click();
  await page.getByText("Пицца").first().click();
  await page.getByRole("button", { name: "Добавить (2)" }).click();
  await page.getByText("Четвёрка").first().click(); // per-stretch overrides
  await page.getByRole("button", { name: "Начать" }).last().click();
  await page.getByRole("button", { name: "Пропустить" }).click();
  await page.getByRole("button", { name: "Пауза" }).click();
  await page.getByRole("button", { name: "Закрыть" }).first().click();
  await tab(page, "История");

  await switchMode(page, "Сила");
  await tab(page, "Настройки");
  await page.getByText("сначала русские").click();
  await tab(page, "Тренировка");
  await startWorkout(page);
  await expect(page.getByText("Приседания со штангой").first()).toBeVisible();
  expect(errors).toEqual([]);
});
