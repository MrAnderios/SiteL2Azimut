// Удаление предмета из набора реферальной награды
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = int(getRouterParam(event, 'id'))
  if (!(id > 0)) fail(400, 'invalid_item')
  await exec(cmsDb(), 'DELETE FROM referral_reward_items WHERE id = ?', [id])
  return { id }
})
