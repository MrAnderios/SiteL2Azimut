// Раздел форума и его темы с пагинацией (публично).
import type { ForumSectionResponse } from '#shared/forum'

export default defineEventHandler(async (event): Promise<ForumSectionResponse> => {
  const id = int(getRouterParam(event, 'id'))
  if (Number.isNaN(id)) fail(404, 'section_not_found')
  const { page, limit, offset } = pagination(getQuery(event))
  const db = cmsDb()

  try {
    const section = await getSection(db, id)
    if (!section) fail(404, 'section_not_found')
    const total = await countTopics(db, id)
    const topics = await listTopics(db, id, offset, limit)
    return { section, topics, page, pages: pages(total), total }
  }
  catch (e) {
    forumFail(e)
  }
})