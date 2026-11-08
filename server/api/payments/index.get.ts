import type { PaymentsResponse } from '#shared/cabinet'

// Баланс, текущий неоплаченный счёт и история платежей мастера
export default defineEventHandler(async (event): Promise<PaymentsResponse> => {
  const master = await requireMaster(event)
  const db = cmsDb()
  await expireStalePayments(db, master.id)

  const history = await rows<PaymentRow>(db, 'SELECT * FROM payments WHERE master_id = ? ORDER BY id DESC LIMIT 20', [master.id])
  const active = history.find(p => p.status === 'pending')
    ?? await row<PaymentRow>(db, 'SELECT * FROM payments WHERE master_id = ? AND status = ? ORDER BY id DESC LIMIT 1', [master.id, 'pending'])

  return {
    coins: Number(master.coins),
    active: active ? await toPaymentDetails(active) : null,
    history: history.map(toPayment),
  }
})
