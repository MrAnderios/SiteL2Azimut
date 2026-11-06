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
├─ data/site.ts            # весь контент: тексты, ссылки, рейты, шаги
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

Чтобы поменять текст или ссылку, правьте `app/data/site.ts`, разметку трогать не нужно.
