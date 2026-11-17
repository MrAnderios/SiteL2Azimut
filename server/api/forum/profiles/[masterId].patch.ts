export default defineEventHandler(async (event): Promise<{ name: string }> => {
  await requireAdmin(event)
  const masterId = int(getRouterParam(event, 'masterId'))
  if (!Number.isFinite(masterId) || masterId < 1) fail(404, 'master_not_found')
  const name = normalizeForumName(str((await readJson(event)).name))
  validateForumName(name)
  await renameForumProfile(masterId, name)
  return { name }
})
