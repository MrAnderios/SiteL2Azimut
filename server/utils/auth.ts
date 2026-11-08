import type { H3Event } from 'h3'
import type { AuthUser } from '#shared/cabinet'

interface SessionData {
  masterId?: number
  login?: string
}

export interface Master {
  id: number
  login: string
  email: string
  coins: number
}

const DEV_SESSION_PASSWORD = 'dev-only-session-password-change-me-in-production!'

function sessionConfig() {
  let password = useRuntimeConfig().sessionPassword
  if (!password || password.length < 32) {
    if (!import.meta.dev) {
      throw new Error('NUXT_SESSION_PASSWORD не задан или короче 32 символов (см. .env.example)')
    }
    password = DEV_SESSION_PASSWORD
  }
  return {
    name: 'azimut_session',
    password,
    maxAge: 60 * 60 * 24 * 30,
    cookie: { httpOnly: true, secure: !import.meta.dev, sameSite: 'lax' as const, path: '/' },
  }
}

export function getAuthSession(event: H3Event) {
  return useSession<SessionData>(event, sessionConfig())
}

export async function startSession(event: H3Event, master: { id: number, login: string }): Promise<void> {
  const session = await getAuthSession(event)
  // Новый id сессии после входа — защита от фиксации сессии
  await session.clear()
  await session.update({ masterId: master.id, login: master.login })
}

export async function endSession(event: H3Event): Promise<void> {
  const session = await getAuthSession(event)
  await session.clear()
}

export function isAdminLogin(login: string): boolean {
  const admins = String(useRuntimeConfig().adminLogins || '').split(',').map(s => s.trim()).filter(Boolean)
  return admins.includes(login)
}

/** Пользователь из cookie сессии, без запроса к БД. */
export async function getSessionUser(event: H3Event): Promise<AuthUser | null> {
  const { data } = await getAuthSession(event)
  if (!data.masterId || !data.login) return null
  return { id: data.masterId, login: data.login, isAdmin: isAdminLogin(data.login) }
}

/** Текущий мастер-аккаунт из БД; 401, если не вошёл или аккаунт удалён. */
export async function requireMaster(event: H3Event): Promise<Master> {
  const user = await getSessionUser(event)
  if (!user) fail(401, 'unauthorized')
  const master = await row<Master>(cmsDb(), 'SELECT id, login, email, coins FROM master_accounts WHERE id = ?', [user.id])
  if (!master) {
    await endSession(event)
    fail(401, 'unauthorized')
  }
  return master
}

export async function requireAdmin(event: H3Event): Promise<Master> {
  const master = await requireMaster(event)
  if (!isAdminLogin(master.login)) fail(403, 'forbidden')
  return master
}
