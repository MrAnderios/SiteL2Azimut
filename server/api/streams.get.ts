import type { StreamsPayload } from '#shared/streams'

// Публичный список стримов для секции #streams на главной. Кеш в server/utils/siteStreams.ts.
export default defineEventHandler(async (event): Promise<StreamsPayload> => {
  setResponseHeader(event, 'access-control-allow-origin', '*')
  const streams = await getPublicStreams(cmsDb())
  return { streams }
})