import { randomInt } from 'node:crypto'
import QRCode from 'qrcode'
import type { Payment, PaymentCurrency, PaymentDetails, PaymentMethodKey, PaymentStatus } from '#shared/cabinet'
import { donateItem, payment as paymentConfig, paymentMethod, paymentMethodFromProvider } from '#shared/cabinet'
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

/** Данные платежа в qr_data (схему БД не меняем). Поддерживает чтение старых записей. */
interface PaymentMeta {
  v: 1
  method: string
  currency: PaymentCurrency
  amount: number
  payUrl?: string | null
}

function parseMeta(raw: string | null): PaymentMeta | null {
  if (!raw) return null
  try {
    const data = JSON.parse(raw) as Partial<PaymentMeta>
    if (data && data.v === 1 && (data.currency === 'RUB' || data.currency === 'BYN')) {
      return {
        v: 1,
        method: String(data.method || 'sbp'),
        currency: data.currency,
        amount: Number(data.amount) || 0,
        payUrl: typeof data.payUrl === 'string' ? data.payUrl : null,
      }
    }
  }
  catch {
    // Старые записи: в qr_data лежит обычный текст
  }
  return null
}

/** Сумма и валюта платежа: из qr_data, для старых записей — рубли. */
export function paymentAmount(p: PaymentRow): { amount: number, currency: PaymentCurrency } {
  const meta = parseMeta(p.qr_data)
  if (meta) return { amount: meta.amount, currency: meta.currency }
  return { amount: Number(p.amount_rub), currency: 'RUB' }
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
  const gateway = false
  if (p.status !== 'pending') return { ...base, qr: null, payUrl: null, gateway }

  const meta = parseMeta(p.qr_data)
  let payUrl = meta?.payUrl || String(useRuntimeConfig().sbpPaymentUrl || '').trim() || null

  let qr: string | null = null
  if (payUrl) {
    qr = await QRCode.toDataURL(payUrl, { width: 260, margin: 1 })
  }
  else {
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

/** Создаёт счёт на оплату по СБП с ручным подтверждением оператором. */
export async function createPayment(master: { id: number, login: string }, rub: number, _method: PaymentMethodKey = 'sbp'): Promise<number> {
  const coins = Math.floor(rub / paymentConfig.coinPrice)
  const meta: PaymentMeta = { v: 1, method: 'sbp', currency: 'RUB', amount: rub, payUrl: null }

  for (let attempt = 0; attempt < 10; attempt++) {
    const code = `COIN-${randomCode(4)}-${randomCode(4)}`
    try {
      const res = await exec(cmsDb(),
        `INSERT INTO payments (payment_code, master_id, master_login, amount_rub, amount_coins, status, provider, qr_data, created_at)
         VALUES (?, ?, ?, ?, ?, 'pending', 'manual_sbp', ?, ?)`,
        [code, master.id, master.login, rub, coins, JSON.stringify(meta), now()])
      return res.insertId
    }
    catch (e) {
      if (!isDuplicateKey(e)) throw e
    }
  }
  throw new Error('Не удалось сгенерировать уникальный код платежа')
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
