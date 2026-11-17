export default defineEventHandler(async (event): Promise<{ ok: true }> => {
  const master = await requireMaster(event)
  const topicId = forumParamId(event, 'id', 'topic_not_found')
  await deleteTopic(master, topicId, isAdminLogin(master.login))
  return { ok: true }
})
