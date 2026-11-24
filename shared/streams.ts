/** Ключ в site_settings: список стримов для главной (по одному на строку). */
export const SITE_STREAMS_KEY = 'streams'

/** Максимум символов в поле стримов в админке. */
export const streamsTextMax = 32_000

export interface StreamsPayload {
  streams: string[]
}

export interface AdminStreams {
  text: string
}

/** Разбивает сохранённый текст на строки стримов (пустые пропускает). */
export function parseStreamsText(text: string): string[] {
  return text.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
}

/** Перед сохранением: обрезка строк и единый разделитель. */
export function normalizeStreamsText(text: string): string {
  return parseStreamsText(text).join('\n')
}