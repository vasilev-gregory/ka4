// System back (browser history) closes the top screen instead of leaving the app.
import { test, expect } from "@playwright/test";
import { openApp, switchMode, stored, tab } from "./helpers.js";

test("back closes detail screens one by one, then stays in the app", async ({ page }) => {
  await openApp(page);
  await tab(page, "Замеры");
  await page.getByText("Новый замер").click();
  await expect(page.getByRole("button", { name: "Сохранить", exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByText("Новый замер")).toBeVisible();
  expect(page.url()).toContain("/ka4/");
});

test("program changes are saved as you go; back returns to the list", async ({ page }) => {
  await openApp(page);
  await page.getByText("I. Ноги и плечи", { exact: true }).click();
  await page.locator("input").first().fill("Переименована");
  await page.goBack();
  await expect(page.getByText("Переименована")).toBeVisible();
  await page.getByText("Переименована").click();
  await page.getByRole("button", { name: "Убрать" }).first().click();
  await page.getByText("Вернуть").click();
  await expect(page.getByRole("button", { name: "Убрать" })).toHaveCount(7);
});

test("system back folds a running stretch into the strip; it goes on and ends from there", async ({ page }) => {
  await page.clock.install();
  await openApp(page);
  await switchMode(page, "Растяжка");
  await page.getByRole("button", { name: "+ Новая программа" }).click();
  await page.getByText("Добавить растяжку").click();
  await page.getByText("Пицца").first().click();
  await page.getByRole("button", { name: "Добавить (1)" }).click();
  await page.getByRole("button", { name: "Начать" }).last().click();
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "+ круг" }).click(); // longer than the minute we wait
  await page.clock.runFor(65_000);
  await page.goBack();
  await expect(page.getByRole("button", { name: "Развернуть растяжку" })).toBeVisible(); // folded, not ended
  await expect(page.getByText("Таймер программы")).toBeVisible(); // the editor under it is still there
  await page.getByRole("button", { name: "Развернуть растяжку" }).click();
  await page.getByRole("button", { name: "Закрыть" }).first().click();
  await expect.poll(async () => (await stored(page)).stretch.sessions.length).toBe(1);
  expect((await stored(page)).stretch.sessions[0].complete).toBe(false);
  // the player drops its history entry a tick after it closes; a back before that would only drop it
  await expect.poll(() => page.evaluate(() => history.state?.overlay ?? 0)).toBe(0);
  await page.goBack(); // the entry the player had is gone with it: back leaves the editor
  await expect(page.getByRole("button", { name: "+ Новая программа" })).toBeVisible();
});

test("closed by the system in the background, the app opens where it was left: the program, the picker, the picks", async ({ page, context }) => {
  await openApp(page);
  await page.getByText("I. Ноги и плечи", { exact: true }).click();
  await page.getByRole("button", { name: "Добавить упражнение" }).click();
  const picker = page.getByPlaceholder("Поиск по-русски или по-английски");
  await picker.fill("обратных разведений на заднюю дельту сидя в тренажере");
  await expect(page.getByText("Точно такого нет, ближе всего:")).toBeVisible();
  await page.getByText("Обратные разведения в тренажёре на заднюю дельту (пекдек)").click();
  await expect(page.getByRole("button", { name: "Добавить (1)" })).toBeVisible();

  // a messenger meanwhile, the system closes the app: it starts again in a fresh page
  const again = await context.newPage();
  await page.close();
  await again.goto("./");
  await expect(again.getByPlaceholder("Поиск по-русски или по-английски")).toHaveValue(/обратных разведений/);
  await again.getByRole("button", { name: "Добавить (1)" }).click();
  await expect(again.getByText("Обратные разведения в тренажёре на заднюю дельту (пекдек)")).toBeVisible(); // in the program
  await again.goBack(); // back walks the restored screens down to the list
  await expect(again.getByText("II. Грудь и спина", { exact: true })).toBeVisible();
});

test("picker filters: buttons opening their chips — by the muscle an exercise works most and by equipment", async ({ page }) => {
  await openApp(page);
  await page.getByText("I. Ноги и плечи", { exact: true }).click();
  await page.getByRole("button", { name: "Добавить упражнение" }).click();
  const picker = page.getByTestId("picker");
  await picker.getByRole("button", { name: /^Мышца: все/ }).click(); // a button opens its chips
  await picker.getByTestId("filter-muscle").getByRole("button", { name: "средняя дельта" }).click();
  await expect(picker.getByTestId("filter-muscle")).toHaveCount(0); // picked: the chips fold away
  await expect(picker.getByRole("button", { name: /^Мышца: средняя дельта/ })).toBeVisible();
  await expect(picker.getByText("Махи гантелями в стороны")).toBeVisible();
  await expect(picker.getByText("Жим ногами", { exact: true })).toHaveCount(0);
  await picker.getByRole("button", { name: /^Снаряд/ }).click();
  await picker.getByTestId("filter-equip").getByRole("button", { name: "блок" }).click();
  await expect(picker.getByText("Махи в сторону на нижнем блоке")).toBeVisible();
  await expect(picker.getByText("Махи гантелями в стороны")).toHaveCount(0);
  await picker.getByRole("button", { name: /^Снаряд: блок/ }).click();
  await picker.getByTestId("filter-equip").getByRole("button", { name: "блок" }).click(); // tapped again: off
  await expect(picker.getByText("Махи гантелями в стороны")).toBeVisible();
  // by muscle group: «руки» take biceps, triceps and forearms together
  await page.getByRole("button", { name: "Закрыть" }).first().click();
  await page.getByRole("button", { name: "Добавить упражнение" }).click();
  await picker.getByRole("button", { name: /^Группа: все/ }).click();
  await picker.getByTestId("filter-group").getByRole("button", { name: "руки" }).click();
  await expect(picker.getByText("Сгибание рук со штангой").first()).toBeVisible();
  await expect(picker.getByText("Брусья на трицепс").first()).toBeVisible();
  await expect(picker.getByText("Жим ногами", { exact: false })).toHaveCount(0);
  // the muscle filter offers the group's muscles only; a muscle of another group goes when the group changes
  await picker.getByRole("button", { name: /^Мышца: все/ }).click();
  await expect(picker.getByTestId("filter-muscle").getByRole("button", { name: "грудь" })).toHaveCount(0);
  await picker.getByTestId("filter-muscle").getByRole("button", { name: "бицепс", exact: true }).click();
  await picker.getByRole("button", { name: /^Группа: руки/ }).click();
  await picker.getByTestId("filter-group").getByRole("button", { name: "ноги" }).click();
  await expect(picker.getByRole("button", { name: /^Мышца: все/ })).toBeVisible();
  await picker.getByRole("button", { name: /^Группа: ноги/ }).click();
  await expect(picker.getByTestId("filter-group").getByRole("button", { name: "икры" })).toHaveCount(0); // muscles aren't groups
});
