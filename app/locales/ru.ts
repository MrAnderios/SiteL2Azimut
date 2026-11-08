// Русские тексты лендинга. Структура этого файла — эталон: en.ts обязан ей соответствовать.

const ru = {
  meta: {
    title: 'Azimut — Lineage 2 Epilogue',
    pageTitle: 'Azimut — сервер Lineage 2 Epilogue x2 | Старт 27.11.2026',
    description: 'Azimut — классический сервер Lineage 2 Epilogue x2 с улучшениями и дополнениями для игроков Сибири, Дальнего Востока и Азии. ОБТ 20.11.2026, старт 27.11.2026.',
    ogImageAlt: 'Логотип Azimut на фоне рыцаря в золотых доспехах',
  },

  site: {
    tagline: 'Классический сервер Lineage 2 Epilogue с улучшениями и дополнениями.',
    footerText: 'Высокопроизводительный сервер Lineage 2 Epilogue для игроков Сибири, Дальнего Востока и Азии.',
  },

  nav: {
    rates: 'Рейты',
    features: 'Особенности',
    store: 'Магазин',
    start: 'Начать игру',
    community: 'Сообщество',
  },

  header: {
    homeAria: 'Azimut — на главную',
    navAria: 'Основная навигация',
    login: 'Войти',
    openMenu: 'Открыть меню',
    closeMenu: 'Закрыть меню',
    langAria: 'Язык сайта',
  },

  footer: {
    navAria: 'Разделы',
    nav: 'Навигация',
    contacts: 'Связь',
    copyright: 'Lineage II является товарным знаком NCSOFT Corporation.',
  },

  hero: {
    play: 'Войти на сервер',
    countdownLabel: 'До старта сервера',
    opened: 'Сервер открыт!',
    obt: 'ОБТ',
    launch: 'Старт',
    scrollAria: 'Прокрутить к рейтам',
    obtLabel: '20.11.2026 19:00 (МСК)',
    launchLabel: '27.11.2026 19:00 (МСК)',
  },

  countdown: {
    days: 'дней',
    hours: 'часов',
    minutes: 'минут',
    seconds: 'секунд',
  },

  rates: {
    eyebrow: 'Low Rate',
    title: 'Рейты сервера',
    intro: 'Старт осеннего Low Rate сервера с уклоном на споил и крафт.',
  },

  streams: {
    title: 'Стримы AzimutLive',
    text: 'Следите за прямыми трансляциями наших игроков и администрации. Здесь кипит жизнь сервера Azimut в режиме реального времени.',
  },

  features: {
    eyebrow: 'Особенности',
    title: 'Сервер для игроков со всего мира',
    badge: 'Мероприятия под разные часовые пояса',
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
    moreBefore: 'Подробнее — в нашем',
    moreLink: 'Telegram-канале',
    moreAfter: '.',
    description: 'Описание',
    bonuses: 'Бонусы',
  },

  bonuses: {
    title: 'Бонусы',
    more: 'Подробнее →',
    items: {
      clans: 'Бонус переходящим кланам',
      earlyDonate: 'Бонусы раннего доната',
    },
  },

  stability: {
    title: 'Стабильность',
    items: {
      datacenter: 'Мощный дата-центр',
      ddos: 'DDoS-защита',
      bots: 'Защита от ботов Smart Guard',
    },
  },

  store: {
    eyebrow: 'Магазин',
    buy: 'Купить Coin of Luck',
  },

  start: {
    eyebrow: 'Четыре шага',
    title: 'Начать игру',
    steps: {
      register: {
        title: 'Регистрация аккаунта',
        text: 'Зарегистрируйте мастер-аккаунт для регистрации игровых аккаунтов.',
        action: 'Регистрация',
      },
      patch: {
        title: 'Патч Azimut',
        text: 'Необходим для корректного отображения предметов и умений.',
        action: 'Скачать патч',
      },
      client: {
        title: 'Клиент игры',
        text: 'Чистый клиент Lineage 2 Epilogue. Не забудьте установить патч сервера.',
        action: 'Скачать клиент',
      },
      updater: {
        title: 'Updater Azimut',
        text: 'Автоматическое обновление файлов до актуальной версии.',
        action: 'Скачать лаунчер',
      },
    },
  },

  community: {
    eyebrow: 'Сообщество',
    title: 'Join the Azimut community',
    text: 'Присоединяйтесь к нашему сообществу игроков из Сибири, Дальнего Востока и Азии. Мы создали для вас уникальную среду для общения, где вы найдёте ответы на все вопросы и поддержку от команды Azimut.',
    telegram: 'Перейти в Telegram',
    bannersAria: 'Мы в рейтингах серверов',
    banners: {
      l2servera: 'Новые сервера Lineage 2',
    },
  },
}

// Тип словаря: те же ключи, но любые строки (и любая длина списков)
type Widen<T> = T extends string ? string : T extends readonly (infer U)[] ? Widen<U>[] : { [K in keyof T]: Widen<T[K]> }
export type Messages = Widen<typeof ru>

export default ru satisfies Messages
