export default defineEventHandler(async (event): Promise<{ ok: true }> => {
  await requireAdmin(event)
  const topicId = int(getRouterParam(event, 'id'))
  if (!Number.isFinite(topicId) || topicId < 1) fail(404, 'topic_not_found')
  const pinned = (await readJson(event)).pinned
  if (typeof pinned !== 'boolean') fail(400, 'invalid_post')
  await setTopicPinned(topicId, pinned)
  return { ok: true }
})
