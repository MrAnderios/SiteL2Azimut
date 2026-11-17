export default defineEventHandler(async (event) => {
  const raw = getRouterParam(event, 'name') || ''
  let name = raw
  try {
    name = decodeURIComponent(raw)
  }
  catch {}
  const profile = await forumProfileByName(normalizeForumName(name))
  const kind = profile && forumAvatarKindOf(profile.avatar)
  if (!profile || !kind || !profile.avatarAt) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }
  const data = await readForumAvatar(profile.id, kind)
  if (!data) throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  setResponseHeaders(event, {
    'content-type': forumAvatarMime(kind),
    'x-content-type-options': 'nosniff',
    'content-security-policy': 'default-src \'none\'',
    'cache-control': 'public, max-age=31536000, immutable',
  })
  return data
})
