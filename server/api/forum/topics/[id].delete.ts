export default defineEventHandler(async (event): Promise<{ ok: true }> => {
  const master = await requireMaster(event)
  const topicId = int(getRouterParam(event, 'id'))
  if (!Number.isFinite(topicId) || topicId < 1) fail(404, 'topic_not_found')
  await deleteTopic(master, topicId, isAdminLogin(master.login))
  return { ok: true }
})
