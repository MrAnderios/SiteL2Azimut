import { forumLimits } from '#shared/forum'
import type { ApiErrorCode } from '#shared/cabinet'

function pageOf(value: unknown): number {
  const n = int(value)
  if (!Number.isFinite(n) || n < 1) return 1
  return Math.min(n, 10_000)
}

export function forumPage(event: Parameters<typeof getQuery>[0]): number {
  return pageOf(getQuery(event).page)
}

/** Целый id из пути. Ноль, дробь и мусор — та же ошибка, что и отсутствующая запись. */
export function forumParamId(
  event: Parameters<typeof getRouterParam>[0],
  param: string,
  missing: Extract<ApiErrorCode, 'topic_not_found' | 'post_not_found' | 'master_not_found'>,
): number {
  const id = int(getRouterParam(event, param))
  if (!Number.isFinite(id) || id < 1) fail(404, missing)
  return id
}

export function forumBool(value: unknown): boolean {
  if (typeof value !== 'boolean') fail(400, 'invalid_post')
  return value
}

export function forumPageCount(total: number): number {
  return Math.max(1, Math.ceil(total / forumLimits.pageSize))
}

export function forumPageWindow(total: number, page: number): { page: number, pages: number, limit: number, offset: number } {
  const pages = forumPageCount(total)
  const current = Math.min(page, pages)
  return {
    page: current,
    pages,
    limit: forumLimits.pageSize,
    offset: (current - 1) * forumLimits.pageSize,
  }
}
