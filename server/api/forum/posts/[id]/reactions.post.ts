import { forumReactionKind } from '#shared/forum'

export default defineEventHandler(async (event): Promise<{ ok: true }> => {
  const master = await requireMaster(event)
  if (!isAdminLogin(master.login)) rateLimit(`forum:react:${master.id}`, 60, 10 * 60)
  const postId = forumParamId(event, 'id', 'post_not_found')
  const kind = forumReactionKind(str((await readJson(event)).kind))
  if (!kind) fail(400, 'invalid_reaction')
  await togglePostReaction(master, postId, kind)
  return { ok: true }
})
