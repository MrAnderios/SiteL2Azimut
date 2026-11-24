import type { Db } from './db'
import { normalizeStreamsText, parseStreamsText, SITE_STREAMS_KEY } from '#shared/streams'

const CACHE_MS = 30_000
let cache: { at: number, streams: string[] } | undefined

export function invalidatePublicStreamsCache() {
  cache = undefined
}

export async function loadSiteStreamsText(db: Db): Promise<string> {
  const found = await row<{ s_value: string }>(
    db,
    'SELECT s_value FROM site_settings WHERE s_key = ? LIMIT 1',
    [SITE_STREAMS_KEY],
  )
  return found?.s_value ?? ''
}

export async function saveSiteStreamsText(db: Db, raw: string): Promise<string> {
  const text = normalizeStreamsText(raw)
  await exec(
    db,
    'INSERT INTO site_settings (s_key, s_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE s_value = VALUES(s_value)',
    [SITE_STREAMS_KEY, text],
  )
  invalidatePublicStreamsCache()
  return text
}

export async function getPublicStreams(db: Db): Promise<string[]> {
  const now = Date.now()
  if (cache && now - cache.at < CACHE_MS)
    return cache.streams
  const streams = parseStreamsText(await loadSiteStreamsText(db))
  cache = { at: now, streams }
  return streams
}