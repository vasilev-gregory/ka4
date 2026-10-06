// Stretch player: ±5 s is saved on the stretch, "+ круг" extends the run, settings open over the player,
// phases advance on their own and the run ends with the weekly panel; minutes per area in history and the editor.
import { test, expect } from "@playwright/test";
import { openApp, seedStorage, switchMode, stored, tab } from "./helpers.js";

async function newProgram(page, names) {
  await page.getByText("+ Новая программа растяжки").click();
  return async () => {
    await page.getByText("Добавить растяжку").click();
    for (const n of names) await page.getByText(n).first().click();
    await page.getByRole("button", { name: `Добавить (${names.length})` }).click();
  };
}

test("±5, + round and the settings overlay", async ({ page }) => {
  const errors = await openApp(page);
  await switchMode(page, "Растяжка");
  await (await newProgram(page, ["Пицца"]))();
  await page.getByRole("button", { name: "Начать" }).last().click();
  const total = page.locator("text=/^\\d+ \\/ \\d+$/").first();
  const before = Number((await total.innerText()).split(" / ")[1]);
  await page.getByRole("button", { name: "Пропустить" }).click(); // -> work phase
  await page.getByRole("button", { name: "+5" }).click();
  await expect(page.locator("div.text-8xl").first()).toHaveText(/^0:3[45]$/);
  await page.getByRole("button", { name: "+ круг" }).click();
  await expect.poll(async () => Number((await total.innerText()).split(" / ")[1])).toBeGreaterThan(before);
  await page.getByRole("button", { name: "Настройки" }).first().click();
  await expect(page.getByText("Звук таймера")).toBeVisible();
  await page.getByRole("button", { name: "Назад" }).first().click();
  await expect(page.locator("div.text-8xl")).toHaveCount(1); // the run survived
  await page.getByRole("button", { name: "Закрыть" }).first().click();
  await expect(page.getByText("35 с").first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("phases run out on their own and the run is saved", async ({ page }) => {
  await page.clock.install();
  const errors = await openApp(page);
  await switchMode(page, "Растяжка");
  const addStretches = await newProgram(page, ["Четвёрка"]);
  await page.getByText("Таймер программы").click(); // collapsed by default
  // program timer: prep 10->0, work 30->5, switch 5->0, rest 15->0 (the minus buttons, in order)
  const minus = (i) => page.locator("div.rounded-lg.bg-neutral-800 > button:first-child").nth(i);
  for (const [i, n] of [[0, 2], [1, 5], [2, 1], [3, 3]]) for (let k = 0; k < n; k++) await minus(i).click();
  await addStretches();
  await page.getByRole("button", { name: "Начать" }).last().click();
  await page.clock.runFor(15_000); // two sides × 5 s
  await expect(page.getByText("Готово")).toBeVisible();
  await expect(page.getByText("ягодицы").first()).toBeVisible();
  await page.getByRole("button", { name: "Закрыть" }).last().click();
  const d = await stored(page);
  expect(d.stretch.sessions).toHaveLength(1);
  expect(d.stretch.sessions[0].complete).toBe(true);
  expect(Object.values(d.stretch.sessions[0].work)[0]).toBe(5);
  expect(errors).toEqual([]);
});

test("stretching uses the same body map: history by week / month, what made up an area, the plan in the editor", async ({ page }) => {
  await page.clock.setSystemTime(new Date(2026, 9, 7, 12)); // Wed 7 Oct 2026
  await openApp(page);
  await seedStorage(page, (d) => {
    const t = new Date(2026, 9, 6, 8).getTime();
    d.stretch.sessions = [{ id: "s1", programId: null, name: "Утро", startedAt: t, finishedAt: t + 600e3, complete: true,
      work: { "st-hip-flexor-forward": 240, "st-pizza": 120 } }];
    d.stretch.programs = [{ id: "p1", name: "Бёдра", timing: { prep: 0, work: 30, sw: 5, rest: 10, rounds: 2, roundRest: 0, mode: "circuit" },
      items: [{ exerciseId: "st-lat" }] }];
  });
  await switchMode(page, "Растяжка");
  await tab(page, "История");
  await page.getByRole("button", { name: "Неделя", exact: true }).click();
  await expect(page.getByText("дней с растяжкой: 1 из 5")).toBeVisible();
  const front = page.getByRole("img", { name: "Спереди" });
  await expect(front.locator('[data-muscle="hipflex"]')).toHaveCount(2); // the groin and the inner thigh are parts here
  await expect(front.locator('[data-muscle="adductors"]')).toHaveCount(2);
  await expect(page.getByRole("button", { name: /сгибатели бедра.*4:00 · 1 дн\..*мало/ })).toBeVisible();
  await expect(page.getByText("до минимума ещё 1:00")).toBeVisible();
  await front.locator('[data-muscle="adductors"]').first().click();
  await expect(page.getByText("приводящие: 2:00 · 1 дн. — мало")).toBeVisible();
  await expect(page.getByTestId("muscle-exercises").getByText("Пицца: сед ноги врозь, наклон вперёд")).toBeVisible();

  await page.getByRole("button", { name: "Месяц" }).click();
  await expect(page.getByText("1 растяжка, 10:00")).toBeVisible();
  await expect(page.getByText("в среднем за неделю")).toBeVisible();
  await expect(page.getByText("Утро")).toBeVisible();

  await tab(page, "Тренировка");
  await page.getByText("Бёдра").click();
  await expect(page.getByText("Мышцы по плану")).toBeVisible();
  await expect(page.getByRole("button", { name: /широчайшие.*1:00$/ })).toBeVisible(); // 2 rounds × 30 s, one side counted
});
