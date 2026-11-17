import { randomInt } from 'node:crypto'
import QRCode from 'qrcode'
import type { Payment, PaymentCurrency, PaymentDetails, PaymentMethodKey, PaymentStatus } from '#shared/cabinet'
import {
  donateItem,
  isPaymentMethodKey,
  payment as paymentConfig,
  paymentMethod,
  paymentMethodFromProvider,
  paymentProvider,
} from '#shared/cabinet'
import type { Db } from './db'

// Без похожих символов (0/O, 1/I/L)
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export function randomCode(length: number): string {
  let out = ''
  for (let i = 0; i < length; i++) out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]
  return out
}

export interface PaymentRow {
  id: number
  payment_code: string
  master_id: number
  master_login: string
  amount_rub: number
  amount_coins: number
  status: PaymentStatus
  provider: string
  provider_payment_id: string
  qr_data: string | null
  created_at: number
  paid_at: number
  confirmed_by: string
}

/**
 * Данные способа оплаты, которые нельзя хранить отдельными колонками:
 * схему payments не меняем (у cms_register нет прав ALTER), поэтому всё лежит в qr_data.
 */
interface PaymentMeta {
  v: 1
  method: PaymentMethodKey
  currency: PaymentCurrency
  amount: number
  payUrl?: string | null
  gatewayPaymentId?: string | null
}

function parseMeta(raw: string | null): PaymentMeta | null {
  if (!raw) return null
  try {
    const data = JSON.parse(raw) as Partial<PaymentMeta>
    if (data && data.v === 1 && isPaymentMethodKey(data.method) && (data.currency === 'RUB' || data.currency === 'BYN')) {
      return {
        v: 1,
        method: data.method,
        currency: data.currency,
        amount: Number(data.amount) || 0,
        payUrl: typeof data.payUrl === 'string' ? data.payUrl : null,
        gatewayPaymentId: typeof data.gatewayPaymentId === 'string' ? data.gatewayPaymentId : null,
      }
    }
  }
  catch {
    // Старые записи: в qr_data лежит обычный текст, а не JSON
  }
  return null
}

/** Сколько рублей стоит 1 BYN для ЕРИП. */
function eripRubPerByn(): number {
  const rate = Number(useRuntimeConfig().payments.eripRubPerByn)
  return rate > 0 ? rate : 28
}

/** Пересчёт рублей в BYN с округлением до копеек. */
export function rubToByn(rub: number): number {
  return Math.max(0, Math.round((Number(rub) / eripRubPerByn()) * 100) / 100)
}

/** Сумма и валюта платежа: для новых счетов — из qr_data, для старых — по способу. */
export function paymentAmount(p: PaymentRow): { amount: number, currency: PaymentCurrency } {
  const meta = parseMeta(p.qr_data)
  if (meta) return { amount: meta.amount, currency: meta.currency }

  const currency = paymentMethod(paymentMethodFromProvider(p.provider)).currency
  const rub = Number(p.amount_rub)
  return { amount: currency === 'BYN' ? rubToByn(rub) : rub, currency }
}

export function toPayment(p: PaymentRow): Payment {
  const { amount, currency } = paymentAmount(p)
  return {
    id: p.id,
    code: p.payment_code,
    amountRub: Number(p.amount_rub),
    amount,
    currency,
    method: paymentMethodFromProvider(p.provider),
    amountCoins: Number(p.amount_coins),
    status: p.status,
    createdAt: Number(p.created_at),
    paidAt: Number(p.paid_at),
  }
}

export async function toPaymentDetails(p: PaymentRow): Promise<PaymentDetails> {
  const base = toPayment(p)
  const gateway = String(p.provider).startsWith('gw_')
  if (p.status !== 'pending') return { ...base, qr: null, payUrl: null, gateway }

  const meta = parseMeta(p.qr_data)
  let payUrl = meta?.payUrl || null

  // СБП: ссылка из настроек, её же кодируем в QR (для ЕРИП и карт ссылку даёт шлюз)
  if (!payUrl && base.method === 'sbp') {
    payUrl = String(useRuntimeConfig().sbpPaymentUrl || '').trim() || null
  }

  let qr: string | null = null
  if (payUrl) {
    qr = await QRCode.toDataURL(payUrl, { width: 260, margin: 1 })
  }
  else if (base.method === 'sbp') {
    // Без ссылки СБП — старый вариант: текст с суммой и кодом
    const qrText = p.qr_data && !meta
      ? p.qr_data
      : `Пополнение ${donateItem.name}: ${p.amount_rub} руб. Код: ${p.payment_code}`
    qr = await QRCode.toDataURL(qrText, { width: 260, margin: 1 })
  }

  return { ...base, qr, payUrl, gateway }
}

