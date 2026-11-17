import type { ForumMe } from '#shared/forum'

export default defineEventHandler(async (event): Promise<ForumMe> => {
  return forumMe(event)
})
