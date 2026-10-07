// Strength workout: swipes on set rows, weekly panel, body weight from measurements.
import { test, expect } from "@playwright/test";
import { finishWorkout, openApp, seedStorage, startWorkout, stored, tab } from "./helpers.js";

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

  await page.getByRole("button", { name: "Отменить", exact: true }).click();
  await page.getByRole("button", { name: "Не сохранять?" }).click();
  await expect(page.getByText("+ Новая программа")).toBeVisible();
  expect(errors).toEqual([]);
});

test("finished workout shows its muscles and its week; stretch mode hides strength settings", async ({ page }) => {
  await openApp(page);
  await startWorkout(page);
  await page.getByRole("button", { name: "Подход сделан" }).first().click();
  await finishWorkout(page);
  const keep = page.getByText("Оставить программу как была");
  if (await keep.count()) await keep.click();
  // the workout's own muscles first: one squat set, quads its main muscle; judged on the per-session scale
  await expect(page.getByRole("img", { name: "Спереди" })).toBeVisible();
  await expect(page.getByRole("button", { name: /квадрицепс.*1 подх\. мало/ })).toBeVisible();
  await expect(page.getByText("до нормы на тренировку ещё 5,5 подх. (норма 6,5–11)")).toBeVisible();
  await page.getByRole("button", { name: "Неделя", exact: true }).click();
  await expect(page.getByRole("button", { name: /квадрицепс.*мало/ })).toBeVisible();
  await expect(page.getByText("ещё 3 подх. до роста")).toBeVisible();
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
  await expect.poll(() => weight.evaluate((el) => el.selectionEnd - el.selectionStart)).toBe(3); // selected on the next frame
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

  await finishWorkout(page);
  const keep = page.getByText("Оставить программу как была");
  if (await keep.count()) await keep.click();
  await expect(page.getByText("рекорд", { exact: true })).toBeVisible();
  await expect(page.getByText(/^объём, [+−]\d+%$/)).toBeVisible();
});

test("warm-up first, then the rest before the first set; swipe an exercise away and back", async ({ page, context }) => {
  await openApp(page);
  await startWorkout(page);
  await expect(page.getByText("Закончил разминку")).toBeVisible();
  await page.getByText("Закончил разминку").click();
  await expect(page.getByText("Закончил разминку")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Хватит" })).toBeVisible(); // rest countdown started
  await expect.poll(async () => (await stored(page)).active?.warmup?.doneAt || 0).toBeGreaterThan(0);

  const titles = () => page.locator("button.ml-2.min-w-0 > div.font-semibold");
  const first = await titles().first().innerText();
  const cdp = await context.newCDPSession(page);
  const swipeTitle = async (dx) => {
    const box = await titles().first().boundingBox();
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    for (let k = 1; k <= 12; k++) { await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + (dx * k) / 12, y }] }); await page.waitForTimeout(15); }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  };
  await swipeTitle(-140);
  await expect(page.getByText("Упражнение убрано")).toBeVisible();
  expect(await titles().first().innerText()).not.toBe(first);
  await page.getByText("Вернуть").click();
  await expect(titles().first()).toHaveText(first);
  await swipeTitle(140);
  await expect(page.getByText("Заменить упражнение")).toBeVisible();
});

test("a bad day: finished «не в зачёт», marked in history, switched back in its card", async ({ page }) => {
  await openApp(page);
  await startWorkout(page);
  await page.locator("input[inputmode=decimal]").first().fill("60");
  await page.locator("input[inputmode=numeric]").first().fill("5");
  await page.getByRole("button", { name: "Подход сделан" }).first().click();
  await page.getByRole("button", { name: "Завершить" }).last().click();
  await page.getByRole("dialog", { name: "Завершить тренировку?" }).getByRole("button", { name: /Плохой день/ }).click();
  const off = page.getByRole("button", { name: /Не в зачёт/ });
  await expect(off).toBeVisible(); // the workout's card opens
  await expect(page.getByText("Всё равно не зря")).toBeVisible(); // what it still gave
  await expect(page.getByText(/1 тяжёлый подход/)).toBeVisible();
  await expect.poll(async () => (await stored(page)).workouts[0]?.off).toBe(true);
  await page.goBack();
  await tab(page, "История");
  await expect(page.getByText(/не в зачёт/)).toBeVisible();
  await page.getByText(/не в зачёт/).click();
  await off.click();
  await expect.poll(async () => (await stored(page)).workouts[0]?.off).toBeUndefined();
});

