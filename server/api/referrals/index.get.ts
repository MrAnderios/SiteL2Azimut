import type { ReferralsResponse } from '#shared/cabinet'

// Реферальная страница: код, кто пригласил, приглашённые, заработок и журнал наград
export default defineEventHandler(async (event): Promise<ReferralsResponse> => {
  const master = await requireMaster(event)
  const db = cmsDb()

  const [code, referredBy, invites, earnings, log, settings] = await Promise.all([
    ensureRefCode(master.id),
    row<{ login: string }>(db,
      'SELECT m.login FROM referral_relations r JOIN master_accounts m ON m.id = r.referrer_id WHERE r.referred_id = ?', [master.id]),
    rows<{ login: string, created_at: number }>(db,
      `SELECT m.login, m.created_at FROM referral_relations r
         JOIN master_accounts m ON m.id = r.referred_id
        WHERE r.referrer_id = ? ORDER BY r.id DESC`, [master.id]),
    row<{ total: number }>(db,
      `SELECT COALESCE(SUM(coin_amount), 0) AS total FROM referral_rewards_log
        WHERE master_id = ? AND kind IN ('referrer', 'commission')`, [master.id]),
    rows<ReferralLogRow>(db, 'SELECT * FROM referral_rewards_log WHERE master_id = ? ORDER BY id DESC LIMIT 50', [master.id]),
    loadReferralSettings(db),
  ])

  return {
    code,
    referredBy: referredBy?.login ?? null,
    invites: invites.map(i => ({ login: i.login, createdAt: Number(i.created_at) })),
    earnings: Number(earnings?.total ?? 0),
    log: log.map(toReferralLogEntry),
    settings,
  }
})
