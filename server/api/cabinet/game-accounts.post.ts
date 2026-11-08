// Создание игрового аккаунта, привязанного к мастеру через e-mail
export default defineEventHandler(async (event) => {
  const master = await requireMaster(event)
  const body = await readJson(event)
  const login = str(body.login).trim()
  const password = str(body.password)

  validateLogin(login)
  validateNewPassword(password, str(body.passwordConfirm))
  rateLimit(`game-account:${master.id}`, 10, 60 * 60)

  const db = cmsDb()
  if (await row(db, 'SELECT 1 FROM accounts WHERE login = ?', [login])) {
    fail(409, 'game_login_taken')
  }

  try {
    await exec(db,
      `INSERT INTO accounts (login, password, email, last_access, access_level, last_server)
       VALUES (?, ?, ?, ?, 0, 0)`,
      [login, await hashGamePassword(password), master.email, now()])
  }
  catch (e) {
    if (isDuplicateKey(e)) fail(409, 'game_login_taken')
    throw e
  }

  return { login }
})
