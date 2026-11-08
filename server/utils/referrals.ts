// Реферальная программа (перенос referrals.php).
//
// Приглашённый игрок получает предметы: стартовый набор за первого персонажа и награды за 1/2/3 профессию
// и дворянство. Пригласивший (реферер) получает монеты за те же этапы и процент с пополнений приглашённого.
// Каждая награда выдаётся один раз (таблица referral_claims с уникальным ключом kind+account_id+type).
// Чтобы один человек не собирал награды с твинков, награда не выдаётся, если у другого приглашённого
// того же реферера, уже получившего её, совпадает IP или HWID.
import type { PoolConnection } from 'mysql2/promise'
import type { GameServerId, ReferralAward, ReferralSettings, ReferralType } from '#shared/cabinet'
import { gameServers } from '#shared/cabinet'
import type { Db } from './db'

const PROF1_CLASSES = new Set([1, 4, 7, 11, 15, 19, 22, 26, 29, 32, 35, 39, 42, 45, 47, 50, 54, 56])
const PROF2_CLASSES = new Set([2, 3, 5, 6, 8, 9, 12, 13, 14, 16, 17, 20, 21, 23, 24, 27, 28, 30, 33, 34, 36, 37, 40, 41, 43, 46, 48, 51, 52, 55, 57])
const PROF_TIERS = [['prof1', 1], ['prof2', 2], ['prof3', 3]] as const
const REFERRER_MILESTONES = ['prof1', 'prof2', 'prof3', 'noble'] as const

/** Уровень профессии класса: 0 — нет, 1–3 — номер профессии. */
export function classTier(classId: number): number {
  if (classId >= 88 && classId <= 118) return 3
  if (PROF2_CLASSES.has(classId)) return 2
  if (PROF1_CLASSES.has(classId)) return 1
  return 0
}

// ---------------------------------------------------------------------------
// Настройки и коды
// ---------------------------------------------------------------------------

export const settingKeys: Record<Exclude<keyof ReferralSettings, 'rewardEnabled'>, string> = {
  commissionPct: 'commission_pct',
  prof1Coins: 'ref_prof1_coins',
  prof2Coins: 'ref_prof2_coins',
  prof3Coins: 'ref_prof3_coins',
  nobleCoins: 'ref_noble_coins',
}

export async function loadReferralSettings(db: Db = cmsDb()): Promise<ReferralSettings> {
  const list = await rows<{ s_key: string, s_value: string }>(db, 'SELECT s_key, s_value FROM referral_settings')
  const map = new Map(list.map(r => [r.s_key, r.s_value]))
  const num = (key: string, def: number) => {
    const v = Number.parseInt(map.get(key) ?? '', 10)
    return Number.isFinite(v) ? v : def
  }
  return {
    rewardEnabled: (map.get('reward_enabled') ?? '1') === '1',
    commissionPct: num(settingKeys.commissionPct, 5),
    prof1Coins: num(settingKeys.prof1Coins, 0),
    prof2Coins: num(settingKeys.prof2Coins, 0),
    prof3Coins: num(settingKeys.prof3Coins, 0),
    nobleCoins: num(settingKeys.nobleCoins, 0),
  }
}

export async function generateRefCode(db: Db): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const code = randomCode(8)
    if (!await row(db, 'SELECT 1 FROM master_accounts WHERE ref_code = ?', [code])) return code
  }
  throw new Error('Не удалось сгенерировать реферальный код')
}

/** Реферальный код мастера; создаёт его, если у старого аккаунта кода ещё нет. */
export async function ensureRefCode(masterId: number): Promise<string> {
  const db = cmsDb()
  for (let attempt = 0; attempt < 3; attempt++) {
    const current = await row<{ ref_code: string | null }>(db, 'SELECT ref_code FROM master_accounts WHERE id = ?', [masterId])
    if (current?.ref_code) return current.ref_code
    try {
      await exec(db, 'UPDATE master_accounts SET ref_code = ? WHERE id = ? AND ref_code IS NULL', [await generateRefCode(db), masterId])
    }
    catch (e) {
      if (!isDuplicateKey(e)) throw e
    }
  }
  throw new Error('Не удалось назначить реферальный код')
}

