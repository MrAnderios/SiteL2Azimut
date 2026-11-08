import type { ReferralAward } from '#shared/cabinet'

// Проверка и выдача реферальных наград текущему мастеру (вызывается при входе в кабинет)
export default defineEventHandler(async (event): Promise<{ awards: ReferralAward[] }> => {
  const master = await requireMaster(event)
  return { awards: await checkReferralRewardsThrottled(master.id) }
})
