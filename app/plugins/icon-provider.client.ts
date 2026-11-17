// Глифы Nuxt UI (тулбар редактора) берутся с локального /api/_nuxt_icon.
// @nuxt/icon 2.6 считает провайдер Iconify «дефолтным», только если в нём один
// хост api.iconify.design. У @iconify/vue их два, проверка не срабатывает, и
// клиент так и ходит на внешний API. Из браузера этот запрос падает, иконка пустая.
import { addAPIProvider } from '@iconify/vue'

export default defineNuxtPlugin({
  name: 'icon-provider',
  enforce: 'post',
  setup() {
    const endpoint = useAppConfig().icon?.localApiEndpoint || '/api/_nuxt_icon'
    const base = useRuntimeConfig().app.baseURL.replace(/\/$/, '')
    addAPIProvider('', { resources: [`${base}${endpoint}`] })
  },
})