test("an exercise done the same three times gets a next step: a note and the step in the hints", async ({ page }) => {
  await openApp(page);
  await seedStorage(page, (d) => {
    d.workouts = [1, 2, 3].map((k) => {
      const t = Date.now() - k * 3 * 864e5;
      return { id: "w" + k, programId: null, name: "Ноги", startedAt: t, finishedAt: t + 3600e3, segments: [{ start: t, end: t + 3600e3 }],
        exercises: [{ exerciseId: "squat", sets: [8, 8, 8].map((r) => ({ w: "100", r: String(r), p: "", done: true })) }] };
    }).reverse();
  });
  await startWorkout(page);
  await expect(page.getByTestId("progress-step").first()).toHaveText(/3 тренировки подряд 100 кг × 8 — сегодня 100 кг × 9/);
  await expect(page.locator("input[inputmode=numeric][placeholder='9']").first()).toBeVisible();
});

test("rest: stays past its end with the overtime, hides, comes back; a typed value is selected on focus", async ({ page }) => {
  await page.clock.install();
  await openApp(page);
  await startWorkout(page);
  const weight = page.locator("input[inputmode=decimal]").first();
  await weight.fill("60");
  await page.locator("input[inputmode=numeric]").first().fill("5");
  await page.getByRole("button", { name: "Подход сделан" }).first().click();
  await expect(page.getByRole("button", { name: "Хватит" })).toBeVisible();
  await page.clock.runFor(125e3); // 2:00 rest + 5 s
  await expect(page.getByText(/^\+0:0[45]$/)).toBeVisible(); // past the end: still there, counting the overtime
  await page.getByRole("button", { name: "Скрыть" }).click();
  await page.getByRole("button", { name: "Таймер отдыха" }).click();
  await expect(page.getByRole("button", { name: "Скрыть" })).toBeVisible();

  await weight.focus(); // editing the weight: the old one is selected, typing replaces it
  await expect.poll(() => weight.evaluate((el) => el.selectionEnd - el.selectionStart)).toBe(2);
  await weight.pressSequentially("65");
  await expect(weight).toHaveValue("65");
});

test("«Итог сейчас»: the running workout's card without finishing it — muscles live, the text, back to the workout", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await openApp(page);
  await startWorkout(page);
  for (let i = 0; i < 2; i++) {
    await page.locator("input[inputmode=decimal]").nth(i).fill("60");
    await page.locator("input[inputmode=numeric]").nth(i).fill("5");
    await page.getByRole("button", { name: "Подход сделан" }).nth(i).click();
  }
  await page.getByRole("button", { name: "Итог сейчас" }).click();
  await expect(page.getByText("I. Ноги и плечи · итог сейчас")).toBeVisible();
  await expect(page.getByRole("button", { name: /квадрицепс.*2 подх\..*мало/ })).toBeVisible();
  await expect(page.getByText("до нормы на тренировку ещё 4,5 подх. (норма 6,5–11)")).toBeVisible();
  await expect(page.getByText("Удалить тренировку")).toHaveCount(0); // it isn't finished: nothing to delete
  await page.getByRole("button", { name: "Скопировать текстом" }).click();
  await expect(page.getByRole("button", { name: "Скопировано" })).toBeVisible();
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toMatch(/Тренировка «I\. Ноги и плечи» — .* \(идёт\)/);
  expect(text).toMatch(/1\) 60 кг × 5 · \d\d:\d\d/);
  await page.goBack();
  await expect(page.getByRole("button", { name: "Итог сейчас" })).toBeVisible(); // still running
  expect((await stored(page)).active).not.toBeNull();
});

test("a reload in the middle of a workout (a new version) loses nothing: ticked sets are saved on finishing", async ({ page }) => {
  await openApp(page);
  await startWorkout(page);
  for (let i = 0; i < 2; i++) {
    await page.locator("input[inputmode=decimal]").nth(i).fill(String(60 + i * 10));
    await page.locator("input[inputmode=numeric]").nth(i).fill("5");
    await page.getByRole("button", { name: "Подход сделан" }).nth(i).click();
  }
  await page.reload();
  await expect(page.locator("button[aria-label='Подход сделан'].bg-accent-400")).toHaveCount(2);
  await page.getByRole("button", { name: "Завершить" }).last().click();
  await page.getByRole("dialog", { name: "Завершить тренировку?" }).getByRole("button", { name: "Завершить", exact: true }).click();
  const keep = page.getByText("Оставить программу как была");
  if (await keep.count()) await keep.click();
  await expect.poll(async () => (await stored(page)).workouts[0]?.exercises[0].sets.map((s) => s.w)).toEqual(["60", "70"]);
});
