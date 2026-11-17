import type { PaymentDetails } from '#shared/cabinet'
import { isPaymentMethodKey, paymentMethod } from '#shared/cabinet'

// Новый счёт на оплату выбранным способом (карты, СБП, ЕРИП)
export default defineEventHandler(async (event): Promise<PaymentDetails> => {
  const master = await requireMaster(event)
  const body = await readJson(event)

  const method = body.method ?? 'sbp'
  if (!isPaymentMethodKey(method)) fail(400, 'invalid_method')

  const info = paymentMethod(method)
  const rub = int(body.amountRub)
  if (!(rub >= info.minRub && rub <= info.maxRub)) {
    fail(400, 'invalid_amount', { min: info.minRub, max: info.maxRub })
  }
  rateLimit(`payment:${master.id}`, 10, 60 * 60)

  const db = cmsDb()
  await expireStalePayments(db, master.id)

  // Новый счёт отменяет предыдущие ручные счета. Счета шлюза не трогаем:
  // оплата по ним может уже проходить, и поздний callback должен её зачислить.
  await exec(db, `UPDATE payments SET status = ? WHERE master_id = ? AND status = ? AND LEFT(provider, 7) = ?`,
    ['canceled', master.id, 'pending', 'manual_'])

  const id = await createPayment(master, rub, method)
  let created = await row<PaymentRow>(db, 'SELECT * FROM payments WHERE id = ?', [id])

  if (String(created!.provider).startsWith('gw_')) {
    try {
      created = await startGatewayPayment(created!)
    }
    catch {
      fail(502, 'gateway_error')
    }
  }

  return toPaymentDetails(created!)
})
