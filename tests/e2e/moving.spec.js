// The move to the new address: the card shows on the old address (GitHub Pages) only.
import { test, expect } from "@playwright/test";
import { openApp } from "./helpers.js";

test("no moving card on the new address", async ({ page }) => {
  await openApp(page);
  await expect(page.getByTestId("move-banner")).toHaveCount(0);
});

test("on the old address: save a copy, then the link to the new one", async ({ page }) => {
  // the built app served as if from github.io
  await page.route("https://vasilev-gregory.github.io/ka4/**", async (route) => {
    const res = await route.fetch({ url: route.request().url().replace("https://vasilev-gregory.github.io", "http://localhost:4173") });
    await route.fulfill({ response: res });
  });
  await page.goto("https://vasilev-gregory.github.io/ka4/");
  const card = page.getByTestId("move-banner");
  await expect(card.getByText("Кач переезжает")).toBeVisible();
  await expect(card.getByRole("link", { name: "Открыть" })).toHaveAttribute("href", "https://kach.hb.ru-msk.vkcloud-storage.ru/index.html");
  await page.evaluate(() => { delete navigator.canShare; Object.defineProperty(navigator, "canShare", { value: undefined }); });
  const download = page.waitForEvent("download");
  await card.getByRole("button", { name: "Сохранить" }).click();
  expect((await download).suggestedFilename()).toMatch(/^kach-backup-.*\.json$/);
  await expect(card.getByText("Копия сохранена")).toBeVisible();
});
