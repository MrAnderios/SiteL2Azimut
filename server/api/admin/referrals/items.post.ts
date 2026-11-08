import { referralRewardKeys } from '#shared/cabinet'

// Добавление предмета в набор реферальной награды
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readJson(event)
  const rewardKey = str(body.rewardKey)
  const itemId = int(body.itemId)
  const count = int(body.count)

  if (!referralRewardKeys.includes(rewardKey as typeof referralRewardKeys[number])) fail(400, 'invalid_reward_key')
  if (!(itemId >= 1) || !(count >= 1)) fail(400, 'invalid_item')

  const db = cmsDb()
  const last = await row<{ sort: number }>(db, 'SELECT COALESCE(MAX(sort), 0) + 1 AS sort FROM referral_reward_items WHERE reward_key = ?', [rewardKey])
  const res = await exec(db, 'INSERT INTO referral_reward_items (reward_key, item_id, count, sort) VALUES (?, ?, ?, ?)',
    [rewardKey, itemId, count, Number(last?.sort ?? 1)])
  return { id: res.insertId }
})
