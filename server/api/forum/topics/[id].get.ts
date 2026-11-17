import type { ForumTopicPage } from '#shared/forum'

export default defineEventHandler(async (event): Promise<ForumTopicPage> => {
  const id = int(getRouterParam(event, 'id'))
  if (!Number.isFinite(id) || id < 1) fail(404, 'topic_not_found')
  const user = await getSessionUser(event)
  return forumTopic(id, forumPage(event), user)
})
