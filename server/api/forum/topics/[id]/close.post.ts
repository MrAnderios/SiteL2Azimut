export default defineEventHandler(async (event): Promise<{ ok: true }> => {
  await requireAdmin(event)
  const topicId = int(getRouterParam(event, 'id'))
  if (!Number.isFinite(topicId) || topicId < 1) fail(404, 'topic_not_found')
  const closed = (await readJson(event)).closed
  if (typeof closed !== 'boolean') fail(400, 'invalid_post')
  await setTopicClosed(topicId, closed)
  return { ok: true }
})
