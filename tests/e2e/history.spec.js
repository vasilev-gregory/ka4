// History zoom (week / month / year) and the exercise chart's time window and drag-to-zoom.
import { test, expect } from "@playwright/test";
import { openApp, seedStorage, stored, tab } from "./helpers.js";

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

  await expect(page.getByRole("button", { name: "Позже" })).toBeDisabled(); // nothing past today
  await page.getByRole("button", { name: "Раньше" }).click();
  await expect(page.getByText("Сентябрьская")).toBeVisible();
  await expect(page.getByText("Октябрьская")).toHaveCount(0);

  await page.getByRole("button", { name: "Год", exact: true }).click();
  await expect(period).toHaveText("2026");
  await expect(page.getByText("Сентябрьская")).toBeVisible();
  await expect(page.getByText("Октябрьская")).toBeVisible();
  await expect(page.getByText("Прошлогодняя")).toHaveCount(0);
  await expect(page.getByText(/2 тренировки, /)).toBeVisible();
  // a year back holds the first workout, and further back there is nothing
  await page.getByRole("button", { name: "Раньше" }).click();
  await expect(period).toHaveText("2025");
  await expect(page.getByRole("button", { name: "Раньше" })).toBeDisabled();
  await page.getByRole("button", { name: /^янв/ }).click(); // a month with no workouts: nothing to explain, no «?»
  await expect(page.getByText("В этом месяце тренировок не было.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Как считается" })).toHaveCount(0);
  await page.getByRole("button", { name: "Год", exact: true }).click();
  await page.getByRole("button", { name: "Позже" }).click();

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
  // the picked muscle opens up: the exercises its sets came from this week
  await expect(page.getByRole("button", { name: /квадрицепс/ })).toHaveAttribute("aria-expanded", "true");
  const from = page.getByTestId("muscle-exercises");
  await expect(from).toContainText("Засчитались за неделю:");
  await expect(from.getByRole("button", { name: /Приседания со штангой.*основная.*2 подх\./ })).toBeVisible();
  // the front view has the upper traps and the edge of the lats too; the head is not a muscle, it jokes
  const front = page.getByRole("img", { name: "Спереди" });
  await expect(front.locator('[data-muscle="traps"]')).toHaveCount(2);
  await expect(front.locator('[data-muscle="lats"]')).toHaveCount(2);
  // the lateral delt is a shape of its own on both views
  await expect(front.locator('[data-muscle="sidedelt"]')).toHaveCount(2);
  await expect(page.getByRole("img", { name: "Сзади" }).locator('[data-muscle="sidedelt"]')).toHaveCount(2);
  await front.locator('[data-muscle="head"]').click();
  await expect(page.getByText(/^Голова: /)).toBeVisible();
  // a double tap on it goes to brain games (stubbed: no network in tests)
  await page.context().route("https://braingames.ru/**", (r) => r.fulfill({ body: "brain games" }));
  await page.locator('[data-muscle="chest"]').first().click(); // another shape in between: no double tap with the tap above
  const popup = page.waitForEvent("popup");
  await front.locator('[data-muscle="head"]').dblclick();
  expect((await popup).url()).toBe("https://braingames.ru/");

  // a month counts the exercises' sets over the whole month, and an exercise opens its card
  await page.getByRole("button", { name: "Месяц" }).click();
  await page.getByRole("button", { name: /ягодицы/ }).click();
  await expect(from).toContainText("Засчитались за месяц, всего:");
  await from.getByRole("button", { name: /Приседания со штангой.*помогает.*1 подх\./ }).click();
  await expect(page.getByText("Мышцы: квадрицепс; помогают: ягодицы")).toBeVisible();
  await page.goBack();
  // a day tapped in the month keeps the month's calendar: the next day is a tap away
  await page.getByRole("button", { name: "6 октября", exact: true }).click();
  await expect(period).toHaveText("Вт, 6 октября");
  await expect(page.getByRole("button", { name: "31 октября" })).toBeVisible();
  await page.getByRole("button", { name: "7 октября", exact: true }).click();
  await expect(period).toHaveText("Ср, 7 октября");
  await expect(page.getByRole("button", { name: "31 октября" })).toBeVisible();
  await page.getByRole("button", { name: "Неделя" }).click();
  await expect(page.getByRole("button", { name: "31 октября" })).toHaveCount(0);

  // a day: tap it in the week; its muscles on the per-workout norm, as in the workout's card
  await page.getByRole("button", { name: "6 октября" }).click();
  await expect(period).toHaveText("Вт, 6 октября");
  await expect(page.getByText("Октябрьская").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /квадрицепс.*2 подх\..*«есть рост»/ })).toBeVisible();
  await expect(page.getByTestId("set-table")).toHaveCount(1); // a day shows its workouts' exercises with their sets
  await page.getByRole("button", { name: "Неделя" }).click();
  await expect(page.getByTestId("set-table")).toHaveCount(0); // a week: just the workouts

  // the zoom is kept while a workout card is open; the card has the same muscles block, opened on its day
  await page.getByText("Октябрьская").click();
  await expect(page.getByText("ещё 1 подх. — «есть рост» · за неделю 2 из 10").first()).toBeVisible();
  await page.getByRole("button", { name: "Месяц", exact: true }).click(); // its own switch: up to the month from here
  await expect(page.getByText("в среднем за неделю")).toBeVisible();
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
  await page.getByTestId("trend").scrollIntoViewIfNeeded(); // below the muscles card: drag where it's on screen
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

test("changing an exercise's muscles asks first: it recounts the whole history", async ({ page }) => {
  await page.getByText("Октябрьская").click();
  await page.getByText("Приседания со штангой").click();
  await expect(page.getByText("Мышцы: квадрицепс; помогают: ягодицы")).toBeVisible();
  await page.getByRole("button", { name: "Изменить" }).click();
  await page.getByRole("button", { name: "ягодицы", exact: true }).click();
  const ask = page.getByRole("dialog", { name: "Пересчитать всю историю?" });
  await expect(ask.getByText(/для всех его тренировок \(3\)/)).toBeVisible();
  await ask.getByRole("button", { name: "Отмена" }).click();
  await expect(page.getByText("Мышцы: квадрицепс; помогают: ягодицы")).toBeVisible(); // nothing changed

  await page.getByRole("button", { name: "ягодицы", exact: true }).click();
  await ask.getByRole("button", { name: "Пересчитать" }).click();
  await expect(page.getByText("Мышцы: квадрицепс", { exact: true })).toBeVisible(); // a helping muscle tapped once more: removed
  await page.getByRole("button", { name: "бицепс бедра", exact: true }).click(); // asked once per visit
  await expect(ask).toHaveCount(0);
  await expect.poll(async () => (await stored(page)).exercises.find((e) => e.id === "squat").muscles).toEqual({ quads: 1, hams: 1 });
});

test("a workout from the history becomes a program in one tap", async ({ page }) => {
  await page.getByText("Октябрьская").click();
  await page.getByRole("button", { name: "Сделать программой" }).click();
  await expect(page.getByPlaceholder("Название программы")).toHaveValue("Октябрьская");
  await expect(page.getByText("Приседания со штангой")).toBeVisible();
  await page.goBack(); // back from the editor: the program is kept
  await tab(page, "Тренировка");
  await expect(page.getByRole("button", { name: "Октябрьская Приседания со штангой" })).toBeVisible();
});
