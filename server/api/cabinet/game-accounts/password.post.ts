import { limits } from '#shared/cabinet'

// Смена пароля игрового аккаунта, привязанного к мастеру по e-mail.
// Текущий пароль обязателен: e-mail при регистрации не подтверждается, поэтому
// одной сессии недостаточно, чтобы распоряжаться чужими игровыми аккаунтами.
export default defineEventHandler(async (event) => {
  const master = await requireMaster(event)
  const body = await readJson(event)
  const login = str(body.login).trim()
  const currentPassword = str(body.currentPassword)
  const password = str(body.password)

  // Формат логина не проверяем: старые аккаунты могли создаваться с другими символами,
  // а принадлежность всё равно проверяется поиском в базе по логину и e-mail.
  if (!login || login.length > limits.loginMax) {
    fail(404, 'game_account_not_found')
  }
  validateNewPassword(password, str(body.passwordConfirm))
  if (!currentPassword || currentPassword.length > limits.passwordMax) {
    fail(400, 'invalid_game_password')
  }
  rateLimit(`game-password:${master.id}`, 10, 60 * 60)

  const db = cmsDb()
  const account = await row<{ password: string }>(db,
    'SELECT password FROM accounts WHERE login = ? AND email = ?', [login, master.email])
  if (!account) {
    fail(404, 'game_account_not_found')
  }

  if (await hashGamePassword(currentPassword) !== account.password) {
    fail(400, 'invalid_game_password')
  }

  await exec(db,
    'UPDATE accounts SET password = ? WHERE login = ? AND email = ?',
    [await hashGamePassword(password), login, master.email])

  return { login }
})
