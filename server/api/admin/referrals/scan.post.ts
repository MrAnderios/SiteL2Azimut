// Проверка и выдача реферальных наград всем участникам прямо сейчас
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const result = await scanAllReferralRewards()
  if (!result) fail(429, 'too_many_requests')
  return result
})
