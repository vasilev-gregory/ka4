# Кач — notes for coding agents

Personal workout tracker, a PWA (React 19, Vite 8, Tailwind 4, immer). All data stays on the device.

Read first: `SPEC.md` — requirements, data invariants, architecture and **conventions** (section «Конвенции»).
`README.md` — development rules. `src/model/types.js` — the saved data shape.

## Commands
- `npm run dev` — dev server
- `npm test` — lint (includes convention rules) → unit (`node:test`) → build → browser tests (Playwright). Must pass before a push; CI runs the same before deploying.
- `npm run test:unit`, `npm run test:e2e` (needs a build), `npm run lint`

## Rules that bite
- Behaviour changes go into `SPEC.md` first, then code and tests. Call out changed defaults in the PR.
- Domain changes are functions in `src/model/*Actions.js`, called as `up((d) => action(d, …))`; time is a `now` parameter. Each new rule gets a unit test.
- Stretching screens get only `stretch` / `upStretch`, never `data` / `up`.
- Colours: `*-accent-*` only (never amber/teal). Buttons, cards, toggles: `src/ui/kit.jsx`.
- Browser storage only in `src/storage.js`; never change the storage key `gymapp-state-v1`; schema changes must stay compatible (`migrate()` is idempotent).
- Every file starts with a `//` comment saying what it is; files ≤ 350 lines, lines ≤ 200 characters.
- UI text in Russian; code, comments and commit messages in English.
- Browser tests block service workers (a SW taking over reloads the page mid-test).
