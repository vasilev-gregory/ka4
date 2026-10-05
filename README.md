# Кач

Личный трекер тренировок. PWA: React 19 + Vite + Tailwind 4, данные на устройстве (IndexedDB + localStorage).

Деплой: push в `main` → GitHub Actions → https://vasilev-gregory.github.io/ka4/

Локально: `npm i && npm run dev` (Node 22+)

## Правила разработки

- Требования, инварианты и устройство кода — в `SPEC.md`. Новые возможности сначала туда.
- Перед пушем: `npm test` (eslint, unit-тесты модели на `node:test`, сборка, браузерные сценарии на Playwright). То же самое CI запускает перед деплоем. Браузер для Playwright: `npx playwright install chromium`.
- Добавляя силовое упражнение, сразу добавлять одностороннюю вариацию, если она существует.
- Режим растяжки (`data.stretch`) полностью изолирован от силового.
- Состояние: IndexedDB (`kach`/`kv`) + зеркало в localStorage, ключ `gymapp-state-v1` (+ `-backup`). Ключ не менять.
