// Настройки личного кабинета, общие для сервера и фронтенда (не секретные).
// Доступы к БД и прочие секреты — в переменных окружения (см. .env.example).

/** Донат-валюта: на баланс мастер-аккаунта начисляются монеты, в игру выдаётся этот предмет. */
export const donateItem = {
  id: 4037,
  name: 'Coin of Luck',
} as const

/** Оплата по СБП с ручным подтверждением администратором. */
export const payment = {
  provider: 'manual',
  /** Сколько рублей стоит одна монета */
  coinPrice: 1,
  minRub: 10,
  maxRub: 100_000,
  /** Через сколько секунд неоплаченный счёт истекает */
  ttlSec: 86_400,
  /** Ссылка на картинку личного QR СБП. Если пусто — QR генерируется из кода платежа. */
  sbpPersonalQrUrl: '',
} as const

export const limits = {
  loginMin: 2,
  loginMax: 32,
  emailMax: 45,
  passwordMin: 6,
  passwordMax: 64,
  /** Максимум монет за один перевод персонажу */
  transferMax: 1_000_000_000,
} as const

export const loginPattern = /^[a-zA-Z0-9_.-]+$/

/**
 * Игровые серверы. id — имя игровой БД (на том же MySQL, что и логин-сервер,
 * если не задано NUXT_GAME_DB_HOST). Сейчас игровой сервер работает на la2x3:
 * сменили с la2x, чтобы статистика и кабинет читали актуальную базу.
 */
export const gameServers = [
  { id: 'la2x3', name: 'Azimut' },
] as const

export type GameServerId = typeof gameServers[number]['id']

export function isGameServerId(id: unknown): id is GameServerId {
  return gameServers.some(s => s.id === id)
}

export function gameServerName(id: string): string {
  return gameServers.find(s => s.id === id)?.name ?? id
}

export const l2Classes: Record<number, string> = {
  0: 'Human Fighter', 1: 'Warrior', 2: 'Gladiator', 3: 'Warlord',
  4: 'Knight', 5: 'Paladin', 6: 'Dark Avenger', 7: 'Rogue',
  8: 'Treasure Hunter', 9: 'Hawkeye', 10: 'Mage', 11: 'Wizard',
  12: 'Sorcerer', 13: 'Necromancer', 14: 'Warlock', 15: 'Cleric',
  16: 'Bishop', 17: 'Prophet', 18: 'Elven Fighter', 19: 'Elven Knight',
  20: 'Temple Knight', 21: 'Sword Singer', 22: 'Elven Scout', 23: 'Plain Walker',
  24: 'Silver Ranger', 25: 'Elven Mage', 26: 'Elven Wizard', 27: 'Spellsinger',
  28: 'Elemental Summoner', 29: 'Oracle', 30: 'Elder', 31: 'Dark Fighter',
  32: 'Palus Knight', 33: 'Shillien Knight', 34: 'Bladedancer', 35: 'Assassin',
  36: 'Abyss Walker', 37: 'Phantom Ranger', 38: 'Dark Mage', 39: 'Dark Wizard',
  40: 'Spellhowler', 41: 'Phantom Summoner', 42: 'Shillien Oracle', 43: 'Shillien Elder',
  44: 'Orc Fighter', 45: 'Orc Raider', 46: 'Destroyer', 47: 'Orc Monk',
  48: 'Tyrant', 49: 'Orc Mage', 50: 'Orc Shaman', 51: 'Overlord',
  52: 'Warcryer', 53: 'Dwarven Fighter', 54: 'Scavenger', 55: 'Bounty Hunter',
  56: 'Artisan', 57: 'Warsmith', 88: 'Duelist', 89: 'Dreadnought',
  90: 'Phoenix Knight', 91: 'Hell Knight', 92: 'Sagittarius', 93: 'Adventurer',
  94: 'Archmage', 95: 'Soultaker', 96: 'Arcana Lord', 97: 'Cardinal',
  98: 'Hierophant', 99: 'Eva\'s Templar', 100: 'Sword Muse', 101: 'Wind Rider',
  102: 'Moonlight Sentinel', 103: 'Mystic Muse', 104: 'Elemental Master', 105: 'Eva\'s Saint',
  106: 'Shillien Templar', 107: 'Spectral Dancer', 108: 'Ghost Hunter', 109: 'Ghost Sentinel',
  110: 'Storm Screamer', 111: 'Spectral Master', 112: 'Shillien Saint', 113: 'Titan',
  114: 'Grand Khavatari', 115: 'Dominator', 116: 'Doom Cryer', 117: 'Fortune Seeker',
  118: 'Maestro',
  // Kamael (High Five)
  123: 'Male Soldier', 124: 'Female Soldier', 125: 'Trooper', 126: 'Warder',
  127: 'Berserker', 128: 'Male Soul Breaker', 129: 'Female Soul Breaker',
  130: 'Arbalester', 131: 'Doombringer',
  132: 'Male Soul Hound', 133: 'Female Soul Hound',
  134: 'Trickster', 135: 'Inspector', 136: 'Judicator',
}

