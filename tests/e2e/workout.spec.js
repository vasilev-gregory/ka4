// Strength workout: swipes on set rows, weekly panel, body weight from measurements.
import { test, expect } from "@playwright/test";
import { openApp, seedStorage, startWorkout, stored, tab } from "./helpers.js";

test("swipe right marks a set done, swipe left deletes it with undo", async ({ page, context }) => {
  const errors = await openApp(page);
  await startWorkout(page);
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

  await page.getByRole("button", { name: "Удалить", exact: true }).click();
  await page.getByRole("button", { name: "Удалить тренировку?" }).click();
  await expect(page.getByText("+ Новая программа")).toBeVisible();
  expect(errors).toEqual([]);
});

test("finished workout shows the weekly panel; stretch mode hides strength settings", async ({ page }) => {
  await openApp(page);
  await startWorkout(page);
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

test("hints, last time's values, numbers only, records, undo of a swipe mark, progress in the summary", async ({ page, context }) => {
  await openApp(page);
  await seedStorage(page, (d) => {
    d.workouts.push({ id: "old", programId: d.programs[0].id, name: "I", startedAt: Date.now() - 3 * 864e5, finishedAt: Date.now() - 3 * 864e5 + 3600e3,
      exercises: [{ exerciseId: "squat", sets: [{ w: "100", r: "5", p: "", done: true }] }] });
  });
  await page.getByRole("button", { name: "Начать" }).first().click();
  // the help sheet pops up on the first workout, explains RIR, and comes back from «?»
  const help = page.getByRole("dialog", { name: "Как работать с подходами" });
  await expect(help).toBeVisible();
  await expect(help.getByText("RIR — повторы в запасе")).toBeVisible();
  await expect(help.getByText(/нижней панели/)).toHaveCount(0);
  await page.getByRole("button", { name: "Понятно" }).click();
  await expect(help).toHaveCount(0);
  await page.getByRole("button", { name: "Как работать с подходами" }).click();
  await expect(help).toBeVisible();
  await page.mouse.click(10, 10); // a tap outside closes it
  await expect(help).toHaveCount(0);

  const weight = page.locator("input[inputmode=decimal]").first();
  await weight.focus();
  await expect(weight).toHaveValue("100"); // last time's value taken on focus
  await weight.pressSequentially("10x5,5.y"); // replaces the selection; letters and a second separator are dropped
  await expect(weight).toHaveValue("105,5");
  await page.getByRole("button", { name: "Подход сделан" }).first().click();
  await expect(page.getByLabel("Рекорд")).toHaveCount(1);

  // swipe right on the second set marks it; "Вернуть" takes it back
  const cdp = await context.newCDPSession(page);
  const box = await page.getByRole("button", { name: "Подход сделан" }).nth(1).boundingBox();
  const x = box.x - 120, y = box.y + box.height / 2;
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  for (let k = 1; k <= 12; k++) { await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + (140 * k) / 12, y }] }); await page.waitForTimeout(15); }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(page.getByText("Подход отмечен")).toBeVisible();
  await page.getByText("Вернуть").click();
  await expect(page.locator("button[aria-label='Подход сделан'].bg-accent-400")).toHaveCount(1);

  await page.getByRole("button", { name: "Завершить" }).click();
  const keep = page.getByText("Оставить программу как была");
  if (await keep.count()) await keep.click();
  await expect(page.getByText("рекорд", { exact: true })).toBeVisible();
  await expect(page.getByText(/^объём, [+−]\d+%$/)).toBeVisible();
});
