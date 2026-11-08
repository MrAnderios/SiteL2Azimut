// Логин пригласившего по реферальному коду — для подсказки на странице регистрации
export default defineEventHandler(async (event) => {
  rateLimit(`referrer:ip:${clientIp(event)}`, 30, 60)
  const ref = await findReferrer(str(getQuery(event).code))
  return { login: ref?.login ?? null }
})
