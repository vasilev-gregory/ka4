// Splits: the active split's programs first with this week's marks and the next one; making and editing a split.
import { test, expect } from "@playwright/test";
import { finishWorkout, openApp, startWorkout } from "./helpers.js";

test("the active split marks this week's workouts and points at the next program", async ({ page }) => {
  await openApp(page);
  await expect(page.getByText("Сплит «Неделя I–IV» · 0 из 4 на этой неделе")).toBeVisible();
  // the split's programs in a frame of their own; a program not in it below, under «Другие программы»
  await expect(page.getByTestId("program-group").getByRole("button", { name: "Начать" })).toHaveCount(4);
  await expect(page.getByText("Другие программы")).toHaveCount(0); // all four are in the split
  await expect(page.getByText("следующая по сплиту")).toHaveCount(1);
  await expect(page.getByRole("button", { name: /^I\. Ноги и плечи.*следующая по сплиту/ })).toBeVisible();
  await startWorkout(page);
  await page.getByRole("button", { name: "Подход сделан" }).first().click();
  await finishWorkout(page);
  const keep = page.getByText("Оставить программу как была");
  if (await keep.count()) await keep.click();
  await page.getByRole("button", { name: "Тренировка" }).last().click();
  await expect(page.getByText("Сплит «Неделя I–IV» · 1 из 4 на этой неделе")).toBeVisible();
  await expect(page.getByRole("button", { name: /^I\. Ноги и плечи.*✓ / })).toBeVisible();
  await expect(page.getByRole("button", { name: /^II\. Грудь и спина.*следующая по сплиту/ })).toBeVisible();
});

test("a new split: programs added (one twice), made active, its week's muscles; deleting it keeps the programs", async ({ page }) => {
  await openApp(page);
  await page.getByRole("button", { name: "+ Новый сплит" }).click();
  await page.getByPlaceholder("Название сплита").fill("Фулбади");
  for (const name of ["II. Грудь и спина", "I. Ноги и плечи", "II. Грудь и спина"]) {
    await page.getByRole("button", { name: "Добавить тренировку" }).click();
    await page.getByRole("dialog").getByRole("button", { name: new RegExp(`^${name.replace(".", "\\.")}`) }).click();
  }
  await expect(page.getByText("3 тренировки в неделю.")).toBeVisible();
  await expect(page.getByText("Мышцы за неделю по плану")).toBeVisible();
  await page.getByRole("button", { name: /Активный сплит/ }).click(); // the first split stays active until this one takes over
  await page.goBack();
  await expect(page.getByText("Сплит «Фулбади» · 0 из 3 на этой неделе")).toBeVisible();
  await expect(page.getByRole("button", { name: /^II\. Грудь и спина.*следующая по сплиту/ })).toBeVisible();
  await page.getByRole("button", { name: /^Фулбади/ }).click();
  await page.getByRole("button", { name: "Удалить сплит" }).click();
  await page.getByRole("button", { name: /Удалить сплит\?/ }).click();
  await expect(page.getByRole("button", { name: /^II\. Грудь и спина/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Фулбади/ })).toHaveCount(0);
});

test("from a program's muscle to exercises for it; a split only shows its muscles", async ({ page }) => {
  await openApp(page);
  // a program: «I. Ноги и плечи» has no chest — a double tap on it on the map leads to the picker filtered on chest
  await page.getByRole("button", { name: /^I\. Ноги и плечи/ }).click();
  // the program is in the active split: each muscle shows the split's whole planned week beside it
  await expect(page.getByText("«За неделю» — весь сплит «Неделя I–IV» по плану")).toBeVisible();
  await expect(page.getByText(/квадрицепс/).first()).toBeVisible();
  await expect(page.getByText(/· за неделю 15 из 10/).first()).toBeVisible();
  const chest = page.locator('[data-muscle="chest"]').first();
  await chest.click(); // one tap: picked, with the way to exercises for it
  await expect(page.getByRole("button", { name: "Подобрать упражнение на «грудь»" })).toBeVisible();
  await page.locator('[data-muscle="quads"]').first().click(); // another muscle in between: no double tap from it
  await chest.dblclick();
  const picker = page.getByTestId("picker");
  await expect(picker.getByRole("button", { name: /^Жим штанги лёжа/ })).toBeVisible();
  await expect(picker.getByRole("button", { name: /^Приседания со штангой/ })).toHaveCount(0); // filtered on chest
  await picker.getByRole("button", { name: /^Жим штанги лёжа/ }).click();
  await page.getByRole("button", { name: "Добавить (1)" }).click();
  await expect(page.getByText("Жим штанги лёжа").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /^грудь \d/ })).toBeVisible(); // now loaded: a row
  // the closed picker drops its history entry right after; going back before that would only drop it
  await expect.poll(() => page.evaluate(() => history.state && history.state.overlay)).toBeFalsy();
  await page.goBack();

  // a split only shows its week's muscles: exercises go into a program, not into a split
  await page.getByText(/^Сплит «/).click();
  await page.getByRole("button", { name: /^бицепс \d/ }).click();
  await expect(page.getByTestId("muscle-exercises")).toBeVisible();
  await expect(page.getByText(/^Подобрать упражнение/)).toHaveCount(0);
  await page.locator('[data-muscle="chest"]').first().dblclick(); // no double tap to exercises
  await expect(page.getByTestId("picker")).toHaveCount(0);
});

