// Доступ к данным форума и общие помощники (база la2, таблицы forum_*).
// Счётчики раздела считаются запросом, а темы хранят пересчитываемые reply_count/last_post_*.
import type { Db } from './db'
import type { ForumPost, ForumSection, ForumTopic, ForumTopicDetail } from '#shared/forum'
import { forumLimits } from '#shared/forum'

/** Таблицы форума ещё не созданы (server/database/forum.sql не выполняли). */
export function isMissingTable(e: unknown): boolean {
  const err = e as { code?: string, errno?: number }
  return err?.code === 'ER_NO_SUCH_TABLE' || err?.errno === 1146
}

/** Если таблиц нет — отдаём 503 forum_unavailable, иначе пробрасываем ошибку дальше. */
export function forumFail(e: unknown): never {
  if (isMissingTable(e)) fail(503, 'forum_unavailable')
  throw e
}

export function validateTitle(title: string): void {
  if (title.length < forumLimits.titleMin || title.length > forumLimits.titleMax) {
    fail(400, 'invalid_title', { min: forumLimits.titleMin, max: forumLimits.titleMax })
  }
}

export function validateBody(body: string): void {
  if (body.length < forumLimits.bodyMin || body.length > forumLimits.bodyMax) {
    fail(400, 'invalid_body', { min: forumLimits.bodyMin, max: forumLimits.bodyMax })
  }
}

export function validateSection(name: string, description: string): void {
  if (!name || name.length > forumLimits.sectionNameMax || description.length > forumLimits.sectionDescMax) {
    fail(400, 'invalid_section', { max: forumLimits.sectionNameMax })
  }
}

/** Параметры пагинации из query.page (1-based). */
export function pagination(query: Record<string, unknown>): { page: number, limit: number, offset: number } {
  const raw = Number(query.page)
  const page = Number.isFinite(raw) ? Math.min(Math.max(Math.trunc(raw), 1), forumLimits.maxPages) : 1
  return { page, limit: forumLimits.perPage, offset: (page - 1) * forumLimits.perPage }
}

export function pages(total: number): number {
  return Math.max(1, Math.ceil(total / forumLimits.perPage))
}

// ---------------------------------------------------------------------------
// Мапперы строк БД → типы API
// ---------------------------------------------------------------------------

function mapSection(r: Record<string, unknown>): ForumSection {
  return {
    id: Number(r.id),
    name: String(r.name),
    description: String(r.description ?? ''),
    sort: Number(r.sort),
    topicCount: Number(r.topicCount),
    postCount: Number(r.postCount),
    lastPostAt: Number(r.lastPostAt),
    lastTopicId: r.lastTopicId == null ? null : Number(r.lastTopicId),
    lastTopicTitle: r.lastTopicTitle == null ? null : String(r.lastTopicTitle),
  }
}

function mapTopic(r: Record<string, unknown>): ForumTopic {
  return {
    id: Number(r.id),
    sectionId: Number(r.sectionId),
    title: String(r.title),
    authorId: Number(r.authorId),
    authorLogin: String(r.authorLogin ?? ''),
    isPinned: !!Number(r.isPinned),
    isLocked: !!Number(r.isLocked),
    viewCount: Number(r.viewCount),
    replyCount: Number(r.replyCount),
    createdAt: Number(r.createdAt),
    lastPostAt: Number(r.lastPostAt),
    lastPostLogin: String(r.lastPostLogin ?? ''),
  }
}

function mapPost(r: Record<string, unknown>): ForumPost {
  return {
    id: Number(r.id),
    topicId: Number(r.topicId),
    body: String(r.body),
    authorId: Number(r.authorId),
    authorLogin: String(r.authorLogin ?? ''),
    createdAt: Number(r.createdAt),
    updatedAt: Number(r.updatedAt),
  }
}

// ---------------------------------------------------------------------------
// Запросы
// ---------------------------------------------------------------------------

// Поля раздела со счётчиками и последней активностью (считаются из тем/сообщений).
const SECTION_FIELDS = `
  s.id, s.name, s.description, s.sort,
  (SELECT COUNT(*) FROM forum_topics t WHERE t.section_id = s.id) AS topicCount,
  (SELECT COUNT(*) FROM forum_topics t WHERE t.section_id = s.id)
    + (SELECT COUNT(*) FROM forum_posts p JOIN forum_topics t ON p.topic_id = t.id WHERE t.section_id = s.id) AS postCount,
  (SELECT COALESCE(MAX(t.last_post_at), 0) FROM forum_topics t WHERE t.section_id = s.id) AS lastPostAt,
  (SELECT t.id FROM forum_topics t WHERE t.section_id = s.id ORDER BY t.last_post_at DESC, t.id DESC LIMIT 1) AS lastTopicId,
  (SELECT t.title FROM forum_topics t WHERE t.section_id = s.id ORDER BY t.last_post_at DESC, t.id DESC LIMIT 1) AS lastTopicTitle`

