// Strength workout: swipes on set rows, weekly panel, body weight from measurements.
import { test, expect } from "@playwright/test";
import { openApp, tab, stored } from "./helpers.js";

test("swipe right marks a set done, swipe left deletes it with undo", async ({ page, context }) => {
  const errors = await openApp(page);
  await page.getByRole("button", { name: "Начать" }).first().click();
  const checks = page.getByRole("button", { name: "Подход сделан" });
  const cdp = await context.newCDPSession(page);
  const swipe = async (i, dx) => {
    const box = await checks.nth(i).boundingBox();
    const x = box.x - 120, y = box.y + box.height / 2;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    for (let k = 1; k <= 12; k++) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + (dx * k) / 12, y }] });
      await page.waitForTimeout(15);
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  };
  const n0 = await checks.count();
  await swipe(0, 140);
  await expect(page.locator("button[aria-label='Подход сделан'].bg-accent-400")).toHaveCount(1);
  await swipe(1, -140);
  await expect(checks).toHaveCount(n0 - 1);
  await page.getByText("Вернуть").click();
  await expect(checks).toHaveCount(n0);

  await page.getByRole("button", { name: "Отменить" }).click();
  await page.getByRole("button", { name: "Удалить тренировку?" }).click();
  await expect(page.getByText("+ Новая программа")).toBeVisible();
  expect(errors).toEqual([]);
});

test("finished workout shows the weekly panel; stretch mode hides strength settings", async ({ page }) => {
  await openApp(page);
  await page.getByRole("button", { name: "Начать" }).first().click();
  await page.getByRole("button", { name: "Подход сделан" }).first().click();
  await page.getByRole("button", { name: "Завершить" }).click();
  const keep = page.getByText("Оставить программу как была");
  if (await keep.count()) await keep.click();
  await expect(page.getByText("Неделя по группам")).toBeVisible();
  await expect.poll(async () => (await stored(page)).workouts.length).toBe(1);
  expect((await stored(page)).active).toBeNull();

  await tab(page, "Настройки");
  await page.getByRole("button", { name: "Растяжка", exact: true }).click();
  await expect(page.getByText("Звук таймера")).toBeVisible();
  await expect(page.getByText("Колонки подхода")).toHaveCount(0);
  await expect(page.getByText("Вес тела")).toHaveCount(0);
});

test("body weight in settings comes from the latest measurement", async ({ page }) => {
  await openApp(page);
  for (const w of ["70", "85"]) {
    await tab(page, "Замеры");
    await page.getByText("Новый замер").click();
    await page.locator("input[inputmode=decimal]").first().fill(w);
    await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  }
  await tab(page, "Настройки");
  await expect(page.getByText("85 кг")).toBeVisible();
});
