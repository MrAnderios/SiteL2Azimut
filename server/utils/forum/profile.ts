import type { ForumMe } from '#shared/forum'

interface ForumProfile {
  name: string
  banned: boolean
  avatar: string
  avatarAt: number
}

async function forumProfile(masterId: number): Promise<ForumProfile | undefined> {
  const found = await row<{ name: string, banned: number, avatar: string, avatarAt: number }>(
    cmsDb(),
    'SELECT name, banned, avatar, avatar_at AS avatarAt FROM forum_profiles WHERE master_id = ?',
    [masterId],
  )
  if (!found) return
  return { name: found.name, banned: found.banned === 1, avatar: found.avatar, avatarAt: Number(found.avatarAt) }
}

export async function forumProfileName(masterId: number): Promise<string | undefined> {
  return (await forumProfile(masterId))?.name
}

/** Имя в базе уникально. Сравнение без учёта регистра — так устроена колонка. */
export async function forumProfileByName(name: string): Promise<{
  id: number
  name: string
  banned: boolean
  avatar: string
  avatarAt: number
} | undefined> {
  const found = await row<{ id: number, name: string, banned: number, avatar: string, avatarAt: number }>(
    cmsDb(),
    'SELECT master_id AS id, name, banned, avatar, avatar_at AS avatarAt FROM forum_profiles WHERE name = ?',
    [name],
  )
  if (!found) return
  return {
    id: Number(found.id),
    name: found.name,
    banned: found.banned === 1,
    avatar: found.avatar,
    avatarAt: Number(found.avatarAt),
  }
}

/** Забаненный не создаёт темы, не отвечает и не правит текст. Администратора бан не касается. */
export async function assertForumWriter(masterId: number): Promise<void> {
  const found = await row<{ banned: number, login: string | null }>(cmsDb(), `
    SELECT p.banned, a.login
    FROM forum_profiles p
    LEFT JOIN master_accounts a ON a.id = p.master_id
    WHERE p.master_id = ?
  `, [masterId])
  if (!found || found.banned !== 1) return
  if (found.login && isAdminLogin(found.login)) return
  fail(403, 'forum_banned')
}

/** Имя для записи. Нет профиля — 400, писать нельзя. */
export async function requireForumName(masterId: number): Promise<string> {
  const name = await forumProfileName(masterId)
  if (!name) fail(400, 'forum_name_required')
  return name
}

export async function forumMe(event: Parameters<typeof getSessionUser>[0]): Promise<ForumMe> {
  const user = await getSessionUser(event)
  if (!user) return { name: null, isAdmin: false, authenticated: false, banned: false, avatar: null }
  const profile = await forumProfile(user.id)
  return {
    name: profile?.name ?? null,
    isAdmin: user.isAdmin,
    authenticated: true,
    banned: !user.isAdmin && !!profile?.banned,
    avatar: profile ? forumAvatarUrl(profile.name, profile.avatar, profile.avatarAt) : null,
  }
}

export async function createForumProfile(masterId: number, name: string): Promise<void> {
  try {
    await exec(cmsDb(), 'INSERT INTO forum_profiles (master_id, name, created_at) VALUES (?, ?, ?)', [masterId, name, now()])
  }
  catch (e) {
    failIfBadForumText(e, 'invalid_forum_name')
    if (!isDuplicateKey(e)) throw e
    if (await forumProfileName(masterId)) fail(409, 'forum_name_locked')
    fail(409, 'forum_name_taken')
  }
}

/** Запрещает или снова разрешает писать. Своего аккаунта и других администраторов это не касается. */
export async function setForumBanned(actorId: number, masterId: number, banned: boolean): Promise<void> {
  if (masterId === actorId) fail(403, 'cannot_ban_admin')
  const found = await row<{ login: string | null }>(cmsDb(), `
    SELECT a.login
    FROM forum_profiles p
    LEFT JOIN master_accounts a ON a.id = p.master_id
    WHERE p.master_id = ?
  `, [masterId])
  if (!found) fail(404, 'master_not_found')
  if (found.login && isAdminLogin(found.login)) fail(403, 'cannot_ban_admin')
  await exec(cmsDb(), 'UPDATE forum_profiles SET banned = ? WHERE master_id = ?', [banned ? 1 : 0, masterId])
}

export async function renameForumProfile(masterId: number, name: string): Promise<void> {
  if (!await forumProfileName(masterId)) fail(404, 'master_not_found')
  try {
    await exec(cmsDb(), 'UPDATE forum_profiles SET name = ? WHERE master_id = ?', [name, masterId])
  }
  catch (e) {
    failIfBadForumText(e, 'invalid_forum_name')
    if (isDuplicateKey(e)) fail(409, 'forum_name_taken')
    throw e
  }
}

const freshAccountSec = 24 * 60 * 60

/** Первые сутки после регистрации. Серия новых аккаунтов не должна заливать форум. */
export async function isFreshForumAccount(masterId: number): Promise<boolean> {
  const found = await row<{ createdAt: number }>(cmsDb(), 'SELECT created_at AS createdAt FROM master_accounts WHERE id = ?', [masterId])
  const createdAt = Number(found?.createdAt ?? 0)
  return createdAt > 0 && now() - createdAt < freshAccountSec
}
