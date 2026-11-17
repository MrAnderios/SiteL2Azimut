export default defineEventHandler(async (event): Promise<{ name: string }> => {
  const master = await requireMaster(event)
  rateLimit(`forum:name:${master.id}`, 10, 60 * 60)
  const name = normalizeForumName(str((await readJson(event)).name))
  validateForumName(name)
  await createForumProfile(master.id, name)
  return { name }
})
