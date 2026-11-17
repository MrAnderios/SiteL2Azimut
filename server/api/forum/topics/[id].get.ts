import type { ForumTopicPage } from '#shared/forum'

export default defineEventHandler(async (event): Promise<ForumTopicPage> => {
  const id = forumParamId(event, 'id', 'topic_not_found')
  const user = await getSessionUser(event)
  return forumTopic(id, forumPage(event), user)
})
