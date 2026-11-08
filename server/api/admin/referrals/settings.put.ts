import type { ReferralSettings } from '#shared/cabinet'

// Сохранение настроек реферальной программы
export default defineEventHandler(async (event): Promise<ReferralSettings> => {
  await requireAdmin(event)
  const body = await readJson(event)

  const values: [string, string][] = [['reward_enabled', body.rewardEnabled ? '1' : '0']]
  for (const [field, key] of Object.entries(settingKeys)) {
    const n = Math.max(0, int(body[field]) || 0)
    values.push([key, String(field === 'commissionPct' ? Math.min(100, n) : n)])
  }

  const db = cmsDb()
  await exec(db, 'INSERT INTO referral_settings (s_key, s_value) VALUES ? ON DUPLICATE KEY UPDATE s_value = VALUES(s_value)', [values])
  return loadReferralSettings(db)
})
