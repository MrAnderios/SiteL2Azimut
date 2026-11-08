// English texts. Must match the structure of ru.ts (checked by the Messages type).
import type { Messages } from './ru'

const en: Messages = {
  meta: {
    title: 'Azimut — Lineage 2 Epilogue',
    pageTitle: 'Azimut — Lineage 2 Epilogue x2 server | Launch Nov 27, 2026',
    description: 'Azimut is a classic Lineage 2 Epilogue x2 server with improvements for players from Siberia, the Russian Far East and Asia. Open beta on Nov 20, launch on Nov 27, 2026.',
    ogImageAlt: 'Azimut logo over a knight in golden armor',
  },

  site: {
    tagline: 'A classic Lineage 2 Epilogue server with improvements and additions.',
    footerText: 'A high-performance Lineage 2 Epilogue server for players from Siberia, the Russian Far East and Asia.',
  },

  nav: {
    rates: 'Rates',
    features: 'Features',
    store: 'Store',
    start: 'Start playing',
    community: 'Community',
  },

  header: {
    homeAria: 'Azimut — home',
    navAria: 'Main navigation',
    login: 'Log in',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    langAria: 'Site language',
  },

  footer: {
    navAria: 'Sections',
    nav: 'Navigation',
    contacts: 'Contacts',
    copyright: 'Lineage II is a trademark of NCSOFT Corporation.',
  },

  hero: {
    play: 'Join the server',
    countdownLabel: 'Server launch in',
    opened: 'The server is live!',
    obt: 'Open beta',
    launch: 'Launch',
    scrollAria: 'Scroll to rates',
    obtLabel: 'Nov 20, 2026, 19:00 (MSK, UTC+3)',
    launchLabel: 'Nov 27, 2026, 19:00 (MSK, UTC+3)',
  },

  countdown: {
    days: 'days',
    hours: 'hours',
    minutes: 'minutes',
    seconds: 'seconds',
  },

  rates: {
    eyebrow: 'Low Rate',
    title: 'Server rates',
    intro: 'Autumn launch of a Low Rate server focused on spoil and craft.',
  },

  streams: {
    title: 'AzimutLive streams',
    text: 'Watch live streams from our players and staff. This is where life on Azimut happens in real time.',
  },

  features: {
    eyebrow: 'Features',
    title: 'A server for players worldwide',
    badge: 'Events scheduled for different time zones',
    intro:
      'We know that players from Siberia, the Russian Far East and Asia find it inconvenient to play on European servers running on Moscow time. That is why server events will be balanced across time zones whenever possible.',
    list: [
      'Community Board with minimal pay-to-win donations',
      'No gear or consumables in the Community Board',
      'Community Buff without 3rd class buffs',
      'Events',
      'New instance zones for comfortable play from any time zone',
      'Reworked relevance of epic bosses and some classes',
      'Rate boost and leveling services',
    ],
    moreBefore: 'Learn more in our',
    moreLink: 'Telegram channel',
    moreAfter: '.',
    description: 'Description',
    bonuses: 'Bonuses',
  },

  bonuses: {
    title: 'Bonuses',
    more: 'Learn more →',
    items: {
      clans: 'Bonus for transferring clans',
      earlyDonate: 'Early donation bonuses',
    },
  },

  stability: {
    title: 'Stability',
    items: {
      datacenter: 'Powerful data center',
      ddos: 'DDoS protection',
      bots: 'Smart Guard anti-bot protection',
    },
  },

  store: {
    eyebrow: 'Store',
    buy: 'Buy Coin of Luck',
  },

  start: {
    eyebrow: 'Four steps',
    title: 'Start playing',
    steps: {
      register: {
        title: 'Create an account',
        text: 'Register a master account to create your game accounts.',
        action: 'Sign up',
      },
      patch: {
        title: 'Azimut patch',
        text: 'Required for items and skills to display correctly.',
        action: 'Download patch',
      },
      client: {
        title: 'Game client',
        text: 'A clean Lineage 2 Epilogue client. Don’t forget to install the server patch.',
        action: 'Download client',
      },
      updater: {
        title: 'Azimut Updater',
        text: 'Automatically keeps your game files up to date.',
        action: 'Download launcher',
      },
    },
  },

  community: {
    eyebrow: 'Community',
    title: 'Join the Azimut community',
    text: 'Join our community of players from Siberia, the Russian Far East and Asia. We’ve built a unique place to connect, where you’ll find answers to all your questions and support from the Azimut team.',
    telegram: 'Open Telegram',
    bannersAria: 'Azimut in server rankings',
    banners: {
      l2servera: 'New Lineage 2 servers',
    },
  },
}

export default en
