// Splits: the active split's programs first with this week's marks and the next one; making and editing a split.
import { test, expect } from "@playwright/test";
import { finishWorkout, openApp, startWorkout } from "./helpers.js";

test("the active split marks this week's workouts and points at the next program", async ({ page }) => {
  await openApp(page);
  await expect(page.getByText("Сплит «Неделя I–IV»: 0 из 4 на этой неделе")).toBeVisible();
  await expect(page.getByText("следующая по сплиту")).toHaveCount(1);
  await expect(page.getByRole("button", { name: /^I\. Ноги и плечи.*следующая по сплиту/ })).toBeVisible();
  await startWorkout(page);
  await page.getByRole("button", { name: "Подход сделан" }).first().click();
  await finishWorkout(page);
  const keep = page.getByText("Оставить программу как была");
  if (await keep.count()) await keep.click();
  await page.getByRole("button", { name: "Тренировка" }).last().click();
  await expect(page.getByText("Сплит «Неделя I–IV»: 1 из 4 на этой неделе")).toBeVisible();
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
  await expect(page.getByText("Сплит «Фулбади»: 0 из 3 на этой неделе")).toBeVisible();
  await expect(page.getByRole("button", { name: /^II\. Грудь и спина.*следующая по сплиту/ })).toBeVisible();
  await page.getByRole("button", { name: /^Фулбади/ }).click();
  await page.getByRole("button", { name: "Удалить сплит" }).click();
  await page.getByRole("button", { name: /Удалить сплит\?/ }).click();
  await expect(page.getByRole("button", { name: /^II\. Грудь и спина/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Фулбади/ })).toHaveCount(0);
});

test("from a program's muscle to exercises for it; a split only shows its muscles", async ({ page }) => {
  await openApp(page);
  // a program: «I. Ноги и плечи» has no chest — its chip leads to the picker filtered on chest
  await page.getByRole("button", { name: /^I\. Ноги и плечи/ }).click();
  // the program is in the active split: each muscle shows the split's whole planned week beside it
  await expect(page.getByText("«За неделю» — весь сплит «Неделя I–IV» по плану")).toBeVisible();
  await expect(page.getByText(/квадрицепс/).first()).toBeVisible();
  await expect(page.getByText(/· за неделю 15 из 10/).first()).toBeVisible();
  const idle = page.getByTestId("no-load");
  await idle.getByRole("button", { name: "грудь", exact: true }).click();
  const picker = page.getByTestId("picker");
  await expect(picker.getByRole("button", { name: /^Жим штанги лёжа/ })).toBeVisible();
  await expect(picker.getByRole("button", { name: /^Приседания со штангой/ })).toHaveCount(0); // filtered on chest
  await picker.getByRole("button", { name: /^Жим штанги лёжа/ }).click();
  await page.getByRole("button", { name: "Добавить (1)" }).click();
  await expect(page.getByText("Жим штанги лёжа").first()).toBeVisible();
  await expect(idle.getByRole("button", { name: "грудь", exact: true })).toHaveCount(0);
  // the closed picker drops its history entry right after; going back before that would only drop it
  await expect.poll(() => page.evaluate(() => history.state && history.state.overlay)).toBeFalsy();
  await page.goBack();

  // a split only shows its week's muscles: exercises go into a program, not into a split
  await page.getByText(/^Сплит «/).click();
  await page.getByRole("button", { name: /^бицепс \d/ }).click();
  await expect(page.getByTestId("muscle-exercises")).toBeVisible();
  await expect(page.getByText(/^Подобрать упражнение/)).toHaveCount(0);
  await expect(page.getByTestId("no-load")).toHaveCount(0);
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
  await expect(page.getByTestId("no-load")).toHaveCount(0);
});
