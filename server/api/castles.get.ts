// Публичный список замков для страницы /stats (контракт — docs/API.md).
// Владение замком хранится не в castle, а в clan_data.hasCastle (id замка),
// название клана — в clan_subpledges (type = 0), альянс — в ally_data.
// CORS открыт, ответ кешируется на 60 секунд.
import { gameServers } from '#shared/cabinet'

/** Игровая база, из которой берётся статистика (id сервера из shared/cabinet.ts). */
const serverId = gameServers[0].id

interface CastleRow {
  id: number
  name: string
  tax: number | string
  siegeDate: number | string | null
  owner: string | null
  ally: string | null
  leader: string | null
}

interface Castle {
  id: number
  name: string
  owner: string | null
  ally: string | null
  leader: string | null
  tax: number
  siegeAt: string | null
}

const CACHE_MS = 60_000
let cache: { at: number, castles: Castle[] } | undefined

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'access-control-allow-origin', '*')

  const now = Date.now()
  if (cache && now - cache.at < CACHE_MS) {
    return { updatedAt: new Date(cache.at).toISOString(), castles: cache.castles }
  }

  let castles: Castle[]
  try {
    const list = await rows<CastleRow>(
      gameDb(serverId),
      `SELECT c.id,
              c.name,
              c.tax_percent AS tax,
              c.siege_date AS siegeDate,
              sp.name AS owner,
              ad.ally_name AS ally,
              ch.char_name AS leader
         FROM castle c
         LEFT JOIN clan_data cd ON cd.hasCastle = c.id AND cd.hasCastle <> 0
         LEFT JOIN clan_subpledges sp ON sp.clan_id = cd.clan_id AND sp.type = 0
         LEFT JOIN ally_data ad ON ad.ally_id = cd.ally_id AND cd.ally_id <> 0
         LEFT JOIN characters ch ON ch.obj_Id = sp.leader_id
        ORDER BY c.id`,
    )
    castles = list.map(c => ({
      id: Number(c.id),
      name: c.name,
      owner: c.owner ?? null,
      ally: c.ally ?? null,
      leader: c.leader ?? null,
      tax: Number(c.tax) || 0,
      siegeAt: Number(c.siegeDate) > 0 ? new Date(Number(c.siegeDate)).toISOString() : null,
    }))
    cache = { at: now, castles }
  }
  catch (e) {
    console.error('[castles] игровая база недоступна:', e)
    setResponseStatus(event, 503)
    return { error: 'database_unavailable' }
  }

  return { updatedAt: new Date(now).toISOString(), castles }
})
