import type { ForumIndex } from '#shared/forum'

export default defineEventHandler(async (): Promise<ForumIndex> => {
  return forumIndex()
})