export async function findReferrer(code: string): Promise<{ id: number, login: string } | null> {
  code = code.trim()
  if (!code || code.length > 16) return null
  const ref = await row<{ id: number, login: string }>(cmsDb(), 'SELECT id, login FROM master_accounts WHERE ref_code = ?', [code])
  return ref ?? null
}

/**
 * Привязывает нового мастера к пригласившему. Не привязывает, если код неверный
 * или регистрация идёт с того же IP, что и регистрация пригласившего.
 */
export async function registerReferral(code: string, newMasterId: number, ip: string): Promise<{ id: number, login: string } | null> {
  const ref = await findReferrer(code)
  if (!ref || ref.id === newMasterId) return null

  const db = cmsDb()
  const referrer = await row<{ reg_ip: string }>(db, 'SELECT reg_ip FROM master_accounts WHERE id = ?', [ref.id])
  if (referrer?.reg_ip && ip && referrer.reg_ip.toLowerCase() === ip.toLowerCase()) return null

  try {
    await exec(db, 'INSERT INTO referral_relations (referrer_id, referred_id, created_at) VALUES (?, ?, ?)', [ref.id, newMasterId, now()])
  }
  catch (e) {
    if (isDuplicateKey(e)) return ref
    throw e
  }
  await exec(db, 'UPDATE master_accounts SET ref_by = ? WHERE id = ?', [ref.id, newMasterId])
  return ref
}

// ---------------------------------------------------------------------------
// Данные об игроке: персонажи, профессии, «отпечаток» (IP и HWID)
// ---------------------------------------------------------------------------

interface CharInfo {
  id: number
  server: GameServerId
  name: string
  tier: number
  noble: boolean
}

async function masterEmail(masterId: number): Promise<string | null> {
  const m = await row<{ email: string }>(cmsDb(), 'SELECT email FROM master_accounts WHERE id = ?', [masterId])
  return m?.email ?? null
}

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  }
  catch {
    return fallback
  }
}

/** Все персонажи мастера на всех серверах (по возрастанию id) с профессией и дворянством. */
async function masterCharacters(masterId: number): Promise<CharInfo[]> {
  const email = await masterEmail(masterId)
  if (!email) return []
  const logins = await safe(() => gameAccountLogins(email), [])
  if (!logins.length) return []

  const out: CharInfo[] = []
  for (const { id: server } of gameServers) {
    const db = gameDb(server)
    const chars = await safe(() => rows<{ id: number, name: string }>(db,
      'SELECT obj_Id AS id, char_name AS name FROM characters WHERE account_name IN (?)', [logins]), [])
    if (!chars.length) continue
    const ids = chars.map(c => Number(c.id))

    const tiers = new Map<number, number>()
    for (const sc of await safe(() => rows<{ charId: number, classId: number }>(db,
      'SELECT char_obj_id AS charId, class_id AS classId FROM character_subclasses WHERE char_obj_id IN (?)', [ids]), [])) {
      const id = Number(sc.charId)
      tiers.set(id, Math.max(tiers.get(id) ?? 0, classTier(Number(sc.classId))))
    }
    const nobles = new Set((await safe(() => rows<{ charId: number }>(db,
      'SELECT char_id AS charId FROM olympiad_nobles WHERE char_id IN (?)', [ids]), [])).map(n => Number(n.charId)))

    for (const c of chars) {
      const id = Number(c.id)
      out.push({ id, server, name: c.name, tier: tiers.get(id) ?? 0, noble: nobles.has(id) })
    }
  }
  return out.sort((a, b) => a.id - b.id)
}

interface Fingerprint {
  ips: string[]
  hwids: string[]
}

