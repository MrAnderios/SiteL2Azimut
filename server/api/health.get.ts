// Проверка готовности кабинета для деплоя: ключ сессии задан, база логин-сервера доступна.
// Доступна только с самого сервера: через nginx запрос всегда приходит с X-Real-IP, такие отклоняем.
export default defineEventHandler(async (event) => {
  if (getRequestHeader(event, 'x-real-ip')) {
    throw createError({ statusCode: 404 })
  }

  const { sessionPassword } = useRuntimeConfig()
  const session = !!sessionPassword && sessionPassword.length >= 32
  let db = false
  try {
    await row(cmsDb(), 'SELECT 1')
    db = true
  }
  catch (e) {
    console.error('[health] база логин-сервера недоступна:', e)
  }

  const ok = session && db
  if (!ok) setResponseStatus(event, 503)
  return { ok, session, db }
})
