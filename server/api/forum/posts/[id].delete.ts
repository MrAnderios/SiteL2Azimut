export default defineEventHandler(async (event): Promise<{ topicDeleted: boolean, slug: string }> => {
  const master = await requireMaster(event)
  const staff = isAdminLogin(master.login)
  if (!staff) rateLimit(`forum:delete:${master.id}`, 30, 60 * 60)
  const postId = forumParamId(event, 'id', 'post_not_found')
  return deletePost(master, postId, staff)
})
