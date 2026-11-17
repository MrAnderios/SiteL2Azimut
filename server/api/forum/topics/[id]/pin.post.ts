export default defineEventHandler(async (event): Promise<{ ok: true }> => {
  await requireAdmin(event)
  const topicId = forumParamId(event, 'id', 'topic_not_found')
  await setTopicPinned(topicId, forumBool((await readJson(event)).pinned))
  return { ok: true }
})
