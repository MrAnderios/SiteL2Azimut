import type { ForumCategoryPage } from '#shared/forum'

export default defineEventHandler(async (event): Promise<ForumCategoryPage> => {
  return forumTopics(getRouterParam(event, 'slug') || '', forumPage(event))
})
