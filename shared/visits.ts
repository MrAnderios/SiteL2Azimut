// Уникальные заходы по IP. Сутки — календарный день Москвы (UTC+3, без летнего времени).

export const visitSections = ['site', 'stats', 'cabinet', 'forum'] as const
export type VisitSection = typeof visitSections[number]

export interface VisitCounts {
  today: number
  week: number
  month: number
  total: number
}

export interface VisitReport {
  sections: (VisitCounts & { section: VisitSection })[]
  total: VisitCounts
}

const visitDayFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Moscow',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** YYYYMMDD по московскому времени. */
export function visitDay(now = new Date()): string {
  return visitDayFormat.format(now).replaceAll('-', '')
}

/** На days суток раньше. У Москвы нет перехода на летнее время, сутки ровно 24 часа. */
export function visitDayOffset(days: number, now = new Date()): string {
  return visitDay(new Date(now.getTime() - days * 86_400_000))
}

/**
 * Раздел по пути страницы. Префикс /en снимается.
 * Кабинет — /cabinet, вход и регистрация. Админка не считается.
 */
export function visitSectionFromPath(input: string): VisitSection | null {
  const cut = input.split('?')[0]?.split('#')[0] ?? ''
  if (!cut.startsWith('/') || cut.startsWith('//') || cut.length > 200) return null
  if (/[\u0000-\u001f]/.test(cut)) return null

  let path = cut.length > 1 && cut.endsWith('/') ? cut.slice(0, -1) : cut
  if (path === '/en') path = '/'
  else if (path.startsWith('/en/')) path = path.slice(3)

  if (path === '/') return 'site'
  if (path === '/stats' || path.startsWith('/stats/')) return 'stats'
  if (path === '/cabinet' || path.startsWith('/cabinet/') || path === '/login' || path === '/register') return 'cabinet'
  if (path === '/forum' || path.startsWith('/forum/')) return 'forum'
  return null
}
