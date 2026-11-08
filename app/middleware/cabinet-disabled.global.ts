import { links } from '~/data/site'

// Пока новый кабинет выключен (статическая сборка без бэкенда), его страницы открывать бессмысленно:
// формы не смогут обратиться к API. Отправляем в старую CMS.
export default defineNuxtRouteMiddleware((to) => {
  if (useCabinetEnabled()) return
  const path = to.path.replace(/^\/en(?=\/|$)/, '') || '/'
  if (cabinetPaths.some(p => path === p || path.startsWith(`${p}/`))) {
    return navigateTo(links.legacyCabinet, { external: true })
  }
})
