import type { AuthUser } from '#shared/cabinet'

export default defineEventHandler(async (event): Promise<AuthUser & { referrer: string | null }> => {
  const body = await readJson(event)
  const login = str(body.login).trim()
  const email = str(body.email).trim()
  const password = str(body.password)
  const ref = str(body.ref).trim()

  validateLogin(login)
  validateEmail(email)
  validateNewPassword(password, str(body.passwordConfirm))

  const ip = clientIp(event)
  rateLimit(`register:ip:${ip}`, 5, 60 * 60)

  const db = cmsDb()
  if (await row(db, 'SELECT 1 FROM master_accounts WHERE login = ? OR email = ?', [login, email])) {
    fail(409, 'login_taken')
  }

  let masterId: number
  try {
    const res = await exec(db,
      `INSERT INTO master_accounts (login, email, password_hash, coins, reg_ip, ref_code, created_at)
       VALUES (?, ?, ?, 0, ?, ?, ?)`,
      [login, email, await hashMasterPassword(password), ip, await generateRefCode(db), now()])
    masterId = res.insertId
  }
  catch (e) {
    if (isDuplicateKey(e)) fail(409, 'login_taken')
    throw e
  }

  const referrer = ref ? await registerReferral(ref, masterId, ip) : null

  await startSession(event, { id: masterId, login })
  return { id: masterId, login, isAdmin: isAdminLogin(login), referrer: referrer?.login ?? null }
})
