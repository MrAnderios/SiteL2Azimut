import { paymentMethodFromProvider } from '#shared/cabinet'
import type { PaymentRow } from '../../utils/payments'

// Webhook SeverPay: подтверждение/отмена счёта.
// Подпись (sign в теле) проверяется HMAC-SHA256 от JSON без поля sign токеном терминала.
// Успешная обработка: HTTP 200 + application/json + {"status": true} (иначе SeverPay повторяет).
export default defineEventHandler(async (event) => {
  setHeader(event, 'content-type', 'application/json')

  const raw = (await readRawBody(event, 'utf8')) ?? ''
  let body: Record<string, unknown>
  try {
    body = raw ? JSON.parse(raw) as Record<string, unknown> : null as any
  }
  catch {
    body = null as any
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    setResponseStatus(event, 400)
    return { status: false, msg: 'invalid_request' }
  }

  const cb = parseGatewayCallback(body)
  if (!cb) {
    setResponseStatus(event, 400)
    return { status: false, msg: 'invalid_request' }
  }

  // Служебный webhook проверки доступности — подтверждаем, если подпись совпала с любым токеном
  if (cb.type === 'test') {
    const ok = configuredTokens().some(t => verifyCallbackBody(body, t))
    if (!ok) {
      setResponseStatus(event, 403)
      return { status: false, msg: 'invalid_signature' }
    }
    return { status: true }
  }

  const db = cmsDb()
  const pay = await row<PaymentRow>(db, 'SELECT * FROM payments WHERE payment_code = ?', [cb.orderId])

  // Подпись проверяем токеном терминала этого платежа; если платёж не найден — пробуем все токены
  const token = pay
    ? methodGatewayConfig(paymentMethodFromProvider(pay.provider)).token
    : ''
  const signed = token
    ? verifyCallbackBody(body, token)
    : configuredTokens().some(t => verifyCallbackBody(body, t))
  if (!signed) {
    setResponseStatus(event, 403)
    return { status: false, msg: 'invalid_signature' }
  }

  if (!pay) {
    console.warn('[payments] callback: payment not found', cb.orderId)
    return { status: true }
  }

  // Через шлюз оплачиваются только счета, созданные со статусом gw_*
  if (!String(pay.provider).startsWith('gw_')) {
    return { status: true }
  }

  // Сумма и валюта в callback должны совпадать со счётом
  const expected = paymentAmount(pay)
  if (expected.currency !== cb.currency || Math.abs(expected.amount - cb.amount) > 0.01) {
    console.warn('[payments] callback amount mismatch', { orderId: cb.orderId, expected, got: { amount: cb.amount, currency: cb.currency } })
    setResponseStatus(event, 400)
    return { status: false, msg: 'invalid_amount' }
  }

  // Идемпотентность: повторный callback по уже обработанному счёту не меняет баланс
  if (cb.status === 'paid') await markPaymentPaid(pay.id, 'gateway', cb.paymentId)
  else if (cb.status === 'canceled') await cancelPayment(pay.id)

  return { status: true }
})
