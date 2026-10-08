# Кач

Личный трекер тренировок. PWA: React 19 + Vite + Tailwind 4, данные на устройстве (IndexedDB + localStorage).

Деплой: push в `main` → GitHub Actions → https://vasilev-gregory.github.io/ka4/

VK Cloud (https://kach.hb.ru-msk.vkcloud-storage.ru/index.html — адрес бакета, без своего домена): тот же push, задание `vkcloud` в `.github/workflows/deploy.yml`. Включается, когда
в репозитории заданы переменная `VKCLOUD_BUCKET` (имя бакета) и секреты `VKCLOUD_ACCESS_KEY` / `VKCLOUD_SECRET_KEY`;
необязательные переменные `VKCLOUD_ENDPOINT` (S3-адрес, по умолчанию `https://hb.ru-msk.vkcloud-storage.ru`) и `VKCLOUD_BASE`
(путь приложения, по умолчанию `/`). Сборка под другой путь: `BASE_PATH=/ npm run build` (по умолчанию `/ka4/`, на нём же тесты).
Открывать именно адрес с бакетом в имени хоста (`<бакет>.hb…`), не `hb…/<бакет>/`: у второго один адрес на всех клиентов VK Cloud,
и данные браузера были бы общими с чужими бакетами. Свой домен потом — CDN VK Cloud с бакетом-источником (данные придётся перенести копией).

Локально: `npm i && npm run dev` (Node 22+)

## Правила разработки

- Требования, инварианты, устройство кода и конвенции — в `SPEC.md`. Новые возможности сначала туда.
- Перед пушем: `npm test` (eslint, unit-тесты модели на `node:test`, сборка, браузерные сценарии на Playwright). То же самое CI запускает перед деплоем. Браузер для Playwright: `npx playwright install chromium`.
- Добавляя силовое упражнение, сразу добавлять одностороннюю вариацию, если она существует.
- Режим растяжки (`data.stretch`) полностью изолирован от силового.
- Состояние: IndexedDB (`kach`/`kv`) + зеркало в localStorage, ключ `gymapp-state-v1` (+ `-backup`). Ключ не менять.
