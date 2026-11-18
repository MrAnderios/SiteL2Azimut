import type { PaymentDetails } from '#shared/cabinet'
import { paymentMethod } from '#shared/cabinet'

// Новый счёт на пополнение по СБП (подтверждается оператором в админ-панели)
export default defineEventHandler(async (event): Promise<PaymentDetails> => {
  const master = await requireMaster(event)
  const body = await readJson(event)

  const info = paymentMethod('sbp')
  const rub = int(body.amountRub)
  if (!(rub >= info.minRub && rub <= info.maxRub)) {
    fail(400, 'invalid_amount', { min: info.minRub, max: info.maxRub })
  }
  rateLimit(`payment:${master.id}`, 10, 60 * 60)

  const db = cmsDb()
  await expireStalePayments(db, master.id)

  // Новый счёт отменяет предыдущие ожидающие счета
  await exec(db, 'UPDATE payments SET status = ? WHERE master_id = ? AND status = ?', ['canceled', master.id, 'pending'])

  const id = await createPayment(master, rub, 'sbp')
  const created = await row<PaymentRow>(db, 'SELECT * FROM payments WHERE id = ?', [id])

  return toPaymentDetails(created!)
})
