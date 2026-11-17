import { visitSectionFromPath } from '#shared/visits'

// Заход фиксирует браузер при открытии страницы. Раздел определяет сервер, не клиент.
export default defineEventHandler(async (event) => {
  const section = visitSectionFromPath(str((await readJson(event)).path))
  if (!section) return { ok: true }

  const ip = visitClientIp(event)
  if (!ip) return { ok: true }

  rateLimit(`visit:${ip}`, 60, 60)
  await recordVisit(ip, section)
  return { ok: true }
})
