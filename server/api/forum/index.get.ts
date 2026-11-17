// Список разделов форума (публично). Пока таблицы не созданы — 503 forum_unavailable.
import type { ForumIndexResponse } from '#shared/forum'

export default defineEventHandler(async (): Promise<ForumIndexResponse> => {
  try {
    return { sections: await listSections(cmsDb()) }
  }
  catch (e) {
    forumFail(e)
  }
})