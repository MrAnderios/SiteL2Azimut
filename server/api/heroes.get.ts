// Публичный список героев для страницы /stats (контракт — docs/API.md).
// Текущие герои — строки heroes с played = 1 (active = 1 означает, что игрок уже
// активировал геройский статус). Класс и уровень берём из активного сабкласса.
// CORS открыт, ответ кешируется на 60 секунд.
import { gameServers, l2Classes } from '#shared/cabinet'

/** Игровая база, из которой берётся статистика (id сервера из shared/cabinet.ts). */
const serverId = gameServers[0].id

interface HeroRow {
  name: string
  level: number | null
  classId: number | null
  online: number | string
  count: number | string
  clan: string | null
  ally: string | null
}

interface Hero {
  name: string
  level: number
  classId: number
  className: string
  clan: string | null
  ally: string | null
  online: boolean
  /** Сколько раз персонаж становился героем (подряд). */
  count: number
}

const CACHE_MS = 60_000
let cache: { at: number, heroes: Hero[] } | undefined

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'access-control-allow-origin', '*')

  const now = Date.now()
  if (cache && now - cache.at < CACHE_MS) {
    return { updatedAt: new Date(cache.at).toISOString(), heroes: cache.heroes }
  }

  let heroes: Hero[]
  try {
    const list = await rows<HeroRow>(
      gameDb(serverId),
      `SELECT ch.char_name AS name,
              sc.level AS level,
              sc.class_id AS classId,
              ch.online AS online,
              h.count AS count,
              sp.name AS clan,
              ad.ally_name AS ally
         FROM heroes h
         JOIN characters ch ON ch.obj_Id = h.char_id
         LEFT JOIN character_subclasses sc ON sc.char_obj_id = h.char_id AND sc.active = 1
         LEFT JOIN clan_data cd ON cd.clan_id = ch.clanid
         LEFT JOIN clan_subpledges sp ON sp.clan_id = ch.clanid AND sp.type = 0
         LEFT JOIN ally_data ad ON ad.ally_id = cd.ally_id AND cd.ally_id <> 0
        WHERE h.played = 1
        ORDER BY COALESCE(sc.level, 0) DESC, h.count DESC, ch.char_name`,
    )
    heroes = list.map(h => ({
      name: h.name,
      level: Number(h.level) || 0,
      classId: Number(h.classId) || 0,
      className: l2Classes[Number(h.classId)] ?? `Class ${Number(h.classId) || 0}`,
      clan: h.clan ?? null,
      ally: h.ally ?? null,
      online: Number(h.online) === 1,
      count: Number(h.count) || 1,
    }))
    cache = { at: now, heroes }
  }
  catch (e) {
    console.error('[heroes] игровая база недоступна:', e)
    setResponseStatus(event, 503)
    return { error: 'database_unavailable' }
  }

  return { updatedAt: new Date(now).toISOString(), heroes }
})