// ---------------------------------------------------------------------------
// Типы ответов API
// ---------------------------------------------------------------------------

/** Коды ошибок API. Тексты для них — в locales: cabinet.errors */
export type ApiErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'too_many_requests'
  | 'bad_origin'
  | 'invalid_login'
  | 'invalid_email'
  | 'invalid_password'
  | 'password_mismatch'
  | 'invalid_credentials'
  | 'login_taken'
  | 'game_login_taken'
  | 'invalid_amount'
  | 'not_enough_coins'
  | 'unknown_server'
  | 'character_not_found'
  | 'delivery_failed'
  | 'payment_not_found'
  | 'payment_processed'
  | 'master_not_found'
  | 'invalid_item'
  | 'invalid_reward_key'
  | 'server_error'

export interface AuthUser {
  id: number
  login: string
  isAdmin: boolean
}

export interface Character {
  id: number
  name: string
  classId: number | null
  level: number | null
  online: boolean
}

export interface GameAccountServer {
  id: GameServerId
  name: string
  /** null — не удалось загрузить персонажей (сервер недоступен) */
  characters: Character[] | null
}

export interface GameAccount {
  login: string
  servers: GameAccountServer[]
}

export interface CabinetOverview {
  login: string
  coins: number
  accounts: GameAccount[]
}

export type PaymentStatus = 'pending' | 'paid' | 'canceled' | 'expired'

export interface Payment {
  id: number
  code: string
  amountRub: number
  amountCoins: number
  status: PaymentStatus
  createdAt: number
  paidAt: number
}

export interface PaymentDetails extends Payment {
  /** Картинка QR (data: URL или ссылка на личный QR СБП); только для ожидающих оплаты */
  qr: string | null
}

export interface PaymentsResponse {
  coins: number
  active: PaymentDetails | null
  history: Payment[]
}

export type ReferralType = 'starter' | 'prof1' | 'prof2' | 'prof3' | 'noble'
export type ReferralLogKind = 'player' | 'referrer' | 'commission'

/** Награда, выданная при проверке реферальной программы */
export type ReferralAward =
  | { kind: 'player', type: ReferralType, charName: string }
  | { kind: 'referrer', type: ReferralType, coins: number }

export interface ReferralSettings {
  rewardEnabled: boolean
  commissionPct: number
  prof1Coins: number
  prof2Coins: number
  prof3Coins: number
  nobleCoins: number
}

export interface ReferralLogEntry {
  id: number
  kind: ReferralLogKind
  type: ReferralType | 'commission'
  itemId: number
  itemCount: number
  coinAmount: number
  createdAt: number
}

export interface ReferralsResponse {
  code: string
  referredBy: string | null
  invites: { login: string, createdAt: number }[]
  earnings: number
  log: ReferralLogEntry[]
  settings: ReferralSettings
}

export interface AdminMaster {
  id: number
  login: string
  email: string
  coins: number
  createdAt: number
}

export interface AdminPayment extends Payment {
  masterLogin: string
  confirmedBy: string
}

export interface AdminLogEntry {
  id: number
  masterLogin: string
  target: string
  server: string
  amount: number
  action: string
  createdAt: number
}

export interface AdminDashboard {
  masters: AdminMaster[]
  pending: AdminPayment[]
  history: AdminPayment[]
  log: AdminLogEntry[]
}

/** Ключи наборов предметов, которые получает приглашённый игрок */
export const referralRewardKeys = ['starter', 'player_prof1', 'player_prof2', 'player_prof3', 'player_noble'] as const
export type ReferralRewardKey = typeof referralRewardKeys[number]

export interface AdminReferrals {
  settings: ReferralSettings
  items: Record<ReferralRewardKey, { id: number, itemId: number, count: number }[]>
  top: { login: string, invites: number, earned: number }[]
  log: (ReferralLogEntry & { masterLogin: string | null, referredLogin: string | null })[]
}
