import type { ForumMemberPosts } from '#shared/forum'

export default defineEventHandler(async (event): Promise<ForumMemberPosts> => {
  const user = await getSessionUser(event)
  return forumMemberPosts(getRouterParam(event, 'name') || '', forumPage(event), !!user?.isAdmin)
})
