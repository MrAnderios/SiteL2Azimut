export default defineEventHandler(async (event): Promise<{ banned: boolean }> => {
  const admin = await requireAdmin(event)
  const masterId = forumParamId(event, 'masterId', 'master_not_found')
  const banned = forumBool((await readJson(event)).banned)
  await setForumBanned(admin.id, masterId, banned)
  return { banned }
})
