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
