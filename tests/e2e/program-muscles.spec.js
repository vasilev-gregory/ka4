// The program editor shows the muscles a program plans for, alone or as a week of all programs.
import { test, expect } from "@playwright/test";
import { openApp, seedStorage } from "./helpers.js";

test("program editor: muscles by plan for this program and for all programs as a week", async ({ page }) => {
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
  await expect(page.getByRole("button", { name: /средняя дельта.*3 подх\.$/ })).toBeVisible(); // one program: no growth status
  await expect(page.getByRole("button", { name: /ягодицы.*2 подх\.$/ })).toBeVisible();

  await page.getByRole("button", { name: "Все программы" }).click();
  await expect(page.getByText("каждую из программ (2)")).toBeVisible();
  await expect(page.getByRole("button", { name: /средняя дельта.*7 подх\. · 2 раза.*рост/ })).toBeVisible();
  await page.getByRole("button", { name: /средняя дельта/ }).click();
  await expect(page.getByTestId("muscle-exercises").getByRole("button", { name: /Махи гантелями в стороны.*основная.*7 подх\./ })).toBeVisible();
});
