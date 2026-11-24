import type { AdminStreams } from '#shared/streams'

export default defineEventHandler(async (event): Promise<AdminStreams> => {
  await requireAdmin(event)
  const text = await loadSiteStreamsText(cmsDb())
  return { text }
})