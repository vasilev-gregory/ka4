// Lint rules, including the project conventions (see SPEC.md → «Конвенции»): every rule below that
// names a convention fails `npm test`, so the code stays uniform.
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";

const BROWSER_STORAGE = "Browser storage lives in src/storage.js only (storage / storageStatus / protectStorage).";
const date = "CallExpression[callee.object.name='Date'][callee.property.name='now']";
const ACCENT_MSG = "Use the accent colour (bg-accent-400, …), not amber/rose/teal: the mode and the settings decide the colour.";
// no-restricted-syntax lists are replaced, not merged, by later blocks: every block repeats ACCENT
const ACCENT = [
  { selector: "Literal[value=/\\b(amber|teal|rose)-\\d/]", message: ACCENT_MSG },
  { selector: "TemplateElement[value.raw=/\\b(amber|teal|rose)-\\d/]", message: ACCENT_MSG },
];

export default [
  { ignores: ["dist/", "node_modules/", "test-results/", "playwright-report/"] },
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx,mjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, __BUILD_TIME__: "readonly", __COMMIT__: "readonly", __VERSION__: "readonly" },
    },
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "no-unused-vars": ["error", { args: "none", varsIgnorePattern: "^_", caughtErrors: "none" }],
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
  // ---- conventions for the app code ----
  {
    files: ["src/**/*.{js,jsx}"],
    rules: {
      // small files: split a screen into components, a model module by topic
      "max-lines": ["error", { max: 350 }],
      "no-restricted-globals": ["error",
        { name: "localStorage", message: BROWSER_STORAGE }, { name: "sessionStorage", message: BROWSER_STORAGE },
        { name: "indexedDB", message: BROWSER_STORAGE }],
      "no-restricted-properties": ["error", { object: "navigator", property: "storage", message: BROWSER_STORAGE }],
      "no-restricted-imports": ["error", { paths: [{ name: "recharts", message: "Charts go through ui/TrendChart.jsx (loaded on demand via <Trend>)." }] }],
      "no-restricted-syntax": ["error", ...ACCENT],
    },
  },
  { files: ["src/storage.js"], rules: { "no-restricted-globals": "off", "no-restricted-properties": "off" } },
  { files: ["src/ui/TrendChart.jsx"], rules: { "no-restricted-imports": "off" } },
  // the model is plain logic: no React (except the persistence hook), no UI
  {
    files: ["src/model/**/*.js"],
    ignores: ["src/model/usePersistentData.js"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [
        { group: ["react", "react-dom", "react/*"], message: "model/ is plain logic without React." },
        { group: ["../ui/*", "../strength/*", "../stretch/*", "../settings/*", "../measures/*", "../shell/*"], message: "model/ must not depend on screens or UI." },
      ] }],
    },
  },
  // the model takes the time as a `now` parameter (default Date.now()) so the rules are testable
  {
    files: ["src/model/**/*.js"],
    ignores: ["src/model/usePersistentData.js"],
    rules: {
      "no-restricted-syntax": ["error", ...ACCENT, { selector: `${date}:not(AssignmentPattern > ${date})`, message: "Take time as a `now = Date.now()` parameter." }],
    },
  },
  // stretching screens only see data.stretch through upStretch()
  {
    files: ["src/stretch/**/*.{js,jsx}"],
    rules: {
      "no-restricted-syntax": ["error", ...ACCENT,
        { selector: "Identifier[name='data']", message: "Stretching screens get `stretch` / `upStretch`, not the whole data." },
        { selector: "Identifier[name='up']", message: "Stretching screens change data with upStretch((s) => …)." }],
    },
  },
  { files: ["scripts/**", "*.config.js", "tests/**"], languageOptions: { globals: { ...globals.node } } },
];
