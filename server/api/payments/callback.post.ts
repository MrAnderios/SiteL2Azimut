import type { PaymentRow } from '../../utils/payments'

// Callback платёжного шлюза: подтверждение или отмена счёта.
// POST-only, подлинность проверяется HMAC-SHA256 по сырому телу запроса.
// Настройки шлюза появятся в .env после получения документации (см. docs/PAYMENTS.md).
export default defineEventHandler(async (event) => {
  const raw = (await readRawBody(event, 'utf8')) ?? ''
  if (!raw) fail(400, 'invalid_request')

  const secret = String(useRuntimeConfig().payments.secret || '').trim()
  if (!secret) fail(503, 'payment_unavailable')

  const signature = getRequestHeader(event, 'x-signature')
    || getRequestHeader(event, 'x-callback-signature')
    || ''
  if (!verifySignature(raw, signature, secret)) fail(403, 'invalid_signature')

  const cb = parseGatewayCallback(raw)
  if (!cb) fail(400, 'invalid_request')

  const db = cmsDb()
  const pay = await row<PaymentRow>(db, 'SELECT * FROM payments WHERE payment_code = ?', [cb.orderId])
  if (!pay) fail(404, 'payment_not_found')

  // Через шлюз оплачиваются только счета, созданные со статусом gw_*
  if (!String(pay.provider).startsWith('gw_')) fail(409, 'payment_processed')

  // Сумма и валюта в callback должны совпадать со счётом
  const expected = paymentAmount(pay)
  if (expected.currency !== cb.currency || Math.abs(expected.amount - cb.amount) > 0.01) {
    fail(400, 'invalid_amount')
  }

  // Идемпотентность: повторный callback по уже обработанному счёту не меняет баланс
  if (cb.status === 'paid') await markPaymentPaid(pay.id, 'gateway', cb.paymentId)
  else if (cb.status === 'canceled') await cancelPayment(pay.id)

  return { ok: true }
})
