export default defineEventHandler(async (event): Promise<{ ok: true }> => {
  await requireAdmin(event)
  const topicId = forumParamId(event, 'id', 'topic_not_found')
  await setTopicClosed(topicId, forumBool((await readJson(event)).closed))
  return { ok: true }
})
