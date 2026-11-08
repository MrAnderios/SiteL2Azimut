// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@nuxtjs/i18n'],

  css: ['~/assets/css/main.css', '~/assets/css/cabinet.css'],

  // Серверные настройки личного кабинета. Значения задаются переменными окружения
  // (NUXT_DB_HOST, NUXT_SESSION_PASSWORD и т.д.) — см. .env.example. В репозиторий секреты не кладём.
  runtimeConfig: {
    // Ключ шифрования cookie сессии, не короче 32 символов
    sessionPassword: '',
    // База логин-сервера (accounts, master_accounts, платежи, рефералы)
    db: { host: '', port: 3306, user: '', password: '', database: 'la2' },
    // Доступ к игровым БД; если host/user пустые — используется db
    gameDb: { host: '', port: 0, user: '', password: '' },
    // Логины мастер-аккаунтов с доступом к админ-панели, через запятую
    adminLogins: 'admin',
  },

  nitro: {
    experimental: { tasks: true },
    // Проверка реферальных наград раз в 10 минут (раньше — cron_referrals.php)
    scheduledTasks: { '*/10 * * * *': ['referrals:check'] },
  },

  routeRules: {
    '/api/**': { headers: { 'cache-control': 'no-store' } },
  },

  // Тексты лежат в app/locales/*.ts и подключаются через useContent();
  // модуль i18n отвечает за маршруты (/ — русский, /en — английский), определение языка и SEO-теги.
  i18n: {
    locales: [
      { code: 'ru', language: 'ru-RU', name: 'Русский' },
      { code: 'en', language: 'en-US', name: 'English' },
    ],
    defaultLocale: 'ru',
    strategy: 'prefix_except_default',
    // Полный адрес сайта (без слеша в конце) для canonical, hreflang, og:url, og:image и sitemap.
    // На сервере переопределяется переменной окружения NUXT_PUBLIC_I18N_BASE_URL.
    baseUrl: 'https://l2azimut.ru',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'azimut_lang',
      redirectOn: 'root',
      fallbackLocale: 'ru',
    },
  },

  app: {
    head: {
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#0a0806' },
        { name: 'color-scheme', content: 'dark' },
        { name: 'format-detection', content: 'telephone=no' },
        { name: 'apple-mobile-web-app-title', content: 'Azimut' },
        { name: 'application-name', content: 'Azimut' },
      ],
      link: [
        { rel: 'icon', href: '/favicon.ico', sizes: '48x48' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
        { rel: 'manifest', href: '/site.webmanifest' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Cormorant+SC:wght@600;700&family=Montserrat:wght@400;500;600;700&display=swap',
        },
        { rel: 'preload', as: 'image', href: '/images/hero-bg.jpg' },
      ],
    },
  },
})
