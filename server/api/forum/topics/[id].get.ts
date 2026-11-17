// Тема целиком: первое сообщение и ответы с пагинацией (публично). Увеличивает счётчик просмотров.
import type { ForumTopicResponse } from '#shared/forum'

export default defineEventHandler(async (event): Promise<ForumTopicResponse> => {
  const id = int(getRouterParam(event, 'id'))
  if (Number.isNaN(id)) fail(404, 'topic_not_found')
  const { page, limit, offset } = pagination(getQuery(event))
  const db = cmsDb()

  try {
    const topic = await getTopic(db, id)
    if (!topic) fail(404, 'topic_not_found')
    // Просмотр не должен мешать чтению темы, если счётчик не обновился
    await exec(db, 'UPDATE forum_topics SET view_count = view_count + 1 WHERE id = ?', [id]).catch(() => {})
    const total = await countPosts(db, id) + 1
    const posts = await listPosts(db, id, offset, limit)
    return { topic, posts, page, pages: pages(total), total }
  }
  catch (e) {
    forumFail(e)
  }
})