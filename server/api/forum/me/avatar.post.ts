import { forumLimits } from '#shared/forum'

// У multipart к файлу добавляются границы и заголовки.
const bodySlack = 16 * 1024

export default defineEventHandler(async (event): Promise<{ avatar: string }> => {
  const master = await requireMaster(event)
  rateLimit(`forum:avatar:${master.id}`, 10, 60 * 60)
  const name = await requireForumName(master.id)

  const declared = Number(getRequestHeader(event, 'content-length') || '')
  if (Number.isFinite(declared) && declared > forumLimits.avatarBytes + bodySlack) {
    fail(413, 'avatar_too_large', { max: 1 })
  }
  if (!Number.isFinite(declared) || declared < 1) fail(400, 'invalid_avatar')

  const parts = await readMultipartFormData(event)
  const file = parts?.find(part => part.name === 'avatar' && part.data?.length)
  if (!file) fail(400, 'invalid_avatar')
  if (file.data.length > forumLimits.avatarBytes) fail(413, 'avatar_too_large', { max: 1 })
  const kind = detectForumAvatar(file.data)
  if (!kind) fail(400, 'invalid_avatar')

  const at = await saveForumAvatar(master.id, kind, file.data)
  const avatar = forumAvatarUrl(name, kind, at)
  if (!avatar) fail(500, 'server_error')
  return { avatar }
})
