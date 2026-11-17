// Подготовка интеграции с платёжным шлюзом.
// Документация шлюза ещё не предоставлена, поэтому адреса, имена полей и заголовок
// подписи собраны в одном месте: после получения доков правится только этот файл.
import { createHmac, timingSafeEqual } from 'node:crypto'
import type { PaymentCurrency, PaymentMethodKey } from '#shared/cabinet'

export interface MethodGatewayConfig {
  /** Полный адрес создания платежа */
  url: string
  merchantId: string
  secret: string
  /** Адрес, на который шлюз присылает callback */
  callbackUrl: string
  /** 1 терминал = 1 касса: у каждого способа оплаты своя пара */
  terminalId: string
  cashboxId: string
}

/** Настройки шлюза для конкретного способа оплаты. */
export function methodGatewayConfig(method: PaymentMethodKey): MethodGatewayConfig {
  const c = useRuntimeConfig().payments
  // 1 терминал = 1 касса: отдельные terminal_id и cashbox_id на каждый способ.
  const terminals: Record<PaymentMethodKey, [string, string]> = {
    card_intl: [String(c.cardIntlTerminalId || ''), String(c.cardIntlCashboxId || '')],
    card_ru: [String(c.cardRuTerminalId || ''), String(c.cardRuCashboxId || '')],
    sbp: [String(c.sbpTerminalId || ''), String(c.sbpCashboxId || '')],
    erip: [String(c.eripTerminalId || ''), String(c.eripCashboxId || '')],
  }
  return {
    url: String(c.gatewayUrl || '').trim(),
    merchantId: String(c.merchantId || '').trim(),
    secret: String(c.secret || '').trim(),
    callbackUrl: String(c.callbackUrl || '').trim(),
    terminalId: terminals[method][0],
    cashboxId: terminals[method][1],
  }
}

/** Шлюз готов, только если заданы адрес, магазин, секрет и пара терминал/касса. */
export function isGatewayConfigured(method: PaymentMethodKey): boolean {
  const g = methodGatewayConfig(method)
  return !!(g.url && g.merchantId && g.secret && g.terminalId && g.cashboxId)
}

/** HMAC-SHA256 в hex — подпись тела запроса и callback. */
export function signPayload(raw: string, secret: string): string {
  return createHmac('sha256', secret).update(raw, 'utf8').digest('hex')
}

export function verifySignature(raw: string, signature: string, secret: string): boolean {
  if (!secret) return false
  const expected = signPayload(raw, secret)
  const got = String(signature || '').trim().toLowerCase()
  if (got.length !== expected.length) return false
  try {
    return timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(got, 'utf8'))
  }
  catch {
    return false
  }
}

export interface GatewayOrder {
  method: PaymentMethodKey
  /** Наш код платежа — он же order_id в шлюзе */
  orderId: string
  amount: number
  currency: PaymentCurrency
  description: string
}

export interface GatewayPayment {
  paymentId: string
  payUrl: string
}

/**
 * Создаёт платёж в шлюзе. Ответ ожидается в виде { id | payment_id, pay_url | url }.
 * После получения документации поправьте адрес, поля запроса и разбор ответа.
 */
export async function createGatewayPayment(order: GatewayOrder): Promise<GatewayPayment> {
  const g = methodGatewayConfig(order.method)
  if (!isGatewayConfigured(order.method)) throw new Error('Платёжный шлюз не настроен')

  const payload = {
    merchant_id: g.merchantId,
    terminal_id: g.terminalId,
    cashbox_id: g.cashboxId,
    order_id: order.orderId,
    amount: order.amount.toFixed(2),
    currency: order.currency,
    description: order.description,
    callback_url: g.callbackUrl || undefined,
  }
  const raw = JSON.stringify(payload)
  const res = await $fetch<Record<string, unknown>>(g.url, {
    method: 'POST',
    body: raw,
    headers: {
      'content-type': 'application/json',
      'x-signature': signPayload(raw, g.secret),
    },
    signal: AbortSignal.timeout(15_000),
  })

  const paymentId = String(res.payment_id ?? res.id ?? '')
  const payUrl = String(res.pay_url ?? res.url ?? '')
  if (!paymentId || !payUrl) throw new Error('Шлюз вернул неполный ответ')
  return { paymentId, payUrl }
}

export interface GatewayCallback {
  orderId: string
  paymentId: string
  status: 'paid' | 'canceled' | 'pending'
  amount: number
  currency: PaymentCurrency
}

/** Разбирает тело callback. Имена полей — по документации шлюза. */
export function parseGatewayCallback(raw: string): GatewayCallback | null {
  let data: Record<string, unknown>
  try {
    data = JSON.parse(raw) as Record<string, unknown>
  }
  catch {
    return null
  }

  const orderId = String(data.order_id ?? data.orderId ?? '')
  const paymentId = String(data.payment_id ?? data.paymentId ?? data.id ?? '')
  const rawStatus = String(data.status ?? data.state ?? '').toLowerCase()
  const status = ['paid', 'success', 'succeeded', 'completed', 'ok'].includes(rawStatus)
    ? 'paid'
    : ['canceled', 'cancelled', 'failed', 'declined', 'error'].includes(rawStatus)
        ? 'canceled'
        : 'pending'
  const amount = Number(data.amount ?? 0)
  const currency: PaymentCurrency = String(data.currency ?? '').toUpperCase() === 'BYN' ? 'BYN' : 'RUB'

  if (!orderId || !paymentId) return null
  return { orderId, paymentId, status, amount, currency }
}
