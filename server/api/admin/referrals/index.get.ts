import type { AdminReferrals } from '#shared/cabinet'
import { referralRewardKeys } from '#shared/cabinet'

// Настройки реферальной программы, предметы наград, топ рефереров и журнал
export default defineEventHandler(async (event): Promise<AdminReferrals> => {
  await requireAdmin(event)
  const db = cmsDb()

  const [settings, items, top, log] = await Promise.all([
    loadReferralSettings(db),
    rows<{ id: number, reward_key: string, item_id: number, count: number }>(db,
      'SELECT id, reward_key, item_id, count FROM referral_reward_items ORDER BY sort, id'),
    rows<{ login: string, invites: number, earned: number }>(db,
      `SELECT m.login,
              (SELECT COUNT(*) FROM referral_relations rr WHERE rr.referrer_id = m.id) AS invites,
              (SELECT COALESCE(SUM(l.coin_amount), 0) FROM referral_rewards_log l
                WHERE l.master_id = m.id AND l.kind IN ('referrer', 'commission')) AS earned
         FROM master_accounts m
        WHERE m.id IN (SELECT DISTINCT referrer_id FROM referral_relations)
        ORDER BY earned DESC
        LIMIT 100`),
    rows<ReferralLogRow & { master_login: string | null, referred_login: string | null }>(db,
      `SELECT l.*, m.login AS master_login, r.login AS referred_login
         FROM referral_rewards_log l
         LEFT JOIN master_accounts m ON m.id = l.master_id
         LEFT JOIN master_accounts r ON r.id = l.referred_id
        ORDER BY l.id DESC LIMIT 50`),
  ])

  const grouped = Object.fromEntries(referralRewardKeys.map(k => [k, [] as AdminReferrals['items'][typeof k]])) as AdminReferrals['items']
  for (const i of items) {
    grouped[i.reward_key as keyof typeof grouped]?.push({ id: i.id, itemId: Number(i.item_id), count: Number(i.count) })
  }

  return {
    settings,
    items: grouped,
    top: top.map(t => ({ login: t.login, invites: Number(t.invites), earned: Number(t.earned) })),
    log: log.map(l => ({ ...toReferralLogEntry(l), masterLogin: l.master_login, referredLogin: l.referred_login })),
  }
})
