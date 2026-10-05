// Browser scenarios against the production build (npm run build first; `npm test` does both).
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:4173/ka4/",
    ...devices["Pixel 7"], // phone viewport, touch, mobile
    browserName: "chromium",
    serviceWorkers: "block", // a SW taking over reloads the page (main.jsx) in the middle of a test
  },
  webServer: {
    command: "npx vite preview --port 4173 --strictPort",
    url: "http://localhost:4173/ka4/",
    reuseExistingServer: !process.env.CI,
  },
});
