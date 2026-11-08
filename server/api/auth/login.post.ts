import type { AuthUser } from '#shared/cabinet'
import { limits } from '#shared/cabinet'

export default defineEventHandler(async (event): Promise<AuthUser> => {
  const body = await readJson(event)
  const login = str(body.login).trim()
  const password = str(body.password)

  const ip = clientIp(event)
  rateLimit(`login:ip:${ip}`, 20, 15 * 60)
  rateLimit(`login:user:${login.toLowerCase()}`, 10, 15 * 60)

  if (!login || !password || login.length > limits.loginMax || password.length > limits.passwordMax) {
    fail(400, 'invalid_credentials')
  }

  const master = await row<{ id: number, login: string, password_hash: string }>(cmsDb(),
    'SELECT id, login, password_hash FROM master_accounts WHERE login = ?', [login])
  if (!await verifyMasterPassword(password, master?.password_hash) || !master) {
    fail(401, 'invalid_credentials')
  }

  await startSession(event, master)
  return { id: master.id, login: master.login, isAdmin: isAdminLogin(master.login) }
})
