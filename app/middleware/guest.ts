// Вход и регистрация: вошедших сразу отправляем в кабинет
export default defineNuxtRouteMiddleware(async () => {
  const localePath = useLocalePath()
  const user = await useAuth().ensure()
  if (user) return navigateTo(localePath('/cabinet'))
})
