// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@nuxtjs/i18n'],

  css: ['~/assets/css/main.css'],

  // Тексты лежат в app/locales/*.ts и подключаются через useContent();
  // модуль i18n отвечает за маршруты (/ — русский, /en — английский), определение языка и SEO-теги.
  i18n: {
    locales: [
      { code: 'ru', language: 'ru-RU', name: 'Русский' },
      { code: 'en', language: 'en-US', name: 'English' },
    ],
    defaultLocale: 'ru',
    strategy: 'prefix_except_default',
    // Полный адрес сайта для hreflang/canonical — задаётся через NUXT_PUBLIC_I18N_BASE_URL
    baseUrl: '',
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
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
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