/** IP (регистрации и последних входов) и HWID всех игровых аккаунтов мастера. */
async function fingerprint(masterId: number): Promise<Fingerprint> {
  const db = cmsDb()
  const master = await row<{ email: string, reg_ip: string }>(db, 'SELECT email, reg_ip FROM master_accounts WHERE id = ?', [masterId])
  if (!master) return { ips: [], hwids: [] }

  const ips = new Set<string>()
  const hwids = new Set<string>()
  const add = (set: Set<string>, v: unknown) => {
    if (v !== null && v !== undefined && v !== '') set.add(String(v))
  }
  add(ips, master.reg_ip)

  const accounts = await safe(() => rows<{ login: string, last_ip: string | null }>(db,
    'SELECT login, last_ip FROM accounts WHERE email = ?', [master.email]), [])
  accounts.forEach(a => add(ips, a.last_ip))
  const logins = accounts.map(a => a.login)

  if (logins.length) {
    for (const { id: server } of gameServers) {
      const gdb = gameDb(server)
      // Каждый запрос отдельно: если какой-то таблицы нет или нет прав, остальные данные всё равно собираем
      for (const a of await safe(() => rows<{ last_ip: string | null }>(gdb, 'SELECT last_ip FROM accounts WHERE login IN (?)', [logins]), [])) {
        add(ips, a.last_ip)
      }
      for (const h of await safe(() => rows<{ HWID: string | null, HWIDSecond: string | null }>(gdb,
        'SELECT HWID, HWIDSecond FROM hwid_info WHERE Account IN (?)', [logins]), [])) {
        add(hwids, h.HWID)
        add(hwids, h.HWIDSecond)
      }
      for (const r of await safe(() => rows<{ rigid: number }>(gdb,
        'SELECT DISTINCT rigid FROM characters WHERE account_name IN (?) AND rigid > 0', [logins]), [])) {
        hwids.add(`rig:${Number(r.rigid)}`)
      }
    }
  }
  return { ips: [...ips], hwids: [...hwids] }
}

// ---------------------------------------------------------------------------
// Учёт выданных наград
// ---------------------------------------------------------------------------

type ClaimKind = 'player' | 'referrer'

async function claimExists(kind: ClaimKind, accountId: number, type: ReferralType): Promise<boolean> {
  return !!await row(cmsDb(), 'SELECT 1 FROM referral_claims WHERE kind = ? AND account_id = ? AND type = ?', [kind, accountId, type])
}

