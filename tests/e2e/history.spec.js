// History zoom (week / month / year) and the exercise chart's time window and drag-to-zoom.
import { test, expect } from "@playwright/test";
import { openApp, seedStorage, tab } from "./helpers.js";

test.beforeEach(async ({ page }) => {
  await page.clock.setSystemTime(new Date(2026, 9, 7, 12)); // Wed 7 Oct 2026
  await openApp(page);
  await seedStorage(page, (d) => {
    const w = (name, y, m, day, kg) => {
      const t = new Date(y, m, day, 18).getTime();
      return { id: name, programId: null, name, startedAt: t, finishedAt: t + 3600e3, segments: [{ start: t, end: t + 3600e3 }],
        exercises: [{ exerciseId: "squat", sets: [{ w: String(kg), r: "5", p: "", done: true }, { w: String(kg), r: "5", p: "", done: true }] }] };
    };
    d.workouts = [w("Прошлогодняя", 2025, 11, 10, 60), w("Сентябрьская", 2026, 8, 15, 80), w("Октябрьская", 2026, 9, 6, 90)];
  });
  await tab(page, "История");
});

test("history: month by default, paging, year overview drills down to a month and a week", async ({ page }) => {
  const period = page.getByTestId("period");
  await expect(period).toHaveText("Октябрь 2026 г.");
  await expect(page.getByText("Октябрьская")).toBeVisible();
  await expect(page.getByText("Сентябрьская")).toHaveCount(0);

  await page.getByRole("button", { name: "Раньше" }).click();
  await expect(page.getByText("Сентябрьская")).toBeVisible();
  await expect(page.getByText("Октябрьская")).toHaveCount(0);

  await page.getByRole("button", { name: "Год", exact: true }).click();
  await expect(period).toHaveText("2026");
  await expect(page.getByText("Сентябрьская")).toBeVisible();
  await expect(page.getByText("Октябрьская")).toBeVisible();
  await expect(page.getByText("Прошлогодняя")).toHaveCount(0);
  await expect(page.getByText(/2 тренировки, /)).toBeVisible();

  await page.getByRole("button", { name: /^окт/ }).click();
  await expect(period).toHaveText("Октябрь 2026 г.");
  await page.getByRole("button", { name: "Неделя" }).click();
  await expect(period).toHaveText("5 окт. – 11 окт.");
  await expect(page.getByText("тренировок: 1")).toBeVisible();
  await expect(page.getByText("Октябрьская")).toBeVisible();
  // muscles: the body map and the list; a tap on a muscle on the map picks it in the list
  await expect(page.getByRole("img", { name: "Спереди" })).toBeVisible();
  await expect(page.getByRole("button", { name: /квадрицепс.*2 подх\. · 1 раз/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /ягодицы.*1 подх\./ })).toBeVisible(); // helping: half a set each
  await page.locator('[data-muscle="quads"]').first().click();
  await expect(page.getByRole("button", { name: /квадрицепс/ })).toHaveClass(/bg-neutral-800/);

  // the zoom is kept while a workout card is open
  await page.getByText("Октябрьская").click();
  await page.goBack();
  await expect(period).toHaveText("5 окт. – 11 окт.");
});

test("exercise chart: metric, time window, drag to zoom and reset", async ({ page }) => {
  await page.getByText("Октябрьская").click();
  await page.getByText("Приседания со штангой").click();
  await expect(page.getByText(/60 кг → 90 кг, 3 тренировки/)).toBeVisible();
  await page.getByRole("button", { name: "3 мес" }).click();
  await expect(page.getByText(/80 кг → 90 кг, 2 тренировки/)).toBeVisible();
  await page.getByRole("button", { name: "объём" }).click();
  await expect(page.getByText(/800 кг → 900 кг/)).toBeVisible();

  await page.getByRole("button", { name: "всё" }).click();
  await page.getByRole("button", { name: "макс. вес" }).click();
  const box = await page.getByTestId("trend").boundingBox();
  await expect(page.locator(".recharts-cartesian-grid")).toBeVisible();
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width * 0.88, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.95, y + 2, { steps: 5 });
  await page.mouse.move(box.x + box.width - 1, y + 2, { steps: 5 });
  await page.mouse.up();
  await expect(page.getByText(/80 кг → 90 кг, 2 тренировки/)).toBeVisible();
  await page.getByRole("button", { name: "Сбросить" }).click();
  await expect(page.getByText(/60 кг → 90 кг, 3 тренировки/)).toBeVisible();
});
