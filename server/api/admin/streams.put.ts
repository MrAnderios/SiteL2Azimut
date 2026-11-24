import type { AdminStreams } from '#shared/streams'
import { streamsTextMax } from '#shared/streams'

export default defineEventHandler(async (event): Promise<AdminStreams> => {
  await requireAdmin(event)
  const body = await readJson(event)
  if (typeof body.text !== 'string')
    fail(400, 'invalid_request')
  if (body.text.length > streamsTextMax)
    fail(400, 'invalid_request')

  const text = await saveSiteStreamsText(cmsDb(), body.text)
  return { text }
})