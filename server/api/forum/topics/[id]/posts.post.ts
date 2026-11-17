export default defineEventHandler(async (event): Promise<{ page: number }> => {
  const master = await requireMaster(event)
  // Первые сутки — три ответа за 10 минут, дальше тридцать в час.
  const fresh = !isAdminLogin(master.login) && await isFreshForumAccount(master.id)
  rateLimit(`forum:post:${master.id}`, fresh ? 3 : 30, fresh ? 10 * 60 : 60 * 60)
  await requireForumName(master.id)

  const topicId = forumParamId(event, 'id', 'topic_not_found')
  const text = normalizeBody(str((await readJson(event)).body))
  validateBody(text)
  return { page: await createPost(master, topicId, text, isAdminLogin(master.login)) }
})
