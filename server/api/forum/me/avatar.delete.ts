export default defineEventHandler(async (event): Promise<{ avatar: null }> => {
  const master = await requireMaster(event)
  rateLimit(`forum:avatar:${master.id}`, 10, 60 * 60)
  await requireForumName(master.id)
  await removeForumAvatar(master.id)
  return { avatar: null }
})
