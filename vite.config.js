import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { execSync } from "node:child_process";

let VERSION = "0";
try { VERSION = execSync("git rev-list --count HEAD").toString().trim(); } catch (e) {}

// emits dist/version.json so the app can ask the server which version is current
const versionFile = () => ({
  name: "version-file",
  generateBundle() {
    this.emitFile({ type: "asset", fileName: "version.json", source: JSON.stringify({ version: VERSION, commit: (process.env.GITHUB_SHA || "local").slice(0, 7), built: new Date().toISOString() }) });
  },
});

export default defineConfig({
  base: "/ka4/",
  build: { assetsInlineLimit: 0 }, // thumbnails as separate files, never inlined into the bundle
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __COMMIT__: JSON.stringify((process.env.GITHUB_SHA || "local").slice(0, 7)),
    __VERSION__: JSON.stringify(VERSION),
  },
  plugins: [
    react(),
    tailwindcss(),
    versionFile(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["apple-touch-icon.png"],
      manifest: {
        name: "Кач",
        short_name: "Кач",
        description: "Трекер тренировок",
        lang: "ru",
        start_url: "/ka4/",
        scope: "/ka4/",
        display: "standalone",
        background_color: "#000000",
        theme_color: "#000000",
        // Android (Chrome) lists Кач in the share sheet for these files: exports of other apps, our backups
        share_target: {
          action: "/ka4/share-target",
          method: "POST",
          enctype: "multipart/form-data",
          params: { files: [{ name: "file", accept: [".csv", "text/csv", "text/comma-separated-values", ".json", "application/json", ".db", "application/octet-stream", "application/x-sqlite3", "application/vnd.sqlite3"] }] },
        },
        icons: [
          { src: "icon-192.png?v=35", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "icon-512.png?v=35", sizes: "512x512", type: "image/png", purpose: "any" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,jpg}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        importScripts: ["share-target-sw.js"], // files shared from other apps (public/share-target-sw.js)
      },
    }),
  ],
});
