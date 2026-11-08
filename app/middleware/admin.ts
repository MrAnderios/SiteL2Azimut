// Админ-панель: только для логинов из NUXT_ADMIN_LOGINS
export default defineNuxtRouteMiddleware(async (to) => {
  const localePath = useLocalePath()
  const user = await useAuth().ensure()
  if (!user) return navigateTo({ path: localePath('/login'), query: { redirect: to.fullPath } })
  if (!user.isAdmin) return navigateTo(localePath('/cabinet'))
})
