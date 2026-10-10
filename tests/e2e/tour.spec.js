// The first-launch tour: once on a fresh install, step by step over the tabs, again from Settings.
import { test, expect } from "@playwright/test";
import { stored, tab } from "./helpers.js";

test("a fresh install opens the tour; it walks the tabs, ends, and comes back from Settings", async ({ page }) => {
  await page.goto("./");
  const tour = page.getByRole("dialog", { name: "Обзор Кача" });
  await expect(tour.getByText("Привет! Это Кач")).toBeVisible();
  await tour.getByRole("button", { name: "Дальше" }).click();
  await expect(tour.getByText("Здесь твои программы")).toBeVisible();
  await tour.getByRole("button", { name: "Дальше" }).click();
  // each card opens its tab behind
  await expect(page.getByRole("button", { name: "История" }).last()).toHaveAttribute("aria-current", "page");
  await tour.getByRole("button", { name: "Назад" }).click();
  await expect(page.getByRole("button", { name: "Тренировка" }).last()).toHaveAttribute("aria-current", "page");
  for (let i = 0; i < 4; i++) await tour.getByRole("button", { name: "Дальше" }).click();
  await expect(tour.getByText("Раз в неделю отправляй себе копию")).toBeVisible();
  await tour.getByRole("button", { name: "Поехали" }).click();
  await expect(tour).toHaveCount(0);
  await expect.poll(async () => (await stored(page))?.settings.tourDone).toBe(true);
  await page.reload();
  await expect(page.getByRole("button", { name: "Тренировка" }).last()).toBeVisible();
  await expect(tour).toHaveCount(0); // once

  await tab(page, "Настройки");
  await page.getByRole("button", { name: "Как пользоваться — обзор" }).click();
  await expect(tour.getByText("Привет! Это Кач")).toBeVisible();
  await tour.getByRole("button", { name: "Пропустить" }).click();
  await expect(tour).toHaveCount(0);
});
