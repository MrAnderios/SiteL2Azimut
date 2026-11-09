import type { CabinetOverview, GameAccount, GameAccountServer } from '#shared/cabinet'
import { gameServers } from '#shared/cabinet'

// Главная кабинета: баланс, игровые аккаунты и их персонажи на всех серверах
export default defineEventHandler(async (event): Promise<CabinetOverview> => {
  const master = await requireMaster(event)
  const logins = await gameAccountLogins(master.email)

  const perServer = await Promise.all(gameServers.map(async (s) => {
    try {
      return { server: s, chars: await charactersOf(s.id, logins) }
    }
    catch (e) {
      console.error(`[cabinet] персонажи с сервера ${s.id} недоступны:`, e)
      return { server: s, chars: null }
    }
  }))

  const accounts: GameAccount[] = logins.map(login => ({
    login,
    servers: perServer.map((p): GameAccountServer => ({
      id: p.server.id,
      name: p.server.name,
      characters: p.chars
        ? p.chars.filter(c => sameLogin(c.account, login)).map(({ account: _, ...c }) => c)
        : null,
    })),
  }))

  return { login: master.login, coins: Number(master.coins), accounts }
})
