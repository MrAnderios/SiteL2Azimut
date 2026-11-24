import type { ReferralLogKind, ReferralType } from '#shared/cabinet'

// Сброс записи журнала: удаляем лог и claim, чтобы награду можно было выдать снова
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = int(getRouterParam(event, 'id'))
  if (!(id > 0)) fail(400, 'invalid_item')

  const db = cmsDb()
  const entry = await row<{
    kind: ReferralLogKind
    master_id: number
    referred_id: number
    type: ReferralType | 'commission'
  }>(db, 'SELECT kind, master_id, referred_id, type FROM referral_rewards_log WHERE id = ?', [id])
  if (!entry) fail(404, 'invalid_item')

  await transaction(db, async (conn) => {
    await exec(conn, 'DELETE FROM referral_rewards_log WHERE id = ?', [id])

    if (entry.kind === 'player') {
      await exec(conn, 'DELETE FROM referral_claims WHERE kind = ? AND account_id = ? AND type = ?',
        ['player', entry.master_id, entry.type])
    }
    else if (entry.kind === 'referrer') {
      await exec(conn, 'DELETE FROM referral_claims WHERE kind = ? AND account_id = ? AND type = ?',
        ['referrer', entry.referred_id, entry.type])
    }
  })

  return { id }
})