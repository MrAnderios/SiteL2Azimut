import type { Payment } from '#shared/cabinet'

// Статус платежа — страница пополнения опрашивает его, пока счёт не оплачен
export default defineEventHandler(async (event): Promise<Payment> => {
  const master = await requireMaster(event)
  const id = int(getRouterParam(event, 'id'))
  if (!(id > 0)) fail(404, 'payment_not_found')

  const db = cmsDb()
  await expireStalePayments(db, master.id)
  const pay = await row<PaymentRow>(db, 'SELECT * FROM payments WHERE id = ? AND master_id = ?', [id, master.id])
  if (!pay) fail(404, 'payment_not_found')
  return toPayment(pay)
})
