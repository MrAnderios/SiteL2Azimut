export default defineEventHandler(async (event): Promise<{ ok: true }> => {
  const master = await requireMaster(event)
  const postId = forumParamId(event, 'id', 'post_not_found')

  const body = await readJson(event)
  if ('body' in body && !isAdminLogin(master.login)) rateLimit(`forum:edit:${master.id}`, 30, 60 * 60)
  const patch: { body?: string, hidden?: boolean } = {}
  if ('body' in body) {
    patch.body = normalizeBody(str(body.body))
    validateBody(patch.body)
  }
  if ('hidden' in body) {
    patch.hidden = forumBool(body.hidden)
    if (patch.hidden) fail(400, 'invalid_post')
  }
  if (patch.body === undefined && patch.hidden === undefined) fail(400, 'invalid_post')

  await updatePost(master, postId, patch, isAdminLogin(master.login))
  return { ok: true }
})
