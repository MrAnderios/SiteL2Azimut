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

Пуш в `main` автоматически деплоит сайт на сервер через GitHub Actions.
Настройка сервера Ubuntu и секретов описана в [docs/DEPLOY.md](docs/DEPLOY.md).

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
```

Чтобы поменять текст, правьте `app/locales/ru.ts` и `app/locales/en.ts`, ссылку или дату — `app/data/site.ts`.
Разметку трогать не нужно. Структура `en.ts` проверяется по `ru.ts` на уровне типов: если добавить ключ
в один словарь и забыть про другой, TypeScript покажет ошибку.

## Языки

Русский — основной (`/`), английский — `/en` (модуль [@nuxtjs/i18n](https://i18n.nuxtjs.org)).
При первом заходе на `/` посетитель с английским языком браузера перенаправляется на `/en`;
выбор языка в шапке запоминается в cookie `azimut_lang`.

Для абсолютных ссылок `hreflang` задайте адрес сайта переменной окружения
`NUXT_PUBLIC_I18N_BASE_URL=https://ваш-домен` на сервере.
