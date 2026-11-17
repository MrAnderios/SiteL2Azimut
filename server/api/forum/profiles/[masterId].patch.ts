export default defineEventHandler(async (event): Promise<{ name: string }> => {
  await requireAdmin(event)
  const masterId = forumParamId(event, 'masterId', 'master_not_found')
  const name = normalizeForumName(str((await readJson(event)).name))
  validateForumName(name)
  await renameForumProfile(masterId, name)
  return { name }
})
