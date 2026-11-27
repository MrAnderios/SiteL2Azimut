# SiteL2Azimut

Лендинг сервера **Azimut** (Lineage 2 Epilogue) на [Nuxt 4](https://nuxt.com): личный кабинет, форум и публичная статистика.

## Запуск

Нужен Node.js `^22.21.0` или `^24.11.0`.

```bash
npm install
npm run dev        # dev-сервер на http://localhost:3000
npm run build      # production-сборка (SSR) в .output/
npm run generate   # статическая сборка в .output/public/
npm run preview    # просмотр production-сборки
npm run typecheck  # проверка типов (vue-tsc); выполняется и в CI перед сборкой
```

Только лендинг и статистика в браузере работают без базы. Кабинет, форум и админка требуют MySQL и переменные из [`.env.example`](.env.example).

### Локальная база (кабинет и форум)

MariaDB в Docker: порт **3307** (3306 часто занят), пользователь и пароль `azimut`, база `la2`.

```bash
npm run db:up      # поднять контейнер; первый запуск создаёт таблицы и демо-данные
cp .env.example .env
# NUXT_DB_HOST=127.0.0.1, NUXT_DB_PORT=3307, NUXT_DB_USER=azimut, NUXT_DB_PASSWORD=azimut
npm run dev
```

Демо-вход: `admin` / `azimut` (админ, 1000 монет). Сброс данных: `npm run db:reset`. Подробнее — [docs/CABINET.md](docs/CABINET.md#локальная-разработка).

```bash
npm run db:down    # остановить контейнер
```

Файл `.env` в git не коммитить.

## Документация

| Документ | О чём |
|----------|--------|
| [docs/CABINET.md](docs/CABINET.md) | Кабинет, сессия, заходы, переход со старой CMS |
| [docs/FORUM.md](docs/FORUM.md) | Форум: разделы, права, API |
| [docs/PAYMENTS.md](docs/PAYMENTS.md) | Счета, СБП, шлюз, callback |
| [docs/API.md](docs/API.md) | Публичное API статистики (`/api/status`, `/api/top`, …) |
| [docs/STREAMS.md](docs/STREAMS.md) | Стримы на главной и в админке |
| [docs/DEPLOY.md](docs/DEPLOY.md) | CI/CD, секреты, свой сервер и FTP |

## Деплой

При пуше в `main` GitHub Actions деплоит сайт как Node-приложение на свой сервер Ubuntu (с личным кабинетом).
Сервер готовится скриптами из `scripts/server/`. Запасной вариант — статика по FTP на хостинг
(переменная репозитория `DEPLOY_TARGET=ftp`; кабинет при этом выключен, ссылки ведут в старую CMS).
Секреты, шаги и диагностика — в [docs/DEPLOY.md](docs/DEPLOY.md).

## Личный кабинет

Регистрация, игровые аккаунты, баланс Coin of Luck, оплата по СБП, реферальная программа и админ-панель
(`/login`, `/cabinet`, `/admin`). На `/admin` — уникальные заходы по IP: сайт, статистика, кабинет и форум;
подтверждение платежей, рефералы, стримы на главной.
Бэкенд — серверные маршруты Nuxt (`server/api`), база — MySQL логин-сервера L2.
Для работы нужны переменные окружения из [`.env.example`](.env.example).
Подробности и план перехода со старой PHP-CMS — [docs/CABINET.md](docs/CABINET.md).
Оплата и шлюз — [docs/PAYMENTS.md](docs/PAYMENTS.md).

Форум (`/forum`) читается без входа, писать можно мастер-аккаунтом кабинета. Имя автора задаётся при первом заходе;
аватары — загрузка в кабинете форума. На уже работающей базе таблицы форума создаёт [server/database/forum.sql](server/database/forum.sql),
таблицу заходов — [server/database/visits.sql](server/database/visits.sql)
(для новой установки они есть в `install.sql`). Страницы, права и API форума — [docs/FORUM.md](docs/FORUM.md).

## Статистика сервера

Страница [`/stats`](app/pages/stats.vue) — онлайн, топы, замки, герои, кланы (данные с публичного API).
Тот же API можно вызывать с других сайтов; контракт и примеры — [docs/API.md](docs/API.md).
В dev-режиме запросы идут на текущий origin; в конфиге задаётся `NUXT_PUBLIC_STATS_API_BASE` для продакшена.

## Структура

```
app/
├─ data/site.ts              # данные без языка: ссылки, даты, рейты, картинки
├─ locales/ru.ts, en.ts      # тексты на русском и английском
├─ composables/              # useContent, useAuth, useCabinet, useForum, useCabinetAvailability, …
├─ utils/streams.ts, forum.ts
├─ assets/css/ui.css, main.css, cabinet.css, forum.css
├─ plugins/reveal.ts, visits.client.ts, icon-provider.client.ts
├─ middleware/               # auth, admin, guest, cabinet-disabled
├─ layouts/default.vue, cabinet.vue
├─ pages/index.vue, stats.vue, login.vue, register.vue
├─ pages/cabinet/, admin/, forum/
├─ app.vue, error.vue
└─ components/
   ├─ app/                   # AppHeader, AppFooter, AppServerStatus, …
   ├─ ui/                    # UiButton, UiSection, UiIcon, UiOrnament, …
   ├─ section/               # разделы лендинга (SectionHero, SectionRates, …)
   ├─ cabinet/               # формы и шапка кабинета
   └─ forum/                  # доска, тема, редактор, аватары
public/images/               # изображения
shared/cabinet.ts, forum.ts, visits.ts
server/                      # api/, utils/, tasks/, database/, routes/, middleware/
docker-compose.yml           # MariaDB для локальной разработки (npm run db:up)
scripts/server/              # подготовка сервера (setup.sh) и GitHub (github-setup.sh) для деплоя
```

Стримы в разделе «Стримы AzimutLive» задаются в админке (`/admin/streams`): по одной ссылке или коду
`<iframe>` на строку. Правила — [docs/STREAMS.md](docs/STREAMS.md).

Чтобы поменять текст, правьте `app/locales/ru.ts` и `app/locales/en.ts`, ссылку или дату — `app/data/site.ts`.
Разметку трогать не нужно. Структура `en.ts` проверяется по `ru.ts` на уровне типов: если добавить ключ
в один словарь и забыть про другой, TypeScript покажет ошибку.

## Языки

Русский — основной (`/`), английский — `/en` (модуль [@nuxtjs/i18n](https://i18n.nuxtjs.org)).
При первом заходе на `/` посетитель с английским языком браузера перенаправляется на `/en`;
выбор языка в шапке запоминается в cookie `azimut_lang`.

## SEO

- Адрес сайта для canonical, `hreflang`, `og:url`, `og:image`, `robots.txt` и `sitemap.xml` —
  `i18n.baseUrl` в `nuxt.config.ts` (по умолчанию `https://l2azimut.ru`). На сервере его можно
  переопределить переменной `NUXT_PUBLIC_I18N_BASE_URL=https://ваш-домен` (без слеша в конце).
- Заголовок, описание и alt превью — `meta` в `app/locales/*.ts`; общие мета-теги и JSON-LD — `app/app.vue`.
- `/robots.txt` и `/sitemap.xml` отдаются из `server/routes/`; новые страницы добавляйте в `sitemap.xml.ts`.
  Форум и его разделы в карте сайта уже есть, отдельные темы — нет. Кабинет, вход и админка в карту не входят.
- Иконки (`favicon.ico`, `favicon-*.png`, `apple-touch-icon.png`, `icon-192/512.png`), манифест
  `site.webmanifest` и превью для соцсетей `og-image.jpg` (1200×630) лежат в `public/`.