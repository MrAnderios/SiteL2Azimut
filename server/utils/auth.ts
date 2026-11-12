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
const SESSION_NAME = 'azimut_session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 30

function sessionConfig() {
  let password = useRuntimeConfig().sessionPassword
  if (!password || password.length < 32) {
    if (!import.meta.dev) {
      throw new Error('NUXT_SESSION_PASSWORD не задан или короче 32 символов (см. .env.example)')
    }
    password = DEV_SESSION_PASSWORD
  }
  return {
    name: SESSION_NAME,
    password,
    maxAge: SESSION_MAX_AGE,
    // maxAge и в cookie: h3 выставляет expires от даты создания сессии, а Max-Age браузер считает
    // от каждого обновления cookie — так срок отсчитывается от входа, а не от первого визита
    cookie: { httpOnly: true, secure: !import.meta.dev, sameSite: 'lax' as const, path: '/', maxAge: SESSION_MAX_AGE },
  }
}

/** Есть ли в запросе cookie сессии. Без неё useSession создал бы пустую сессию и поставил cookie каждому посетителю. */
function hasSessionCookie(event: H3Event): boolean {
  return !!getCookie(event, SESSION_NAME)
}

/** Убирает cookie сессии из заголовков запроса, чтобы следующий useSession создал сессию заново. */
function forgetSessionCookie(event: H3Event): void {
  const req = event.node.req
  const rest = (req.headers.cookie || '')
    .split(';')
    .map(s => s.trim())
    .filter(c => c && !c.startsWith(`${SESSION_NAME}=`))
  req.headers.cookie = rest.join('; ')
}

export function getAuthSession(event: H3Event) {
  return useSession<SessionData>(event, sessionConfig())
}

export async function startSession(event: H3Event, master: { id: number, login: string }): Promise<void> {
  // h3 после clear() восстанавливает сессию из cookie запроса (тот же id и дата создания),
  // поэтому cookie убираем из запроса вручную: после входа сессия получает новый id и новый срок
  if (hasSessionCookie(event)) {
    await (await getAuthSession(event)).clear()
    forgetSessionCookie(event)
  }
  const session = await getAuthSession(event)
  await session.update({ masterId: master.id, login: master.login })
}

export async function endSession(event: H3Event): Promise<void> {
  if (!hasSessionCookie(event)) return
  const session = await getAuthSession(event)
  await session.clear()
}

export function isAdminLogin(login: string): boolean {
  const admins = String(useRuntimeConfig().adminLogins || '').split(',').map(s => s.trim()).filter(Boolean)
  return admins.includes(login)
}

/** Пользователь из cookie сессии, без запроса к БД. Без cookie сессию не создаём. */
export async function getSessionUser(event: H3Event): Promise<AuthUser | null> {
  if (!hasSessionCookie(event)) return null
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
