# SiteL2Azimut

Лендинг сервера **Azimut** (Lineage 2 Epilogue) на [Nuxt 4](https://nuxt.com).

## Запуск

Нужен Node.js `^22.21.0` или `^24.11.0`.

```bash
npm install
npm run dev        # dev-сервер на http://localhost:3000
npm run build      # production-сборка (SSR) в .output/
npm run generate   # статическая сборка в .output/public/
npm run preview    # просмотр production-сборки
```

## Деплой

При пуше в `main` GitHub Actions деплоит сайт как Node-приложение на свой сервер Ubuntu (с личным кабинетом).
Сервер готовится скриптами из `scripts/server/`. Запасной вариант — статика по FTP на хостинг
(переменная репозитория `DEPLOY_TARGET=ftp`; кабинет при этом выключен, ссылки ведут в старую CMS).
Секреты, шаги и диагностика — в [docs/DEPLOY.md](docs/DEPLOY.md).

## Личный кабинет

Регистрация, игровые аккаунты, баланс Coin of Luck, оплата по СБП, реферальная программа и админ-панель
(`/login`, `/cabinet`, `/admin`). Бэкенд — серверные маршруты Nuxt (`server/api`), база — MySQL логин-сервера L2.
Для работы нужны переменные окружения из [`.env.example`](.env.example).
Подробности и план перехода со старой PHP-CMS — [docs/CABINET.md](docs/CABINET.md).

## Структура

```
app/
├─ data/site.ts            # данные без языка: ссылки, даты, рейты, картинки
├─ locales/ru.ts, en.ts    # тексты на русском и английском
├─ composables/useContent  # тексты на текущем языке
├─ assets/css/main.css     # токены (цвета, шрифты), базовые стили, .panel, .text-gold
├─ plugins/reveal.ts       # директива v-reveal — появление при прокрутке
├─ layouts/default.vue     # шапка → контент → подвал
├─ pages/index.vue         # порядок разделов лендинга
└─ components/
   ├─ app/                 # AppHeader, AppFooter
   ├─ ui/                  # UiButton, UiSection, UiIcon, UiOrnament
   └─ section/             # разделы лендинга (SectionHero, SectionRates, …)
public/images/             # изображения
shared/cabinet.ts          # настройки и типы личного кабинета (общие для сервера и фронта)
server/                    # бэкенд кабинета: api/, utils/, tasks/; robots.txt и sitemap.xml
scripts/server/            # подготовка сервера (setup.sh) и GitHub (github-setup.sh) для деплоя
```

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
- Иконки (`favicon.ico`, `favicon-*.png`, `apple-touch-icon.png`, `icon-192/512.png`), манифест
  `site.webmanifest` и превью для соцсетей `og-image.jpg` (1200×630) лежат в `public/`.
