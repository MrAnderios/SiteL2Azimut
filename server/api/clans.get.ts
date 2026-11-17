// Публичный топ кланов для страницы /stats (контракт — docs/API.md).
// Название и лидер клана — в clan_subpledges (type = 0), альянс — в ally_data,
// замок — в castle (clan_data.hasCastle). Состав и PvP считаются по characters.
// CORS открыт, ответ кешируется на 60 секунд отдельно для каждого среза.
import { gameServers } from '#shared/cabinet'

/** Игровая база, из которой берётся статистика (id сервера из shared/cabinet.ts). */
const serverId = gameServers[0].id

interface Clan {
  rank: number
  id: number
  name: string
  level: number
  reputation: number
  leader: string | null
  members: number
  ally: string | null
  castle: string | null
  pvp: number
}

type ClanRow = Omit<Clan, 'rank'>

/**
 * ORDER BY для каждого среза. members и pvp — агрегаты по персонажам клана,
 * поэтому в ORDER BY можно ссылаться на их алиасы.
 */
const SORTS = {
  level: 'cd.clan_level DESC, cd.reputation_score DESC, members DESC, sp.name',
  reputation: 'cd.reputation_score DESC, cd.clan_level DESC, members DESC, sp.name',
  members: 'members DESC, cd.clan_level DESC, cd.reputation_score DESC, sp.name',
  pvp: 'pvp DESC, members DESC, cd.clan_level DESC, sp.name',
} as const

type ClanType = keyof typeof SORTS

const CACHE_MS = 60_000
const cache = new Map<string, { at: number, clans: ClanRow[] }>()

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'access-control-allow-origin', '*')

  const query = getQuery(event)
  const type: ClanType = typeof query.type === 'string' && query.type in SORTS ? query.type as ClanType : 'level'
  const rawLimit = Number(query.limit)
  const limit = Number.isFinite(rawLimit) ? Math.min(100, Math.max(1, Math.trunc(rawLimit))) : 20

  const key = `${type}:${limit}`
  const now = Date.now()
  const hit = cache.get(key)
  let clans = hit && now - hit.at < CACHE_MS ? hit.clans : undefined

  if (!clans) {
    try {
      const list = await rows<ClanRow>(
        gameDb(serverId),
        `SELECT cd.clan_id AS id,
                sp.name AS name,
                cd.clan_level AS level,
                cd.reputation_score AS reputation,
                ch.char_name AS leader,
                COUNT(c.obj_Id) AS members,
                ad.ally_name AS ally,
                ca.name AS castle,
                COALESCE(SUM(c.pvpkills), 0) AS pvp
           FROM clan_data cd
           JOIN clan_subpledges sp ON sp.clan_id = cd.clan_id AND sp.type = 0
           LEFT JOIN characters ch ON ch.obj_Id = sp.leader_id
           LEFT JOIN ally_data ad ON ad.ally_id = cd.ally_id AND cd.ally_id <> 0
           LEFT JOIN castle ca ON ca.id = cd.hasCastle AND cd.hasCastle <> 0
           LEFT JOIN characters c ON c.clanid = cd.clan_id AND c.deletetime = 0
          GROUP BY cd.clan_id, sp.name, cd.clan_level, cd.reputation_score,
                   ch.char_name, ad.ally_name, ca.name
          ORDER BY ${SORTS[type]}
          LIMIT ?`,
        [limit],
      )
      clans = list.map(c => ({
        id: Number(c.id),
        name: c.name,
        level: Number(c.level) || 0,
        reputation: Number(c.reputation) || 0,
        leader: c.leader ?? null,
        members: Number(c.members) || 0,
        ally: c.ally ?? null,
        castle: c.castle ?? null,
        pvp: Number(c.pvp) || 0,
      }))
      cache.set(key, { at: now, clans })
    }
    catch (e) {
      console.error('[clans] игровая база недоступна:', e)
      setResponseStatus(event, 503)
      return { error: 'database_unavailable' }
    }
  }

  return {
    type,
    limit,
    updatedAt: new Date().toISOString(),
    clans: clans.map<Clan>((c, i) => ({ ...c, rank: i + 1 })),
  }
})
