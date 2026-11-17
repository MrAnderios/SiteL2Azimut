import type { H3Event } from 'h3'
import type { VisitCounts, VisitReport, VisitSection } from '#shared/visits'
import { visitDay, visitDayOffset, visitSections } from '#shared/visits'
import type { Db } from './db'

const countSql = `COUNT(DISTINCT IF(day = ?, ip, NULL)) AS today,
  COUNT(DISTINCT IF(day >= ?, ip, NULL)) AS week,
  COUNT(DISTINCT IF(day >= ?, ip, NULL)) AS month,
  COUNT(DISTINCT ip) AS total`

/**
 * IP захода. В проде nginx ставит X-Real-IP.
 * В dev у сокета Nitro нет remoteAddress: адрес приходит от прокси Vite в X-Forwarded-For.
 */
export function visitClientIp(event: H3Event): string {
  const direct = clientIp(event)
  if (direct) return direct
  return (getRequestHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim() || '').slice(0, 45)
}

/** Повтор в том же разделе в те же сутки не создаёт новую строку. */
export async function recordVisit(ip: string, section: VisitSection): Promise<void> {
  await exec(cmsDb(),
    'INSERT IGNORE INTO site_visits (section, day, ip, created_at) VALUES (?, ?, ?, ?)',
    [section, visitDay(), ip, Math.floor(Date.now() / 1000)])
}

/** Уникальные IP: сегодня, 7 и 30 суток включая сегодня, и за всё время. */
export async function visitReport(db: Db): Promise<VisitReport> {
  const today = visitDay()
  const params = [today, visitDayOffset(6), visitDayOffset(29)]
  const [bySection, overall] = await Promise.all([
    rows<CountRow>(db, `SELECT section, ${countSql} FROM site_visits GROUP BY section`, params),
    row<CountRow>(db, `SELECT ${countSql} FROM site_visits`, params),
  ])

  const found = new Map(bySection.map(r => [r.section, counts(r)]))
  return {
    sections: visitSections.map(section => ({ section, ...(found.get(section) ?? emptyCounts()) })),
    total: counts(overall),
  }
}

interface CountRow extends Record<keyof VisitCounts, unknown> {
  section?: string
}

function counts(source?: CountRow): VisitCounts {
  return {
    today: Number(source?.today) || 0,
    week: Number(source?.week) || 0,
    month: Number(source?.month) || 0,
    total: Number(source?.total) || 0,
  }
}

function emptyCounts(): VisitCounts {
  return { today: 0, week: 0, month: 0, total: 0 }
}
