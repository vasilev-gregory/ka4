// Cardio inside a strength workout and on its own; calories in the workout card and the history list.
import { test, expect } from "@playwright/test";
import { openApp, seedStorage, tab } from "./helpers.js";

test("a cardio-only workout: picker opens on cardio, minutes and km, calories in the card and in history", async ({ page }) => {
  await openApp(page);
  await seedStorage(page, (d) => { d.settings.bodyWeight = "80"; d.settings.gestureHintSeen = true; });
  await page.getByRole("button", { name: "Кардио", exact: true }).click();
  const picker = page.getByRole("heading", { name: "Добавить кардио" });
  await expect(picker).toBeVisible();
  await page.getByText("Эллипс").click();
  await page.getByRole("button", { name: /Добавить \(1\)/ }).click();
  await expect(page.getByText("Разминка")).toHaveCount(0); // no warm-up block in a cardio workout
  await expect(page.getByText("мин", { exact: true })).toBeVisible();
  const [min, km] = await page.locator("input[inputmode=decimal]").all();
  await min.fill("30");
  await km.fill("4,5");
  await page.getByRole("button", { name: "Подход сделан" }).click();
  await expect(page.getByText(/кардио 30 мин · 4,5 км/)).toBeVisible();
  await page.getByRole("button", { name: "Завершить" }).click();

  await expect(page.getByText("≈200")).toBeVisible(); // 5 MET × 80 kg × 0,5 h
  await expect(page.getByText("кардио, 4,5 км")).toBeVisible();
  await expect(page.getByText("подходов")).toHaveCount(0);
  await page.goBack();
  await tab(page, "История");
  await expect(page.getByText(/кардио 30 мин · 4,5 км, ≈200 ккал/)).toHaveCount(2); // the workout row and the month summary
});

test("cardio as part of a strength workout: «+ Кардио» next to adding exercises", async ({ page }) => {
  await openApp(page);
  await seedStorage(page, (d) => { d.settings.gestureHintSeen = true; });
  await page.getByText("Без программы").click();
  await page.getByRole("button", { name: "+ Кардио" }).click();
  await page.getByText("Гребной тренажёр").click();
  await page.getByRole("button", { name: /Добавить \(1\)/ }).click();
  await expect(page.getByText("Гребной тренажёр")).toBeVisible();
  await expect(page.getByText("Добавить отрезок")).toBeVisible();
  await expect(page.getByText("Разминка")).toBeVisible();
});
