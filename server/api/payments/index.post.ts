import type { PaymentDetails } from '#shared/cabinet'
import { payment } from '#shared/cabinet'

// Новый счёт на оплату по СБП
export default defineEventHandler(async (event): Promise<PaymentDetails> => {
  const master = await requireMaster(event)
  const rub = int((await readJson(event)).amountRub)
  if (!(rub >= payment.minRub && rub <= payment.maxRub)) {
    fail(400, 'invalid_amount', { min: payment.minRub, max: payment.maxRub })
  }
  rateLimit(`payment:${master.id}`, 10, 60 * 60)

  const db = cmsDb()
  await expireStalePayments(db, master.id)
  const id = await createPayment(master, rub)
  const created = await row<PaymentRow>(db, 'SELECT * FROM payments WHERE id = ?', [id])
  return toPaymentDetails(created!)
})
