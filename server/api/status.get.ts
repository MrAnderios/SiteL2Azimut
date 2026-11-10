// Публичный статус игрового сервера для страницы /stats (контракт — docs/API.md).
// CORS открыт, ответ кешируется на 15 секунд.
import { gameServerName } from '#shared/cabinet'

interface StatusPayload {
  server: string
  online: boolean
  status: 'online' | 'offline'
  playersOnline: number | null
  updatedAt: string
}

const CACHE_MS = 15_000
let cache: { at: number, payload: StatusPayload } | undefined

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'access-control-allow-origin', '*')

  const now = Date.now()
  if (cache && now - cache.at < CACHE_MS) {
    return cache.payload
  }

  const { db, gameDb: game, gameServer } = useRuntimeConfig()

  // Игроки в игре; null — если игровая база недоступна
  let playersOnline: number | null = null
  try {
    const stats = await row<{ n: number | string }>(
      gameDb('la2x'),
      'SELECT COUNT(*) AS n FROM characters WHERE online = 1',
    )
    playersOnline = Number(stats?.n ?? 0)
  }
  catch (e) {
    console.error('[status] игровая база недоступна:', e)
  }

  // Онлайн = игровой порт принимает подключения. Порт может быть закрыт файрволом
  // со стороны сайта, поэтому наличие игроков в базе тоже считаем признаком живого сервера.
  const host = gameServer.host || game.host || db.host
  const port = Number(gameServer.port) || 7777
  const reachable = host ? await portOpen(host, port, 1500) : false
  const online = reachable || (playersOnline ?? 0) > 0

  const payload: StatusPayload = {
    server: gameServerName('la2x'),
    online,
    status: online ? 'online' : 'offline',
    playersOnline,
    updatedAt: new Date().toISOString(),
  }

  cache = { at: now, payload }
  return payload
})
