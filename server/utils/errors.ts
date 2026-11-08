import type { H3Event } from 'h3'
import type { ApiErrorCode } from '#shared/cabinet'

/**
 * Ошибка API с кодом. Фронтенд показывает текст по коду (locales: cabinet.errors),
 * поэтому тексты ошибок на сервере не хранятся.
 */
export function fail(statusCode: number, code: ApiErrorCode, params?: Record<string, string | number>): never {
  throw createError({ statusCode, statusMessage: code, data: { code, params } })
}

/** Тело запроса как объект (или пустой объект, если тело не JSON-объект). */
export async function readJson(event: H3Event): Promise<Record<string, unknown>> {
  const body = await readBody(event).catch(() => null)
  return body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : {}
}

export function str(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

/** Целое число из тела запроса или NaN. */
export function int(value: unknown): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : Number.NaN
  return Number.isSafeInteger(n) ? n : Number.NaN
}
