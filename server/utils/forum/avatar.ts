import { realpathSync } from 'node:fs'
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { join, sep } from 'node:path'
import { forumLimits } from '#shared/forum'

const kinds = ['jpeg', 'png', 'gif', 'webp'] as const

export type ForumAvatarKind = typeof kinds[number]

const mime: Record<ForumAvatarKind, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
}

export function forumAvatarMime(kind: ForumAvatarKind): string {
  return mime[kind]
}

export function forumAvatarKindOf(value: string): ForumAvatarKind | null {
  return (kinds as readonly string[]).includes(value) ? value as ForumAvatarKind : null
}

/** Публичный адрес. v меняется при замене, чтобы браузер не показал старую картинку. */
export function forumAvatarUrl(name: string, kind: string, at: number): string | null {
  if (!at || !forumAvatarKindOf(kind)) return null
  return `/api/forum/avatars/${encodeURIComponent(name)}?v=${at}`
}

/** Тип по началу файла. Расширение и Content-Type клиент может подделать. */
export function detectForumAvatar(data: Buffer): ForumAvatarKind | null {
  if (data.length < 12 || data.length > forumLimits.avatarBytes) return null
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return 'jpeg'
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  if (data.subarray(0, 8).equals(png)) return 'png'
  const gif = data.subarray(0, 6).toString('ascii')
  if (gif === 'GIF87a' || gif === 'GIF89a') return 'gif'
  if (data.subarray(0, 4).toString('ascii') === 'RIFF' && data.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp'
  return null
}

/**
 * Локально — .data/forum-avatars. На сервере current указывает на релиз,
 * а старые релизы удаляются, поэтому файлы лежат рядом: /var/www/azimut/avatars.
 */
export function forumAvatarDir(): string {
  const configured = String(useRuntimeConfig().forumAvatarDir || '').trim()
  if (configured) return configured
  const cwd = realpathSync(process.cwd())
  const marker = `${sep}releases${sep}`
  const at = cwd.lastIndexOf(marker)
  if (at === -1) return join(cwd, '.data', 'forum-avatars')
  return join(cwd.slice(0, at), 'avatars')
}

function avatarPath(masterId: number, kind: ForumAvatarKind): string {
  return join(forumAvatarDir(), `${masterId}.${kind}`)
}

export async function saveForumAvatar(masterId: number, kind: ForumAvatarKind, data: Buffer): Promise<number> {
  const dir = forumAvatarDir()
  await mkdir(dir, { recursive: true })
  const dest = avatarPath(masterId, kind)
  const tmp = join(dir, `.${masterId}.${kind}.${process.pid}.tmp`)
  await writeFile(tmp, data)
  try {
    await rename(tmp, dest)
  }
  catch (e) {
    await unlink(tmp).catch(() => undefined)
    throw e
  }
  const at = now()
  const saved = await exec(
    cmsDb(),
    'UPDATE forum_profiles SET avatar = ?, avatar_at = ? WHERE master_id = ?',
    [kind, at, masterId],
  )
  if (!saved.affectedRows) {
    await unlink(dest).catch(() => undefined)
    fail(400, 'forum_name_required')
  }
  await Promise.all(kinds.filter(item => item !== kind).map(item => unlink(avatarPath(masterId, item)).catch(() => undefined)))
  return at
}

export async function removeForumAvatar(masterId: number): Promise<void> {
  await exec(cmsDb(), 'UPDATE forum_profiles SET avatar = \'\', avatar_at = 0 WHERE master_id = ?', [masterId])
  await Promise.all(kinds.map(kind => unlink(avatarPath(masterId, kind)).catch(() => undefined)))
}

export async function readForumAvatar(masterId: number, kind: ForumAvatarKind): Promise<Buffer | undefined> {
  try {
    return await readFile(avatarPath(masterId, kind))
  }
  catch {
    return
  }
}
