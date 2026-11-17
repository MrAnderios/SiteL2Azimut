import { forumCategory } from '#shared/forum'

export default defineEventHandler(async (event): Promise<{ id: number }> => {
  const master = await requireMaster(event)
  // Первые сутки — одна тема в час, дальше обычные пять.
  const fresh = !isAdminLogin(master.login) && await isFreshForumAccount(master.id)
  rateLimit(`forum:topic:${master.id}`, fresh ? 1 : 5, 60 * 60)
  await requireForumName(master.id)

  const body = await readJson(event)
  const category = forumCategory(str(body.category))
  if (!category) fail(404, 'unknown_category')
  if (category.staffOnly && !isAdminLogin(master.login)) fail(403, 'forbidden')

  const title = normalizeTitle(str(body.title))
  const text = normalizeBody(str(body.body))
  validateTitle(title)
  validateBody(text)

  return { id: await createTopic(master, category.slug, title, text) }
})