const TOPIC_FIELDS = `
  id, section_id AS sectionId, title, author_id AS authorId, author_login AS authorLogin,
  is_pinned AS isPinned, is_locked AS isLocked, view_count AS viewCount, reply_count AS replyCount,
  created_at AS createdAt, last_post_at AS lastPostAt, last_post_login AS lastPostLogin`

export async function listSections(db: Db): Promise<ForumSection[]> {
  const list = await rows<Record<string, unknown>>(db, `SELECT ${SECTION_FIELDS} FROM forum_sections s ORDER BY s.sort, s.id`)
  return list.map(mapSection)
}

export async function getSection(db: Db, id: number): Promise<ForumSection | null> {
  const r = await row<Record<string, unknown>>(db, `SELECT ${SECTION_FIELDS} FROM forum_sections s WHERE s.id = ?`, [id])
  return r ? mapSection(r) : null
}

export async function listTopics(db: Db, sectionId: number, offset: number, limit: number): Promise<ForumTopic[]> {
  const list = await rows<Record<string, unknown>>(db,
    `SELECT ${TOPIC_FIELDS} FROM forum_topics WHERE section_id = ? ORDER BY is_pinned DESC, last_post_at DESC, id DESC LIMIT ? OFFSET ?`,
    [sectionId, limit, offset])
  return list.map(mapTopic)
}

export async function countTopics(db: Db, sectionId: number): Promise<number> {
  const r = await row<{ n: number }>(db, 'SELECT COUNT(*) AS n FROM forum_topics WHERE section_id = ?', [sectionId])
  return Number(r?.n ?? 0)
}

export async function getTopic(db: Db, id: number): Promise<ForumTopicDetail | null> {
  const r = await row<Record<string, unknown>>(db,
    `SELECT ${TOPIC_FIELDS}, body, (SELECT name FROM forum_sections WHERE id = forum_topics.section_id) AS sectionName FROM forum_topics WHERE id = ?`,
    [id])
  if (!r) return null
  return { ...mapTopic(r), body: String(r.body), sectionName: String(r.sectionName ?? '') }
}

export async function listPosts(db: Db, topicId: number, offset: number, limit: number): Promise<ForumPost[]> {
  const list = await rows<Record<string, unknown>>(db,
    'SELECT id, topic_id AS topicId, body, author_id AS authorId, author_login AS authorLogin, created_at AS createdAt, updated_at AS updatedAt FROM forum_posts WHERE topic_id = ? ORDER BY created_at, id LIMIT ? OFFSET ?',
    [topicId, limit, offset])
  return list.map(mapPost)
}

export async function countPosts(db: Db, topicId: number): Promise<number> {
  const r = await row<{ n: number }>(db, 'SELECT COUNT(*) AS n FROM forum_posts WHERE topic_id = ?', [topicId])
  return Number(r?.n ?? 0)
}

export async function getPost(db: Db, id: number): Promise<ForumPost | null> {
  const r = await row<Record<string, unknown>>(db,
    'SELECT id, topic_id AS topicId, body, author_id AS authorId, author_login AS authorLogin, created_at AS createdAt, updated_at AS updatedAt FROM forum_posts WHERE id = ?',
    [id])
  return r ? mapPost(r) : null
}

/** Пересчитывает счётчик ответов и последнюю активность темы из forum_posts. */
export async function recomputeTopic(db: Db, topicId: number): Promise<void> {
  await exec(db,
    `UPDATE forum_topics t
        SET reply_count = (SELECT COUNT(*) FROM forum_posts p WHERE p.topic_id = t.id),
            last_post_at = COALESCE((SELECT MAX(p.created_at) FROM forum_posts p WHERE p.topic_id = t.id), t.created_at),
            last_post_login = COALESCE((SELECT p.author_login FROM forum_posts p WHERE p.topic_id = t.id ORDER BY p.created_at DESC, p.id DESC LIMIT 1), t.author_login)
      WHERE t.id = ?`,
    [topicId])
}