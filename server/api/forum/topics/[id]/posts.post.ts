export default defineEventHandler(async (event): Promise<{ page: number }> => {
  const master = await requireMaster(event)
  // Первые сутки — пять ответов в час, дальше обычные тридцать.
  const fresh = !isAdminLogin(master.login) && await isFreshForumAccount(master.id)
  rateLimit(`forum:post:${master.id}`, fresh ? 5 : 30, 60 * 60)
  await requireForumName(master.id)

  const topicId = int(getRouterParam(event, 'id'))
  if (!Number.isFinite(topicId) || topicId < 1) fail(404, 'topic_not_found')
  const text = normalizeBody(str((await readJson(event)).body))
  validateBody(text)
  return { page: await createPost(master, topicId, text, isAdminLogin(master.login)) }
})
