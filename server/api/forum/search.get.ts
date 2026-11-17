import type { ForumSearchPage } from '#shared/forum'

export default defineEventHandler(async (event): Promise<ForumSearchPage> => {
  // Поиск без входа и с LIKE по заголовкам. Лимит по IP, чтобы не крутить запрос пачками.
  rateLimit(`forum:search:${clientIp(event)}`, 30, 60)
  const query = getQuery(event)
  const q = typeof query.q === 'string' ? query.q : ''
  const category = typeof query.category === 'string' ? query.category : ''
  return forumSearch(q, category)
})