/** Помечает просроченными неоплаченные счета (всех или одного мастера). */
export async function expireStalePayments(db: Db, masterId?: number): Promise<void> {
  const params: unknown[] = ['expired', 'pending', now() - paymentConfig.ttlSec]
  let sql = 'UPDATE payments SET status = ? WHERE status = ? AND created_at < ?'
  if (masterId !== undefined) {
    sql += ' AND master_id = ?'
    params.push(masterId)
  }
  await exec(db, sql, params)
}

/**
 * Создаёт счёт на оплату выбранным способом.
 * Провайдер: gw_<ключ>, если шлюз для этого способа настроен, иначе manual_<ключ>.
 */
export async function createPayment(master: { id: number, login: string }, rub: number, method: PaymentMethodKey): Promise<number> {
  const coins = Math.floor(rub / paymentConfig.coinPrice)
  const info = paymentMethod(method)
  const currency = info.currency
  const amount = currency === 'BYN' ? rubToByn(rub) : rub
  const viaGateway = isGatewayConfigured(method)
  const provider = paymentProvider(method, viaGateway)
  const meta: PaymentMeta = { v: 1, method, currency, amount, payUrl: null, gatewayPaymentId: null }

  for (let attempt = 0; attempt < 10; attempt++) {
    const code = `COIN-${randomCode(4)}-${randomCode(4)}`
    try {
      const res = await exec(cmsDb(),
        `INSERT INTO payments (payment_code, master_id, master_login, amount_rub, amount_coins, status, provider, qr_data, created_at)
         VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
        [code, master.id, master.login, rub, coins, provider, JSON.stringify(meta), now()])
      return res.insertId
    }
    catch (e) {
      if (!isDuplicateKey(e)) throw e
    }
  }
  throw new Error('Не удалось сгенерировать уникальный код платежа')
}

/**
 * Досоздаёт платёж в шлюзе и сохраняет ссылку на оплату.
 * Если шлюз не ответил, счёт отменяется, чтобы не висел в ожидании.
 */
export async function startGatewayPayment(p: PaymentRow): Promise<PaymentRow> {
  const method = paymentMethodFromProvider(p.provider)
  const meta = parseMeta(p.qr_data)
  if (!meta) throw new Error('Некорректные данные счёта')

  try {
    const result = await createGatewayPayment({
      method,
      orderId: p.payment_code,
      amount: meta.amount,
      currency: meta.currency,
      description: `Пополнение ${donateItem.name}: ${p.amount_rub} RUB`,
    })
    const updated: PaymentMeta = { ...meta, payUrl: result.payUrl, gatewayPaymentId: result.paymentId }
    const raw = JSON.stringify(updated)
    await exec(cmsDb(), 'UPDATE payments SET qr_data = ? WHERE id = ?', [raw, p.id])
    return { ...p, qr_data: raw }
  }
  catch (e) {
    await exec(cmsDb(), 'UPDATE payments SET status = ? WHERE id = ? AND status = ?', ['canceled', p.id, 'pending'])
    throw e
  }
}

/** Подтверждает оплату: начисляет монеты мастеру и комиссию его рефереру. false — платёж уже обработан. */
export async function markPaymentPaid(paymentId: number, confirmedBy: string, providerPaymentId = ''): Promise<boolean> {
  return transaction(cmsDb(), async (conn) => {
    const pay = await row<PaymentRow>(conn, 'SELECT * FROM payments WHERE id = ? FOR UPDATE', [paymentId])
    if (!pay || pay.status !== 'pending') return false

    const t = now()
    await exec(conn, 'UPDATE payments SET status = ?, paid_at = ?, confirmed_by = ?, provider_payment_id = ? WHERE id = ?',
      ['paid', t, confirmedBy, providerPaymentId, paymentId])
    await exec(conn, 'UPDATE master_accounts SET coins = coins + ? WHERE id = ?', [pay.amount_coins, pay.master_id])
    await exec(conn,
      `INSERT INTO donate_log (master_id, master_login, char_name, server, item_id, amount, action, created_at)
       VALUES (?, ?, ?, '', ?, ?, 'payment', ?)`,
      [pay.master_id, pay.master_login, 'Онлайн-оплата', donateItem.id, pay.amount_coins, t])
    await referralCommission(conn, pay.master_id, Number(pay.amount_coins))
    return true
  })
}

export async function cancelPayment(paymentId: number): Promise<boolean> {
  const res = await exec(cmsDb(), 'UPDATE payments SET status = ? WHERE id = ? AND status = ?', ['canceled', paymentId, 'pending'])
  return res.affectedRows > 0
}
