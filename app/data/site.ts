// Данные лендинга, не зависящие от языка: ссылки, даты, рейты, картинки.
// Тексты — в app/locales/ru.ts и app/locales/en.ts.
import type { IconName } from '~/components/ui/UiIcon.vue'
import type { Messages } from '~/locales/ru'

export const site = {
  name: 'Azimut',
  email: 'help@azimut-l2.ru',
}

export const links = {
  // Личный кабинет (внутренние страницы, языковой префикс добавляет UiButton)
  login: '/login',
  cabinet: '/cabinet',
  register: '/register',
  // Старая PHP-CMS: сюда ведут ссылки на кабинет, пока новый выключен (см. useCabinetEnabled)
  legacyCabinet: 'https://a-bilding.ru/Register/login.php',
  patch: 'https://drive.google.com/file/d/1j4D_xYExtOzeKC-ZUh5VHaPcPvj9zH01/view?usp=sharing',
  client: 'https://drive.google.com/file/d/1WdfNdyyZqIsxi5epQJ032w7eKRXU80xn/view?usp=sharing',
  // Английский языковой пакет для клиента (ссылка под шагами #start; пустая строка — скрыть)
  // TODO: временная ссылка, заменить на файл пакета
  clientEn: 'https://l2azimut.ru/',
  updater: 'https://disk.yandex.ru/d/8O0FbQBAX7OpXA',
  // Реквизиты для оплаты Coin of Luck выдаются в личных сообщениях Telegram
  payment: 'https://t.me/aleks_xl',
  telegram: 'https://t.me/ShadowEpilogue',
  telegramDescription: 'https://web.telegram.org/k/#@ShadowEpilogue',
  telegramBonuses: 'https://t.me/ShadowEpilogue/2060/5182',
} as const

export const socials = [
  { label: 'Telegram', href: 'https://t.me/ShadowEpilogue' },
  { label: 'TikTok', href: 'https://www.tiktok.com/@l2azimut.com' },
  { label: 'Facebook', href: 'https://www.facebook.com/share/g/1LvxrqnqTN/' },
  // TODO: на старом сайте Instagram вёл на главную instagram.com — нужна ссылка на профиль
]

// Основной старт сервера — к нему идёт обратный отсчёт в hero.
// Подписи дат для каждого языка — в locales (hero.launchLabel / hero.obtLabel).
export const launch = { date: '2026-11-27T19:00:00+03:00' }

// Открытый бета-тест
export const obt = { date: '2026-11-20T19:00:00+03:00' }

// Стримы в секции #streams — по одному на строку, в порядке показа. Пустой массив — плееры скрыты.
// Можно вставлять как есть: ссылку на канал или видео, адрес плеера или весь код <iframe> с площадки.
// Kick, Twitch, YouTube, VK Видео, Rutube. Правила и примеры — docs/STREAMS.md.
export const streams: string[] = []

export interface Rate {
  label: string
  value: string
  image: string
}

export const rates: Rate[] = [
  { label: 'XP / SP', value: 'x2', image: '/images/rates/xp-sp.jpg' },
  { label: 'Adena', value: 'x2', image: '/images/rates/adena.jpg' },
  { label: 'Drop', value: 'x2', image: '/images/rates/drop.jpg' },
  { label: 'Spoil', value: 'x3', image: '/images/rates/spoil.jpg' },
  { label: 'Raid Boss', value: 'x5', image: '/images/rates/raid-boss.jpg' },
]

export const bonuses: { key: keyof Messages['bonuses']['items'], icon: IconName }[] = [
  { key: 'clans', icon: 'users' },
  { key: 'earlyDonate', icon: 'gift' },
]

export const stability: { key: keyof Messages['stability']['items'], icon: IconName }[] = [
  { key: 'datacenter', icon: 'server' },
  { key: 'ddos', icon: 'shield' },
  { key: 'bots', icon: 'bot' },
]

export const startSteps: { key: keyof Messages['start']['steps'], image: string, href: string }[] = [
  { key: 'register', image: '/images/start/register.jpg', href: links.register },
  { key: 'client', image: '/images/start/client.jpg', href: links.client },
  { key: 'patch', image: '/images/start/patch.jpg', href: links.patch },
  { key: 'updater', image: '/images/start/updater.jpg', href: links.updater },
]

// Баннеры рейтингов/топов серверов. Если у баннера есть labelKey — подпись берётся из locales.
// primary: true — основные рейтинги, выводятся первым рядом.
export const banners: { label: string, labelKey?: keyof Messages['community']['banners'], href: string, image: string, primary?: boolean }[] = [
  { label: 'L2Pick', href: 'https://l2pick.com/', image: '/images/banners/l2pick.webp', primary: true },
  { label: 'L2-TOP', href: 'https://l2-top.com', image: '/images/banners/l2-top.gif', primary: true },
  { label: 'New-Lineage', href: 'https://new-lineage.ru', image: '/images/banners/new-lineage.gif', primary: true },
  { label: 'L2Elo', href: 'https://l2elo.com/', image: '/images/banners/l2elo.png' },
  { label: 'L2-servera', labelKey: 'l2servera', href: 'https://l2-servera.com', image: '/images/banners/l2-servera.gif' },
  { label: 'L2Hop', href: 'https://l2hop.com/', image: '/images/banners/l2hop.jpg' },
  { label: 'L2Argument', href: 'https://l2argument.ru', image: '/images/banners/l2argument.jpg' },
  { label: 'L2Spot', href: 'https://l2spot.com/', image: '/images/banners/l2spot.png' },
  { label: 'L2Vote', href: 'https://t.me/L2Vote_bot?start=388', image: '/images/banners/l2vote.png' },
  { label: 'L2Links', href: 'https://l2links.com', image: '/images/banners/l2links.png' },
]

// Пункты меню: '#якорь' — раздел главной (работает с любой страницы), '/путь' — отдельная страница.
// Языковой префикс добавляется в AppHeader / AppFooter.
export const nav: { key: keyof Messages['nav'], href: string }[] = [
  { key: 'rates', href: '#rates' },
  { key: 'features', href: '#features' },
  { key: 'start', href: '#start' },
  { key: 'community', href: '#community' },
  { key: 'stats', href: '/stats' },
]

/** Адрес пункта меню с учётом языка: якоря ведут на главную, пути — на страницу. */
export function navTarget(href: string, localePath: (path: string) => string): string {
  return href.startsWith('#') ? `${localePath('/')}${href}` : localePath(href)
}
