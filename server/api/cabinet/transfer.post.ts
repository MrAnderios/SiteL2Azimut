import { donateItem, isGameServerId, limits } from '#shared/cabinet'

// Перевод монет с баланса мастера персонажу: предмет выдаётся через items_delayed
export default defineEventHandler(async (event) => {
  const master = await requireMaster(event)
  const body = await readJson(event)
  const charId = int(body.charId)
  const amount = int(body.amount)
  const server = body.server

  if (!(amount >= 1 && amount <= limits.transferMax)) fail(400, 'invalid_amount')
  if (!isGameServerId(server)) fail(400, 'unknown_server')
  if (!(charId > 0)) fail(404, 'character_not_found')
  rateLimit(`transfer:${master.id}`, 30, 60)

  const game = gameDb(server)
  const char = await row<{ id: number, name: string, account: string }>(game,
    'SELECT obj_Id AS id, char_name AS name, account_name AS account FROM characters WHERE obj_Id = ?', [charId])
  if (!char) fail(404, 'character_not_found')

  const db = cmsDb()
  // Персонаж должен принадлежать игровому аккаунту этого мастера
  if (!await row(db, 'SELECT 1 FROM accounts WHERE login = ? AND email = ?', [char.account, master.email])) {
    fail(404, 'character_not_found')
  }

  const logTransfer = (conn: Db, action: string) => exec(conn,
    `INSERT INTO donate_log (master_id, master_login, char_name, server, item_id, amount, action, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [master.id, master.login, char.name, server, donateItem.id, amount, action, now()])

  // Списание с проверкой баланса одним запросом — два параллельных перевода не уведут баланс в минус
  await transaction(db, async (conn) => {
    const res = await exec(conn, 'UPDATE master_accounts SET coins = coins - ? WHERE id = ? AND coins >= ?', [amount, master.id, amount])
    if (res.affectedRows === 0) fail(400, 'not_enough_coins')
    await logTransfer(conn, 'transfer')
  })

  try {
    await exec(game, 'INSERT INTO items_delayed (owner_id, item_id, count) VALUES (?, ?, ?)', [char.id, donateItem.id, amount])
  }
  catch (e) {
    console.error('[transfer] не удалось выдать предмет, возвращаем монеты:', e)
    await transaction(db, async (conn) => {
      await exec(conn, 'UPDATE master_accounts SET coins = coins + ? WHERE id = ?', [amount, master.id])
      await logTransfer(conn, 'transfer_refund')
    })
    fail(502, 'delivery_failed')
  }

  const balance = await row<{ coins: number }>(db, 'SELECT coins FROM master_accounts WHERE id = ?', [master.id])
  return { charName: char.name, server, amount, coins: Number(balance?.coins ?? 0) }
})
