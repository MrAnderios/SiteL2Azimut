// Интеграция с платёжным шлюзом SeverPay (https://docs.severpay.io/ru/).
// Каждый способ оплаты = отдельный терминал (свой MID и токен) — «1 терминал = 1 касса».
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import type { PaymentCurrency, PaymentMethodKey } from '#shared/cabinet'

export interface MethodGatewayConfig {
  baseUrl: string
  mid: number
  token: string
}

function methodCreds(method: PaymentMethodKey): { mid: string, token: string } {
  const c = useRuntimeConfig().payments
  const creds: Record<PaymentMethodKey, { mid: unknown, token: unknown }> = {
    card_intl: { mid: c.cardIntlMid, token: c.cardIntlToken },
    sbp: { mid: c.sbpMid, token: c.sbpToken },
    card_ru: { mid: c.cardRuMid, token: c.cardRuToken },
    erip: { mid: c.eripMid, token: c.eripToken },
  }
  const m = creds[method]
  return { mid: String(m.mid ?? '').trim(), token: String(m.token ?? '').trim() }
}

/** Настройки терминала SeverPay для способа оплаты. */
export function methodGatewayConfig(method: PaymentMethodKey): MethodGatewayConfig {
  const c = useRuntimeConfig().payments
  const { mid, token } = methodCreds(method)
  return {
    baseUrl: String(c.baseUrl || 'https://severpay.io/api/merchant').replace(/\/+$/, ''),
    mid: Number(mid),
    token,
  }
}

/** Шлюз готов, если для способа заданы MID и токен терминала. */
export function isGatewayConfigured(method: PaymentMethodKey): boolean {
  const g = methodGatewayConfig(method)
  return Number.isInteger(g.mid) && g.mid > 0 && g.token.length > 0
}

/** Токены всех настроенных терминалов (для проверки служебных webhook). */
export function configuredTokens(): string[] {
  const methods: PaymentMethodKey[] = ['card_intl', 'sbp', 'card_ru', 'erip']
  const out: string[] = []
  for (const m of methods) {
    const t = methodCreds(m).token
    if (t && !out.includes(t)) out.push(t)
  }
  return out
}

function sortObject(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortObject)
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const out: Record<string, unknown> = {}
    for (const k of Object.keys(obj).sort()) out[k] = sortObject(obj[k])
    return out
  }
  return value
}

function hmacHex(payload: string, token: string): string {
  return createHmac('sha256', token).update(payload, 'utf8').digest('hex')
}

function safeEqualHex(expected: string, got: string): boolean {
  const a = Buffer.from(expected)
  const b = Buffer.from(String(got || '').trim().toLowerCase())
  if (a.length !== b.length) return false
  try {
    return timingSafeEqual(a, b)
  }
  catch {
    return false
  }
}

/** Подпись запроса: HMAC-SHA256 от JSON body с ключами, отсортированными по возрастанию (ksort). */
export function signRequestBody(body: Record<string, unknown>, token: string): string {
  return hmacHex(JSON.stringify(sortObject(body)), token)
}

async function severpayPost<T>(endpoint: string, method: PaymentMethodKey, params: Record<string, unknown>): Promise<T> {
  const g = methodGatewayConfig(method)
  if (!isGatewayConfigured(method)) throw new Error('Платёжный шлюз не настроен')

  const body: Record<string, unknown> = {
    ...params,
    mid: g.mid,
    salt: randomBytes(8).toString('hex'),
  }
  body.sign = signRequestBody(body, g.token)

  const res = await $fetch<{ status: boolean, msg?: string, data?: T }>(`${g.baseUrl}/${endpoint}`, {
    method: 'POST',
    body,
    headers: { 'content-type': 'application/json' },
    signal: AbortSignal.timeout(15_000),
  })

  if (!res || res.status !== true || res.data == null) {
    throw new Error(res?.msg || 'Ошибка платёжного шлюза')
  }
  return res.data
}

export interface GatewayOrder {
  method: PaymentMethodKey
  /** Наш код платежа — order_id в SeverPay */
  orderId: string
  amount: number
  currency: PaymentCurrency
  clientEmail: string
  clientId: string
}

export interface GatewayPayment {
  paymentId: string
  payUrl: string
  uid?: string
  expireAt?: number
}

/** Создаёт платёж в SeverPay и возвращает ссылку на оплату. */
export async function createGatewayPayment(order: GatewayOrder): Promise<GatewayPayment> {
  const c = useRuntimeConfig().payments
  const returnUrl = String(c.returnUrl || 'https://l2azimut.ru/cabinet/donate').trim()
  const params: Record<string, unknown> = {
    order_id: order.orderId,
    amount: Math.round(order.amount * 100) / 100,
    currency: order.currency,
    client_email: order.clientEmail,
    client_id: order.clientId,
  }
  if (returnUrl) params.url_return = returnUrl

  const data = await severpayPost<{ id: number | string, url: string, expire_at?: number, uid?: string }>('payin/create', order.method, params)

  const paymentId = String(data.id ?? '')
  const payUrl = String(data.url ?? '')
  if (!paymentId || !payUrl) throw new Error('Шлюз вернул неполный ответ')
  return { paymentId, payUrl, uid: data.uid, expireAt: data.expire_at }
}

export type GatewayCallbackStatus = 'paid' | 'canceled' | 'pending'

export interface GatewayCallback {
  type: string
  orderId: string
  paymentId: string
  status: GatewayCallbackStatus
  amount: number
  currency: PaymentCurrency
}

/** Проверка подписи webhook: HMAC-SHA256 от JSON тела без поля sign (порядок ключей как в запросе). */
export function verifyCallbackBody(body: Record<string, unknown>, token: string): boolean {
  const sign = String(body.sign ?? '')
  if (!sign || !token) return false
  const rest: Record<string, unknown> = { ...body }
  delete rest.sign
  const expected = hmacHex(JSON.stringify(rest), token)
  return safeEqualHex(expected, sign)
}

/** Разбор webhook SeverPay (type: payin | test). */
export function parseGatewayCallback(data: Record<string, unknown>): GatewayCallback | null {
  const type = String(data.type ?? '')
  const inner = (data.data && typeof data.data === 'object' ? data.data : {}) as Record<string, unknown>

  if (type === 'test') {
    return { type, orderId: '', paymentId: '', status: 'pending', amount: 0, currency: 'RUB' }
  }

  const orderId = String(inner.order_id ?? '')
  const paymentId = String(inner.id ?? '')
  if (!orderId || !paymentId) return null

  const rawStatus = String(inner.status ?? '').toLowerCase()
  const status: GatewayCallbackStatus = rawStatus === 'success'
    ? 'paid'
    : (rawStatus === 'decline' || rawStatus === 'fail')
        ? 'canceled'
        : 'pending'
  const amount = Number(inner.amount ?? 0)
  const currency: PaymentCurrency = String(inner.currency ?? '').toUpperCase() === 'BYN' ? 'BYN' : 'RUB'

  return { type: type || 'payin', orderId, paymentId, status, amount, currency }
}
