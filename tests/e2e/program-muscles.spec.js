// The program editor shows the muscles a program plans for; its exercises open their cards.
import { test, expect } from "@playwright/test";
import { openApp, seedStorage } from "./helpers.js";

test("program editor: muscles by plan for this program; an exercise opens its card", async ({ page }) => {
  await openApp(page);
  await seedStorage(page, (d) => {
    d.programs = [
      { id: "a", name: "Ноги", items: [{ exerciseId: "squat", sets: 4 }, { exerciseId: "lateral-raise", sets: 3 }] },
      { id: "b", name: "Плечи", items: [{ exerciseId: "lateral-raise", sets: 4 }, { exerciseId: "elliptical", sets: 1, min: 20 }] },
    ];
  });
  await page.getByText("Ноги", { exact: true }).first().click();
  await expect(page.getByText("Мышцы по плану")).toBeVisible();
  await expect(page.getByRole("img", { name: "Спереди" })).toBeVisible();
  await expect(page.getByRole("button", { name: /средняя дельта.*3 подх\. · пацан есть рост ещё 1 подх\. — «хороший рост»/ })).toBeVisible(); // one program: the per-session scale
  await expect(page.getByRole("button", { name: /ягодицы.*2 подх\. · дрыщ старт/ })).toBeVisible();

  await expect(page.getByRole("button", { name: "Все программы" })).toHaveCount(0); // inside one program, only it
  await page.getByRole("button", { name: /средняя дельта/ }).click();
  await expect(page.getByTestId("muscle-exercises").getByRole("button", { name: /Махи гантелями в стороны.*основная.*3 подх\./ })).toBeVisible();
  // a tap on an exercise of the program opens its card
  await page.getByRole("button", { name: /^Приседания со штангой/ }).first().click();
  await expect(page.getByText("Мышцы: квадрицепс; помогают: ягодицы")).toBeVisible();
});
