import { forumLimits, forumNamePattern } from '#shared/forum'
import type { ApiErrorCode } from '#shared/cabinet'

function singleSpaced(raw: string): string {
  return raw.normalize('NFC').replace(/\s+/g, ' ').trim()
}

export function normalizeForumName(raw: string): string {
  return singleSpaced(raw)
}

export function normalizeTitle(raw: string): string {
  return singleSpaced(raw)
}

export function normalizeBody(raw: string): string {
  return raw.replace(/\r\n?/g, '\n').trim()
}

export function validateForumName(name: string): void {
  if (
    name.length < forumLimits.nameMin
    || name.length > forumLimits.nameMax
    || !forumNamePattern.test(name)
  ) {
    fail(400, 'invalid_forum_name', { min: forumLimits.nameMin, max: forumLimits.nameMax })
  }
}

export function validateTitle(title: string): void {
  if (!title || title.length > forumLimits.titleMax) fail(400, 'invalid_title', { max: forumLimits.titleMax })
}

export function validateBody(body: string): void {
  if (!body || body.length > forumLimits.bodyMax) fail(400, 'invalid_post', { max: forumLimits.bodyMax })
}

function isBadString(e: unknown): boolean {
  const err = e as { errno?: number, code?: string }
  return err.errno === 1366 || err.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD'
}

/** Строка, которую utf8-колонка не принимает, — это кривой текст, а не сбой сервера. */
export function failIfBadForumText(e: unknown, code: Extract<ApiErrorCode, 'invalid_forum_name' | 'invalid_post'>): void {
  if (!isBadString(e)) return
  if (code === 'invalid_forum_name') fail(400, code, { min: forumLimits.nameMin, max: forumLimits.nameMax })
  fail(400, code, { max: forumLimits.bodyMax })
}
