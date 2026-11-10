// Публичный топ игроков для страницы /stats (контракт — docs/API.md).
// CORS открыт, ответ кешируется на 60 секунд отдельно для каждого среза.
import { gameServers, l2Classes } from '#shared/cabinet'

/** Игровая база, из которой берётся статистика (id сервера из shared/cabinet.ts). */
const serverId = gameServers[0].id

interface TopPlayer {
  rank: number
  name: string
  level: number
  exp: number
  classId: number
  className: string
  pvp: number
  pk: number
  online: boolean
}

type PlayerRow = Omit<TopPlayer, 'rank' | 'className'>

/**
 * ORDER BY для каждого среза. Уровень, опыт и класс хранятся в character_subclasses
 * (активный сабкласс), PvP/PK — в characters (pvpkills/pkkills).
 */
const SORTS = {
  level: 'sc.level DESC, sc.exp DESC',
  pvp: 'c.pvpkills DESC, sc.level DESC, sc.exp DESC',
  pk: 'c.pkkills DESC, sc.level DESC, sc.exp DESC',
} as const

type TopType = keyof typeof SORTS

const CACHE_MS = 60_000
const cache = new Map<string, { at: number, players: PlayerRow[] }>()

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'access-control-allow-origin', '*')

  const query = getQuery(event)
  const type: TopType = typeof query.type === 'string' && query.type in SORTS ? query.type as TopType : 'level'
  const rawLimit = Number(query.limit)
  const limit = Number.isFinite(rawLimit) ? Math.min(100, Math.max(1, Math.trunc(rawLimit))) : 10

  const key = `${type}:${limit}`
  const now = Date.now()
  const hit = cache.get(key)
  let players = hit && now - hit.at < CACHE_MS ? hit.players : undefined

  if (!players) {
    try {
      const list = await rows<PlayerRow>(
        gameDb(serverId),
        `SELECT c.char_name AS name,
                sc.level AS level,
                sc.exp AS exp,
                sc.class_id AS classId,
                c.pvpkills AS pvp,
                c.pkkills AS pk,
                c.online AS online
           FROM characters c
           JOIN character_subclasses sc ON sc.char_obj_id = c.obj_Id AND sc.active = 1
          WHERE c.accesslevel = 0 AND c.deletetime = 0
          ORDER BY ${SORTS[type]}
          LIMIT ?`,
        [limit],
      )
      players = list.map(p => ({
        name: p.name,
        level: Number(p.level) || 0,
        exp: Number(p.exp) || 0,
        classId: Number(p.classId) || 0,
        pvp: Number(p.pvp) || 0,
        pk: Number(p.pk) || 0,
        online: Number(p.online) === 1,
      }))
      cache.set(key, { at: now, players })
    }
    catch (e) {
      console.error('[top] игровая база недоступна:', e)
      setResponseStatus(event, 503)
      return { error: 'database_unavailable' }
    }
  }

  return {
    type,
    limit,
    updatedAt: new Date().toISOString(),
    players: players.map<TopPlayer>((p, i) => ({
      ...p,
      rank: i + 1,
      className: l2Classes[p.classId] ?? `Class ${p.classId}`,
    })),
  }
})