/** Записывает факт выдачи награды. false — такая запись уже есть (награду выдали параллельно). */
async function insertClaim(db: Db, kind: ClaimKind, accountId: number, type: ReferralType, referrerId: number, charId: number, fp: Fingerprint): Promise<boolean> {
  try {
    await exec(db,
      `INSERT INTO referral_claims (kind, account_id, type, referrer_id, char_id, ips, hwids, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [kind, accountId, type, referrerId, charId, fp.ips.join(';').slice(0, 1000), fp.hwids.join(';').slice(0, 1000), now()])
    return true
  }
  catch (e) {
    if (isDuplicateKey(e)) return false
    throw e
  }
}

/** Получал ли уже эту награду другой приглашённый того же реферера с тем же IP или HWID. */
async function alreadyRewardedPerson(kind: ClaimKind, referrerId: number, type: ReferralType, fp: Fingerprint): Promise<boolean> {
  if (!fp.ips.length && !fp.hwids.length) return false
  const ips = new Set(fp.ips)
  const hwids = new Set(fp.hwids)
  const claims = await rows<{ ips: string, hwids: string }>(cmsDb(),
    'SELECT ips, hwids FROM referral_claims WHERE kind = ? AND referrer_id = ? AND type = ?', [kind, referrerId, type])
  return claims.some(c =>
    c.ips.split(';').some(ip => ip && ips.has(ip))
    || c.hwids.split(';').some(h => h && hwids.has(h)))
}

async function rewardItems(rewardKey: string): Promise<{ itemId: number, count: number }[]> {
  const list = await rows<{ item_id: number, count: number }>(cmsDb(),
    'SELECT item_id, count FROM referral_reward_items WHERE reward_key = ? ORDER BY sort, id', [rewardKey])
  return list.map(i => ({ itemId: Number(i.item_id), count: Number(i.count) }))
}

async function logReward(db: Db, r: {
  kind: ClaimKind | 'commission'
  masterId: number
  referrerId: number
  referredId: number
  charId?: number
  type: ReferralType | 'commission'
  itemId?: number
  itemCount?: number
  coins?: number
  server?: string
}): Promise<void> {
  await exec(db,
    `INSERT INTO referral_rewards_log (kind, master_id, referrer_id, referred_id, char_id, type, item_id, item_count, coin_amount, server, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [r.kind, r.masterId, r.referrerId, r.referredId, r.charId ?? 0, r.type, r.itemId ?? 0, r.itemCount ?? 0, r.coins ?? 0, r.server ?? '', now()])
}

// ---------------------------------------------------------------------------
// Проверка и выдача наград
// ---------------------------------------------------------------------------

/**
 * Проверяет этапы мастера (как приглашённого) и его приглашённых (как реферера), выдаёт положенные награды.
 * Возвращает список выданных наград.
 */
export async function checkReferralRewards(masterId: number): Promise<ReferralAward[]> {
  const db = cmsDb()
  const settings = await loadReferralSettings(db)
  if (!settings.rewardEnabled) return []

  const awarded: ReferralAward[] = []

  // 1. Мастер как приглашённый: предметы на персонажа
  const relation = await row<{ referrer_id: number }>(db, 'SELECT referrer_id FROM referral_relations WHERE referred_id = ?', [masterId])
  const referrerId = Number(relation?.referrer_id ?? 0)
  if (referrerId > 0) {
    const chars = await masterCharacters(masterId)
    if (chars.length) {
      const fp = await fingerprint(masterId)

      const givePlayer = async (type: ReferralType, rewardKey: string, ch: CharInfo | undefined) => {
        if (!ch) return
        if (await claimExists('player', masterId, type)) return
        if (await alreadyRewardedPerson('player', referrerId, type, fp)) return
        const items = await rewardItems(rewardKey)
        if (!items.length) return // предметы не настроены — проверим снова позже
        // Сначала запись о выдаче (уникальный ключ не даст выдать дважды), потом сами предметы
        if (!await insertClaim(db, 'player', masterId, type, referrerId, ch.id, fp)) return
        try {
          await exec(gameDb(ch.server), 'INSERT INTO items_delayed (owner_id, item_id, count, description) VALUES ?',
            [items.map(i => [ch.id, i.itemId, i.count, 'Referral reward'])])
        }
        catch (e) {
          await exec(db, 'DELETE FROM referral_claims WHERE kind = ? AND account_id = ? AND type = ?', ['player', masterId, type])
          console.error(`[referrals] не удалось выдать «${type}» персонажу ${ch.id}:`, e)
          return
        }
        await logReward(db, {
          kind: 'player', masterId, referrerId, referredId: masterId, charId: ch.id, type,
          itemId: items[0]!.itemId, itemCount: items.reduce((s, i) => s + i.count, 0), server: ch.server,
        })
        awarded.push({ kind: 'player', type, charName: ch.name })
      }

      await givePlayer('starter', 'starter', chars[0])
      for (const [type, tier] of PROF_TIERS) {
        await givePlayer(type, `player_${type}`, chars.find(c => c.tier >= tier))
      }
      await givePlayer('noble', 'player_noble', chars.find(c => c.noble))
    }
  }

  // 2. Мастер как реферер: монеты за этапы приглашённых
  const coinsFor: Record<typeof REFERRER_MILESTONES[number], number> = {
    prof1: settings.prof1Coins,
    prof2: settings.prof2Coins,
    prof3: settings.prof3Coins,
    noble: settings.nobleCoins,
  }
  const referred = await rows<{ referred_id: number }>(db, 'SELECT referred_id FROM referral_relations WHERE referrer_id = ?', [masterId])
  for (const { referred_id } of referred) {
    const referredId = Number(referred_id)
    const chars = await masterCharacters(referredId)
    const maxTier = Math.max(0, ...chars.map(c => c.tier))
    const achieved = {
      prof1: maxTier >= 1,
      prof2: maxTier >= 2,
      prof3: maxTier >= 3,
      noble: chars.some(c => c.noble),
    }
    let fp: Fingerprint | undefined

    for (const type of REFERRER_MILESTONES) {
      const coins = coinsFor[type]
      if (!achieved[type] || coins < 1) continue
      if (await claimExists('referrer', referredId, type)) continue
      fp ??= await fingerprint(referredId)
      if (await alreadyRewardedPerson('referrer', masterId, type, fp)) continue

      const given = await transaction(db, async (conn: PoolConnection) => {
        if (!await insertClaim(conn, 'referrer', referredId, type, masterId, 0, fp!)) return false
        await exec(conn, 'UPDATE master_accounts SET coins = coins + ? WHERE id = ?', [coins, masterId])
        await logReward(conn, { kind: 'referrer', masterId, referrerId: masterId, referredId, type, coins })
        return true
      })
      if (given) awarded.push({ kind: 'referrer', type, coins })
    }
  }

  return awarded
}

/** Процент рефереру с пополнения приглашённого. Вызывается внутри транзакции подтверждения платежа. */
export async function referralCommission(conn: PoolConnection, payerId: number, amountCoins: number): Promise<void> {
  try {
    const relation = await row<{ referrer_id: number }>(conn, 'SELECT referrer_id FROM referral_relations WHERE referred_id = ?', [payerId])
    const referrerId = Number(relation?.referrer_id ?? 0)
    if (referrerId < 1) return
    const { commissionPct } = await loadReferralSettings(conn)
    if (commissionPct < 1) return
    const coins = Math.floor(amountCoins * commissionPct / 100)
    if (coins < 1) return
    await exec(conn, 'UPDATE master_accounts SET coins = coins + ? WHERE id = ?', [coins, referrerId])
    await logReward(conn, { kind: 'commission', masterId: referrerId, referrerId, referredId: payerId, type: 'commission', coins })
  }
  catch (e) {
    // Ошибка комиссии не должна мешать зачислению самого платежа
    console.error('[referrals] не удалось начислить комиссию:', e)
  }
}

// Проверку одного мастера запускаем не чаще раза в минуту: она делает много запросов к игровой БД
const lastCheck = new Map<number, number>()

export async function checkReferralRewardsThrottled(masterId: number): Promise<ReferralAward[]> {
  const t = Date.now()
  if (t - (lastCheck.get(masterId) ?? 0) < 60_000) return []
  lastCheck.set(masterId, t)
  if (lastCheck.size > 10_000) lastCheck.clear()
  return checkReferralRewards(masterId)
}

let scanning = false

/** Проверяет всех участников реферальной программы. null — проверка уже идёт. */
export async function scanAllReferralRewards(): Promise<{ checked: number, awarded: number } | null> {
  if (scanning) return null
  scanning = true
  try {
    const ids = await rows<{ id: number }>(cmsDb(),
      'SELECT referrer_id AS id FROM referral_relations UNION SELECT referred_id AS id FROM referral_relations')
    let awarded = 0
    for (const { id } of ids) {
      try {
        awarded += (await checkReferralRewards(Number(id))).length
      }
      catch (e) {
        console.error(`[referrals] ошибка проверки мастера ${id}:`, e)
      }
    }
    return { checked: ids.length, awarded }
  }
  finally {
    scanning = false
  }
}
