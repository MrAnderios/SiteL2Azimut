// Единый источник контента лендинга. Перенесено со старого сайта l2azimut.com.
import type { IconName } from '~/components/ui/UiIcon.vue'

export const site = {
  name: 'Azimut',
  tagline: 'Классический сервер Lineage 2 Epilogue с улучшениями и дополнениями.',
  footerText: 'Высокопроизводительный сервер Lineage 2 Epilogue для игроков Сибири, Дальнего Востока и Азии.',
  email: 'help@azimut-l2.ru',
}

export const links = {
  login: 'https://a-bilding.ru/Register/login.php',
  register: 'https://a-bilding.ru/Register/login.php',
  patch: 'https://drive.google.com/file/d/1j4D_xYExtOzeKC-ZUh5VHaPcPvj9zH01/view?usp=sharing',
  client: 'https://drive.google.com/file/d/1WdfNdyyZqIsxi5epQJ032w7eKRXU80xn/view?usp=sharing',
  updater: 'https://disk.yandex.ru/d/8O0FbQBAX7OpXA',
  store: 'https://www.l2azimut.com/page', // TODO: перенести страницу магазина
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

export const launch = {
  date: '2026-09-11T19:00:00+03:00',
  label: '11.09.2026 19:00 (МСК)',
}

export interface Rate {
  label: string
  value: string
  image: string
}

export const ratesIntro = 'Старт осеннего Low Rate сервера с уклоном на споил и крафт.'

export const rates: Rate[] = [
  { label: 'XP / SP', value: 'x2', image: '/images/rates/xp-sp.jpg' },
  { label: 'Adena', value: 'x2', image: '/images/rates/adena.jpg' },
  { label: 'Drop', value: 'x2', image: '/images/rates/drop.jpg' },
  { label: 'Spoil', value: 'x7', image: '/images/rates/spoil.jpg' },
  { label: 'Raid Boss', value: 'x5', image: '/images/rates/raid-boss.jpg' },
]

export const streams = {
  title: 'Стримы AzimutLive',
  text: 'Следите за прямыми трансляциями наших игроков и администрации. Здесь кипит жизнь сервера Azimut в режиме реального времени.',
}

export const features = {
  title: 'Сервер для игроков со всего мира',
  intro:
    'Мы понимаем, что игрокам из Сибири, Дальнего Востока и Азии неудобно играть на европейских серверах с московской временной зоной. Поэтому все серверные мероприятия по возможности будут усредняться по временным зонам.',
  list: [
    'Community Board с минимальным донатом, влияющим на игровой процесс',
    'Полное отсутствие шмота и расходных материалов в Community Board',
    'Community Buff без бафов 3-й профессии',
    'Эвенты',
    'Новые инстанс-зоны для комфортной игры из разных часовых поясов',
    'Доработана актуальность эпиков и некоторых игровых классов',
    'Сервисы поднятия рейтов и прокачки',
  ],
}

export const bonuses: { title: string, icon: IconName }[] = [
  { title: 'Бонус переходящим кланам', icon: 'users' },
  { title: 'Бонусы раннего доната', icon: 'gift' },
]

export const stability = {
  title: 'Стабильность',
  text: 'Сервер установлен в мощном дата-центре, DDoS-защита. Защита от ботов Smart Guard.',
  items: [
    { title: 'Мощный дата-центр', icon: 'server' },
    { title: 'DDoS-защита', icon: 'shield' },
    { title: 'Защита от ботов Smart Guard', icon: 'bot' },
  ] as { title: string, icon: IconName }[],
}

export interface StartStep {
  title: string
  text: string
  image: string
  action: { label: string, href: string }
}

export const startSteps: StartStep[] = [
  {
    title: 'Регистрация аккаунта',
    text: 'Зарегистрируйте мастер-аккаунт для регистрации игровых аккаунтов.',
    image: '/images/start/register.jpg',
    action: { label: 'Регистрация', href: links.register },
  },
  {
    title: 'Патч Azimut',
    text: 'Необходим для корректного отображения предметов и умений.',
    image: '/images/start/patch.jpg',
    action: { label: 'Скачать патч', href: links.patch },
  },
  {
    title: 'Клиент игры',
    text: 'Чистый клиент Lineage 2 Epilogue. Не забудьте установить патч сервера.',
    image: '/images/start/client.jpg',
    action: { label: 'Скачать клиент', href: links.client },
  },
  {
    title: 'Updater Azimut',
    text: 'Автоматическое обновление файлов до актуальной версии.',
    image: '/images/start/updater.jpg',
    action: { label: 'Скачать лаунчер', href: links.updater },
  },
]

export const community = {
  title: 'Join the Azimut community',
  text: 'Присоединяйтесь к нашему сообществу игроков из Сибири, Дальнего Востока и Азии. Мы создали для вас уникальную среду для общения, где вы найдёте ответы на все вопросы и поддержку от команды Azimut.',
}

// Баннеры рейтингов/топов серверов
export const banners = [
  { label: 'L2Elo', href: 'https://l2elo.com/', image: '/images/banners/l2elo.png' },
  { label: 'Новые сервера Lineage 2', href: 'https://l2-servera.com', image: '/images/banners/l2-servera.gif' },
  { label: 'L2Argument', href: 'https://l2argument.ru', image: '/images/banners/l2argument.jpg' },
  { label: 'L2Spot', href: 'https://l2spot.com/', image: '/images/banners/l2spot.png' },
  { label: 'L2Vote', href: 'https://t.me/L2Vote_bot?start=388', image: '/images/banners/l2vote.png' },
]

export const nav = [
  { label: 'Рейты', href: '#rates' },
  { label: 'Особенности', href: '#features' },
  { label: 'Магазин', href: '#store' },
  { label: 'Начать игру', href: '#start' },
  { label: 'Сообщество', href: '#community' },
]