test("in a workout's card a muscle only shows its numbers: nothing to pick from there", async ({ page }) => {
  await openApp(page);
  await startWorkout(page);
  await page.getByRole("button", { name: "Подход сделан" }).first().click();
  await finishWorkout(page);
  const keep = page.getByText("Оставить программу как была");
  if (await keep.count()) await keep.click();
  await page.getByRole("button", { name: /^квадрицепс/ }).click();
  await expect(page.getByTestId("muscle-exercises")).toBeVisible();
  await expect(page.getByText(/^Подобрать упражнение/)).toHaveCount(0);
  await page.locator('[data-muscle="chest"]').first().dblclick(); // no double tap to exercises
  await expect(page.getByTestId("picker")).toHaveCount(0);
});

test("hold programs to pick them: a new split of them, or into an existing one", async ({ page }) => {
  await openApp(page);
  const row = (name) => page.getByRole("button", { name: new RegExp(`^${name.replace(".", "\\.")}`) });
  const hold = async (el) => {
    const b = await el.boundingBox();
    await page.mouse.move(b.x + 20, b.y + b.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(600);
    await page.mouse.up();
  };
  await hold(row("III. Ноги и плечи"));
  await expect(page.getByText("Выбрано: 1 — собрать в сплит")).toBeVisible();
  await row("I. Ноги и плечи").click(); // a tap now picks another
  await expect(page.getByText("Выбрано: 2 — собрать в сплит")).toBeVisible();
  await page.getByTestId("picked-bar").getByRole("button", { name: "Новый сплит" }).click();
  await expect(page.getByPlaceholder("Название сплита")).toBeVisible();
  await expect(page.getByText("2 тренировки в неделю.")).toBeVisible();
  await page.getByPlaceholder("Название сплита").fill("Ноги");
  await page.goBack();
  // into an existing split
  await hold(row("II. Грудь и спина"));
  await page.getByRole("button", { name: "В «Ноги»" }).click();
  await expect(page.getByText("3 тренировки в неделю.")).toBeVisible();
  await page.goBack();
  // «Удалить» removes the picked programs at once; «Вернуть» brings them back
  await hold(row("I. Ноги и плечи"));
  await row("IV. Грудь и спина").click();
  await page.getByTestId("picked-bar").getByRole("button", { name: "Удалить" }).click();
  await expect(page.getByText("2 программы удалены")).toBeVisible();
  await expect(row("I. Ноги и плечи")).toHaveCount(0);
  await page.getByRole("button", { name: "Вернуть" }).click();
  await expect(row("I. Ноги и плечи")).toBeVisible();
  await expect(page.getByText(/^Сплит «Неделя I–IV» · 0 из 4/)).toBeVisible(); // back in their split too
  // «Отмена» drops the pick; a tap opens the program again
  await hold(row("IV. Грудь и спина"));
  await page.getByRole("button", { name: "Отмена" }).click();
  await expect(page.getByTestId("picked-bar")).toHaveCount(0);
  await row("IV. Грудь и спина").click();
  await expect(page.getByPlaceholder("Название программы")).toHaveValue("IV. Грудь и спина");
});

test("during a workout «Программы» shows the programs: the running one is marked, ▶ goes back, nothing else starts", async ({ page }) => {
  await openApp(page);
  await startWorkout(page);
  await page.getByRole("button", { name: "Программы" }).click();
  await expect(page.getByRole("heading", { name: "Программы" })).toBeVisible();
  await expect(page.getByText("идёт")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Начать" }).first()).toBeDisabled();
  await expect(page.getByRole("button", { name: "Без программы" })).toBeDisabled();
  await page.getByText("II. Грудь и спина").click(); // another program opens to look at
  await expect(page.locator("input").first()).toHaveValue("II. Грудь и спина");
  await page.goBack();
  await page.getByTestId("program-group").getByRole("button", { name: "Вернуться" }).click();
  await expect(page.getByText("Идёт тренировка")).toBeVisible();
});
