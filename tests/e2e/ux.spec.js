// UX rules that span screens: a stretch opens its card everywhere, finishing asks about unticked sets, an empty new
// program isn't left behind, a measurement needs a value and asks before dropping edits, one stretching run at a time.
import { test, expect } from "@playwright/test";
import { openApp, seedStorage, startWorkout, stored, switchMode, tab } from "./helpers.js";

test("a stretch in a run's card opens the stretch's card with its history", async ({ page }) => {
  await openApp(page);
  await seedStorage(page, (d) => {
    const t = Date.now() - 3600e3;
    d.stretch.sessions = [{ id: "s1", programId: null, name: "Утро", startedAt: t, finishedAt: t + 600e3, complete: true, work: { "st-pizza": 120 } }];
  });
  await switchMode(page, "Растяжка");
  await tab(page, "История");
  await page.getByText("Утро").click();
  await page.getByRole("button", { name: /Пицца: сед ноги врозь/ }).click();
  await expect(page.getByText("удержание всего, на сторону")).toBeVisible();
  await expect(page.getByText("Утро · удержание 2:00")).toBeVisible();
});

test("finishing with unticked sets asks first; an empty new program is dropped on leaving", async ({ page }) => {
  await openApp(page);
  await startWorkout(page);
  await page.getByRole("button", { name: "Подход сделан" }).first().click();
  await page.getByRole("button", { name: "Завершить" }).first().click();
  const ask = page.getByRole("dialog", { name: "Завершить тренировку?" });
  await expect(ask).toContainText(/Не отмечено \d+ подход/);
  await ask.getByRole("button", { name: "Продолжить тренировку" }).click();
  await expect(ask).toHaveCount(0);
  await expect.poll(async () => !!(await stored(page)).active).toBe(true);
  await page.getByRole("button", { name: "Отменить", exact: true }).click();
  await page.getByRole("button", { name: "Не сохранять?" }).click();

  const before = (await stored(page)).programs.length;
  await page.getByRole("button", { name: "+ Новая программа" }).click();
  await page.goBack();
  await expect.poll(async () => (await stored(page)).programs.length).toBe(before);
});

test("a measurement needs a value; leaving with edits asks", async ({ page }) => {
  await openApp(page);
  await tab(page, "Замеры");
  await page.getByText("Новый замер").click();
  await expect(page.getByRole("button", { name: "Сохранить", exact: true })).toBeDisabled();
  await page.locator("input[inputmode=decimal]").first().fill("80");
  await page.getByRole("button", { name: "Назад" }).first().click();
  const ask = page.getByRole("dialog", { name: "Сохранить изменения?" });
  await ask.getByRole("button", { name: "Сохранить" }).click();
  await expect.poll(async () => (await stored(page)).measurements.length).toBe(1);
});

test("while a stretching run goes on, only its program's ▶ works (it goes back to it)", async ({ page }) => {
  await openApp(page);
  await seedStorage(page, (d) => {
    const prog = (id, name) => ({ id, name, timing: { prep: 10, work: 30, sw: 5, rest: 15, rounds: 1, roundRest: 60, mode: "circuit" }, items: [{ exerciseId: "st-pizza" }] });
    d.stretch.programs = [prog("a", "Утро"), prog("b", "Вечер")];
  });
  await switchMode(page, "Растяжка");
  await page.getByRole("button", { name: "Начать" }).first().click();
  await page.getByRole("button", { name: "Свернуть" }).click();
  await expect(page.getByText("идёт")).toBeVisible();
  await expect(page.getByRole("button", { name: "Начать" })).toBeDisabled(); // the other program's ▶
  await page.getByRole("button", { name: "Вернуться" }).click();
  await expect(page.getByRole("button", { name: "Свернуть" })).toBeVisible();
});

test("a workout going on is always in sight and blocks stretching; its strip leads back", async ({ page }) => {
  await openApp(page);
  await startWorkout(page);
  await tab(page, "История");
  const strip = page.getByRole("button", { name: "Вернуться к тренировке" });
  await expect(strip).toContainText("Тренировка");
  await switchMode(page, "Растяжка");
  await expect(page.getByText("Идёт силовая тренировка — сначала заверши её")).toBeVisible();
  await expect(page.getByRole("button", { name: "Без программы" })).toBeDisabled();
  await strip.click(); // back to strength, on the workout
  await expect(page.getByRole("button", { name: "Завершить" }).first()).toBeVisible();
  await expect(strip).toHaveCount(0);
});
