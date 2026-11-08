import type { H3Event } from 'h3'

// Простой ограничитель частоты в памяти процесса (сайт работает одним процессом Node).
const buckets = new Map<string, { count: number, resetAt: number }>()

setInterval(() => {
  const t = Date.now()
  for (const [key, b] of buckets) {
    if (b.resetAt <= t) buckets.delete(key)
  }
}, 60_000).unref()

/** Бросает 429, если по ключу больше limit запросов за windowSec секунд. */
export function rateLimit(key: string, limit: number, windowSec: number): void {
  const t = Date.now()
  let b = buckets.get(key)
  if (!b || b.resetAt <= t) {
    b = { count: 0, resetAt: t + windowSec * 1000 }
    buckets.set(key, b)
  }
  b.count++
  if (b.count > limit) {
    fail(429, 'too_many_requests')
  }
}

/**
 * IP посетителя. За nginx берём X-Real-IP (его ставит nginx из $remote_addr, подделать нельзя),
 * а не X-Forwarded-For, первый адрес в котором присылает сам клиент.
 */
export function clientIp(event: H3Event): string {
  const real = getRequestHeader(event, 'x-real-ip')?.trim()
  return (real || getRequestIP(event) || '').slice(0, 45)
}
