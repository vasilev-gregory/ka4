// Cardio inside a strength workout and as a program of its own; calories in the workout card and the history list.
import { test, expect } from "@playwright/test";
import { finishWorkout, openApp, seedStorage, stored, tab } from "./helpers.js";

test("a cardio-only program: no warm-up, the planned minutes as the hint, calories in the card and in history", async ({ page }) => {
  await openApp(page);
  await seedStorage(page, (d) => {
    d.settings.bodyWeight = "80";
    d.settings.gestureHintSeen = true;
    d.programs = [{ id: "c", name: "Эллипс", items: [{ exerciseId: "elliptical", sets: 1, min: 30 }] }];
  });
  await page.getByRole("button", { name: "Начать" }).click();
  await expect(page.getByText("Разминка")).toHaveCount(0); // a program of only cardio has no warm-up block
  await expect(page.getByText("мин", { exact: true })).toBeVisible();
  const [min, km] = await page.locator("input[inputmode=decimal]").all();
  await expect(min).toHaveAttribute("placeholder", "30");
  await km.fill("4,5");
  await page.getByRole("button", { name: "Подход сделан" }).click(); // the planned 30 minutes are taken
  await expect(page.getByText(/кардио 30 мин · 4,5 км/)).toBeVisible();
  await finishWorkout(page);

  await expect(page.getByText("≈200")).toBeVisible(); // 5 MET × 80 kg × 0,5 h
  await expect(page.getByText("кардио, 4,5 км")).toBeVisible();
  await expect(page.getByText("подходов")).toHaveCount(0);
  await page.goBack();
  await tab(page, "История");
  await expect(page.getByText(/кардио 30 мин · 4,5 км, ≈200 ккал/)).toHaveCount(2); // the workout row and the month summary
});

test("program editor: cardio is planned in minutes or km, not in sets", async ({ page }) => {
  await openApp(page);
  await page.getByText("I. Ноги и плечи").first().click();
  await page.getByRole("button", { name: "Добавить упражнение" }).click();
  await page.getByPlaceholder("Поиск по-русски или по-английски").fill("эллипс");
  await page.getByText("Эллипс").click();
  await page.getByRole("button", { name: /Добавить \(1\)/ }).click();
  await expect(page.getByText("20", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Минуты или километры" }).click();
  await expect(page.getByText("5", { exact: true })).toBeVisible();
  await expect.poll(async () => (await stored(page)).programs[0].items.at(-1)).toMatchObject({ exerciseId: "elliptical", sets: 1, km: 5 });
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

test("cardio stopwatch: ▶ times the set in ✓, ✓ stops it and writes the minutes", async ({ page }) => {
  await page.clock.install();
  await openApp(page);
  await seedStorage(page, (d) => {
    d.settings.gestureHintSeen = true;
    d.programs = [{ id: "c", name: "Эллипс", items: [{ exerciseId: "elliptical", sets: 1, min: 30 }] }];
  });
  await page.getByRole("button", { name: "Начать" }).click();
  await page.getByRole("button", { name: "Засечь время" }).click();
  await expect(page.getByRole("button", { name: "Засечь время" })).toHaveCount(0);
  await page.clock.runFor(90_000);
  await expect(page.getByRole("button", { name: "Подход сделан" })).toHaveText("1:30");
  await page.getByRole("button", { name: "Подход сделан" }).click();
  await expect(page.locator("input[inputmode=decimal]").first()).toHaveValue("1,5");
});
