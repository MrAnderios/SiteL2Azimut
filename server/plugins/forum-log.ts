// Необработанные ошибки форума. Клиенту уходит «Server Error»,
// код MySQL и запрос остаются в журнале сервиса (journalctl -u azimut).
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('error', (error, { event }) => {
    const path = event?.path || ''
    if (!path.startsWith('/api/forum')) return
    const status = statusOf(error)
    if (status < 500) return
    console.error('[forum]', event?.method, path, status, describe(error))
  })
})

function statusOf(error: Error): number {
  const status = (error as { statusCode?: number }).statusCode
  return typeof status === 'number' && status >= 400 ? status : 500
}

function describe(error: unknown): string {
  const parts: string[] = []
  const seen = new Set<unknown>()
  let current = error
  while (current && typeof current === 'object' && !seen.has(current)) {
    seen.add(current)
    const item = current as {
      message?: string
      code?: string
      errno?: number
      sqlState?: string
      sqlMessage?: string
      sql?: string
      cause?: unknown
    }
    if (item.code || item.errno || item.sqlMessage) {
      const head = [item.code, item.errno, item.sqlState, item.sqlMessage].filter(v => v !== undefined && v !== '').join(' ')
      if (head) parts.push(head)
      if (item.sql) parts.push(item.sql.slice(0, 500))
    }
    else if (item.message && !parts.includes(item.message)) {
      parts.push(item.message)
    }
    current = item.cause
  }
  return parts.join(' | ') || String(error)
}
