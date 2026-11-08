import { donateItem } from '#shared/cabinet'

// Ручное начисление / списание монет мастеру
export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const body = await readJson(event)
  const login = str(body.login).trim()
  const amount = int(body.amount)
  const action = body.action === 'debit' ? 'debit' : 'credit'

  if (!login) fail(400, 'master_not_found')
  if (!(amount >= 1)) fail(400, 'invalid_amount')

  const db = cmsDb()
  const target = await row<{ id: number, login: string }>(db, 'SELECT id, login FROM master_accounts WHERE login = ?', [login])
  if (!target) fail(404, 'master_not_found', { login })

  await transaction(db, async (conn) => {
    const res = action === 'credit'
      ? await exec(conn, 'UPDATE master_accounts SET coins = coins + ? WHERE id = ?', [amount, target.id])
      : await exec(conn, 'UPDATE master_accounts SET coins = coins - ? WHERE id = ? AND coins >= ?', [amount, target.id, amount])
    if (res.affectedRows === 0) fail(400, 'not_enough_coins')
    await exec(conn,
      `INSERT INTO donate_log (master_id, master_login, char_name, server, item_id, amount, action, created_at)
       VALUES (?, ?, ?, '', ?, ?, ?, ?)`,
      [admin.id, admin.login, target.login, donateItem.id, amount, `admin_${action}`, now()])
  })

  return { login: target.login, amount, action }
})
