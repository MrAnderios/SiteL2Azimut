import type { AdminDashboard, AdminPayment } from '#shared/cabinet'

// Админ-панель: мастер-аккаунты (поиск ?q=), платежи к подтверждению, история платежей, журнал операций
export default defineEventHandler(async (event): Promise<AdminDashboard> => {
  await requireAdmin(event)
  const db = cmsDb()
  await expireStalePayments(db)

  const q = str(getQuery(event).q).trim()
  const like = `%${q.replace(/[\\%_]/g, m => `\\${m}`)}%`

  const [masters, pending, history, log] = await Promise.all([
    q
      ? rows<MasterRow>(db, 'SELECT id, login, email, coins, created_at FROM master_accounts WHERE login LIKE ? OR email LIKE ? ORDER BY id DESC LIMIT 100', [like, like])
      : rows<MasterRow>(db, 'SELECT id, login, email, coins, created_at FROM master_accounts ORDER BY id DESC LIMIT 100'),
    rows<PaymentRow>(db, 'SELECT * FROM payments WHERE status = ? ORDER BY id ASC', ['pending']),
    rows<PaymentRow>(db, 'SELECT * FROM payments WHERE status != ? ORDER BY id DESC LIMIT 20', ['pending']),
    rows<LogRow>(db, 'SELECT * FROM donate_log ORDER BY id DESC LIMIT 50'),
  ])

  const toAdminPayment = (p: PaymentRow): AdminPayment => ({ ...toPayment(p), masterLogin: p.master_login, confirmedBy: p.confirmed_by })

  return {
    masters: masters.map(m => ({ id: m.id, login: m.login, email: m.email, coins: Number(m.coins), createdAt: Number(m.created_at) })),
    pending: pending.map(toAdminPayment),
    history: history.map(toAdminPayment),
    log: log.map(l => ({
      id: l.id,
      masterLogin: l.master_login,
      target: l.char_name,
      server: l.server,
      amount: Number(l.amount),
      action: l.action,
      createdAt: Number(l.created_at),
    })),
  }
})

interface MasterRow {
  id: number
  login: string
  email: string
  coins: number
  created_at: number
}

interface LogRow {
  id: number
  master_login: string
  char_name: string
  server: string
  amount: number
  action: string
  created_at: number
}
