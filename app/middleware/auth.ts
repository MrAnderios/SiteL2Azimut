// Страницы кабинета: только для вошедших
export default defineNuxtRouteMiddleware(async (to) => {
  const localePath = useLocalePath()
  const user = await useAuth().ensure()
  if (!user) return navigateTo({ path: localePath('/login'), query: { redirect: to.fullPath } })
})
