import type { PaymentDetails } from '#shared/cabinet'
import { isPaymentMethodKey, paymentAccessRules, paymentMethod } from '#shared/cabinet'

// Новый счёт на оплату выбранным способом (карты, СБП, ЕРИП)
export default defineEventHandler(async (event): Promise<PaymentDetails> => {
  const master = await requireMaster(event)
  const body = await readJson(event)

  const method = body.method ?? 'card_intl'
  if (!isPaymentMethodKey(method)) fail(400, 'invalid_method')

  const info = paymentMethod(method)
  const rub = int(body.amountRub)
  if (!(rub >= info.minRub && rub <= info.maxRub)) {
    fail(400, 'invalid_amount', { min: info.minRub, max: info.maxRub })
  }

  // Условия доступа: СБП и карты Мир — только с персонажем 3 уровня или пополнениями на 500 ₽
  const access = await paymentAccess(master)
  if (!access.allowed.includes(method)) {
    fail(403, 'payment_method_locked', { minLevel: paymentAccessRules.minLevel, minPaidRub: paymentAccessRules.minPaidRub })
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
      created = await startGatewayPayment(created!, { id: master.id, email: master.email })
    }
    catch (e) {
      console.error('[payments] gateway create failed:', e)
      fail(502, 'gateway_error')
    }
  }

  return toPaymentDetails(created!)
})
