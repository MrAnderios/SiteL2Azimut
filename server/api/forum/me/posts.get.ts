import type { ForumOwnPosts } from '#shared/forum'

export default defineEventHandler(async (event): Promise<ForumOwnPosts> => {
  const master = await requireMaster(event)
  return forumOwnPosts(master.id, forumPage(event), isAdminLogin(master.login))
})
