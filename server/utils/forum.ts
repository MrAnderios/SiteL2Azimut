import type { ForumActiveMember, ForumCategoryPage, ForumCategorySlug, ForumFormat, ForumIndex, ForumMe, ForumMember, ForumOwnPosts, ForumPost, ForumSearchPage, ForumTopicPage } from '#shared/forum'
import { forumCategories, forumCategory, forumLimits, forumNamePattern } from '#shared/forum'
import type { Master } from './auth'

const formatMarkdown: ForumFormat = 'markdown'

function forumFormat(value: string): ForumFormat {
  return value === 'markdown' ? 'markdown' : 'plain'
}

export function normalizeForumName(raw: string): string {
  return raw.normalize('NFC').replace(/\s+/g, ' ').trim()
}

export function normalizeTitle(raw: string): string {
  return raw.normalize('NFC').replace(/\s+/g, ' ').trim()
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

function pageOf(value: unknown): number {
  const n = int(value)
  if (!Number.isFinite(n) || n < 1) return 1
  return Math.min(n, 10_000)
}

export function forumPage(event: Parameters<typeof getQuery>[0]): number {
  return pageOf(getQuery(event).page)
}

function pagesOf(total: number): number {
  return Math.max(1, Math.ceil(total / forumLimits.pageSize))
}

async function profileName(masterId: number): Promise<string | undefined> {
  const found = await row<{ name: string }>(cmsDb(), 'SELECT name FROM forum_profiles WHERE master_id = ?', [masterId])
  return found?.name
}

/** Имя для записи. Нет профиля — 400, писать нельзя. */
export async function requireForumName(masterId: number): Promise<string> {
  const name = await profileName(masterId)
  if (!name) fail(400, 'forum_name_required')
  return name
}

export async function forumMe(event: Parameters<typeof getSessionUser>[0]): Promise<ForumMe> {
  const user = await getSessionUser(event)
  if (!user) return { name: null, isAdmin: false, authenticated: false }
  return { name: (await profileName(user.id)) ?? null, isAdmin: user.isAdmin, authenticated: true }
}

/** Сообщения игрока, новые сверху. Скрытые видит только администратор, как в теме. */
export async function forumOwnPosts(masterId: number, page: number, staff: boolean): Promise<ForumOwnPosts> {
  const name = await profileName(masterId)
  if (!name) return { name: null, page: 1, pages: 1, total: 0, posts: [] }

  const seeHidden = staff ? 1 : 0
  const db = cmsDb()
  const totalRow = await row<{ n: number }>(db,
    'SELECT COUNT(*) AS n FROM forum_posts WHERE author_id = ? AND (hidden = 0 OR ? = 1)',
    [masterId, seeHidden])
  const total = Number(totalRow?.n ?? 0)
  const pages = pagesOf(total)
  const current = Math.min(page, pages)
  const posts = await rows<{
    id: number
    topicId: number
    topicTitle: string
    slug: string
    body: string
    format: string
    createdAt: number
    editedAt: number
    hidden: number
    ordinal: number
  }>(db, `
    SELECT p.id, p.topic_id AS topicId, t.title AS topicTitle, t.category AS slug,
           p.body, p.format, p.created_at AS createdAt, p.edited_at AS editedAt, p.hidden,
           (
             SELECT COUNT(*)
             FROM forum_posts earlier
             WHERE earlier.topic_id = p.topic_id
               AND earlier.id <= p.id
               AND (earlier.hidden = 0 OR ? = 1)
           ) AS ordinal
    FROM forum_posts p
    JOIN forum_topics t ON t.id = p.topic_id
    WHERE p.author_id = ? AND (p.hidden = 0 OR ? = 1)
    ORDER BY p.id DESC
    LIMIT ? OFFSET ?
  `, [seeHidden, masterId, seeHidden, forumLimits.pageSize, (current - 1) * forumLimits.pageSize])

  return {
    name,
    page: current,
    pages,
    total,
    posts: posts.flatMap((post) => {
      const slug = forumCategory(post.slug)?.slug
      if (!slug) return []
      return [{
        id: Number(post.id),
        topicId: Number(post.topicId),
        topicTitle: post.topicTitle,
        slug,
        body: post.body,
        format: forumFormat(post.format),
        createdAt: Number(post.createdAt),
        editedAt: Number(post.editedAt),
        hidden: post.hidden === 1,
        page: Math.max(1, Math.ceil(Number(post.ordinal) / forumLimits.pageSize)),
      }]
    }),
  }
}

function isBadString(e: unknown): boolean {
  const err = e as { errno?: number, code?: string }
  return err.errno === 1366 || err.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD'
}

export async function createForumProfile(masterId: number, name: string): Promise<void> {
  try {
    await exec(cmsDb(), 'INSERT INTO forum_profiles (master_id, name, created_at) VALUES (?, ?, ?)', [masterId, name, now()])
  }
  catch (e) {
    if (isBadString(e)) fail(400, 'invalid_forum_name', { min: forumLimits.nameMin, max: forumLimits.nameMax })
    if (!isDuplicateKey(e)) throw e
    if (await profileName(masterId)) fail(409, 'forum_name_locked')
    fail(409, 'forum_name_taken')
  }
}

export async function renameForumProfile(masterId: number, name: string): Promise<void> {
  if (!await profileName(masterId)) fail(404, 'master_not_found')
  try {
    await exec(cmsDb(), 'UPDATE forum_profiles SET name = ? WHERE master_id = ?', [name, masterId])
  }
  catch (e) {
    if (isBadString(e)) fail(400, 'invalid_forum_name', { min: forumLimits.nameMin, max: forumLimits.nameMax })
    if (isDuplicateKey(e)) fail(409, 'forum_name_taken')
    throw e
  }
}

const lastAuthorSql = `
  (
    SELECT la.name
    FROM forum_posts fp
    JOIN forum_profiles la ON la.master_id = fp.author_id
    WHERE fp.topic_id = t.id AND fp.hidden = 0
    ORDER BY fp.id DESC
    LIMIT 1
  )`

export async function forumIndex(): Promise<ForumIndex> {
  const db = cmsDb()
  const [counts, latest, members, activeRow] = await Promise.all([
    rows<{ category: string, topics: number, posts: number, lastPostAt: number }>(db, `
      SELECT category,
             COUNT(*) AS topics,
             COALESCE(SUM(replies), 0) + COUNT(*) AS posts,
             COALESCE(MAX(last_post_at), 0) AS lastPostAt
      FROM forum_topics
      GROUP BY category
    `),
    rows<{ category: string, id: number, title: string, author: string }>(db, `
    SELECT t.category, t.id, t.title, p.name AS author
    FROM forum_topics t
    JOIN forum_profiles p ON p.master_id = t.author_id
    JOIN (
      SELECT category, MAX(last_post_at) AS last_post_at
      FROM forum_topics
      GROUP BY category
    ) last ON last.category = t.category AND last.last_post_at = t.last_post_at
    ORDER BY t.id DESC
    `),
    rows<{ name: string, joinedAt: number }>(db, `
      SELECT name, created_at AS joinedAt
      FROM forum_profiles
      ORDER BY name
    `),
    row<{ name: string, posts: number }>(db, `
      SELECT a.name, COUNT(*) AS posts
      FROM forum_posts p
      JOIN forum_profiles a ON a.master_id = p.author_id
      WHERE p.hidden = 0
      GROUP BY p.author_id, a.name
      ORDER BY posts DESC, MAX(p.created_at) DESC
      LIMIT 1
    `),
  ])
  const bySlug = new Map(counts.map(c => [c.category, c]))
  const lastBySlug = new Map<string, { id: number, title: string, author: string }>()
  for (const item of latest) {
    if (!lastBySlug.has(item.category)) {
      lastBySlug.set(item.category, { id: Number(item.id), title: item.title, author: item.author })
    }
  }
  const categories = forumCategories.map((c) => {
    const count = bySlug.get(c.slug)
    return {
      slug: c.slug,
      topics: Number(count?.topics ?? 0),
      posts: Number(count?.posts ?? 0),
      lastPostAt: Number(count?.lastPostAt ?? 0),
      lastTopic: lastBySlug.get(c.slug) ?? null,
    }
  })
  let newest: ForumMember | null = null
  for (const member of members) {
    const joinedAt = Number(member.joinedAt)
    if (!newest || joinedAt > newest.joinedAt) newest = { name: member.name, joinedAt }
  }
  const active: ForumActiveMember | null = activeRow
    ? { name: activeRow.name, posts: Number(activeRow.posts) }
    : null
  return {
    categories,
    stats: {
      topics: categories.reduce((sum, c) => sum + c.topics, 0),
      posts: categories.reduce((sum, c) => sum + c.posts, 0),
      members: members.length,
      newest,
      active,
      names: members.map(m => m.name),
    },
  }
}

export async function forumTopics(slug: string, page: number): Promise<ForumCategoryPage> {
  const category = forumCategory(slug)
  if (!category) fail(404, 'unknown_category')
  const totalRow = await row<{ n: number }>(cmsDb(), 'SELECT COUNT(*) AS n FROM forum_topics WHERE category = ?', [slug])
  const total = Number(totalRow?.n ?? 0)
  const pages = pagesOf(total)
  const current = Math.min(page, pages)
  const topics = await rows<{
    id: number
    title: string
    author: string
    lastAuthor: string | null
    pinned: number
    closed: number
    replies: number
    createdAt: number
    lastPostAt: number
  }>(cmsDb(), `
    SELECT t.id, t.title, p.name AS author, ${lastAuthorSql} AS lastAuthor,
           t.pinned, t.closed, t.replies, t.created_at AS createdAt, t.last_post_at AS lastPostAt
    FROM forum_topics t
    JOIN forum_profiles p ON p.master_id = t.author_id
    WHERE t.category = ?
    ORDER BY t.pinned DESC, t.last_post_at DESC, t.id DESC
    LIMIT ? OFFSET ?
  `, [slug, forumLimits.pageSize, (current - 1) * forumLimits.pageSize])

  return {
    slug: category.slug,
    page: current,
    pages,
    topics: topics.map(topicRow),
  }
}

function likeTerm(raw: string): string {
  return `%${raw.replace(/[\\%_]/g, ch => `\\${ch}`)}%`
}

export async function forumSearch(q: string, categorySlug: string): Promise<ForumSearchPage> {
  const query = q.trim().slice(0, forumLimits.searchMax)
  if (categorySlug && !forumCategory(categorySlug)) fail(404, 'unknown_category')
  if (query.length < forumLimits.searchMin) return { query, topics: [] }

  const topics = await rows<{
    id: number
    slug: string
    title: string
    author: string
    lastAuthor: string | null
    pinned: number
    closed: number
    replies: number
    createdAt: number
    lastPostAt: number
  }>(cmsDb(), `
    SELECT t.id, t.category AS slug, t.title, a.name AS author, ${lastAuthorSql} AS lastAuthor,
           t.pinned, t.closed, t.replies, t.created_at AS createdAt, t.last_post_at AS lastPostAt
    FROM forum_topics t
    JOIN forum_profiles a ON a.master_id = t.author_id
    WHERE t.title LIKE ? ESCAPE '\\\\'
      AND (? = '' OR t.category = ?)
    ORDER BY t.last_post_at DESC, t.id DESC
    LIMIT ?
  `, [likeTerm(query), categorySlug, categorySlug, forumLimits.searchLimit])

  return {
    query,
    topics: topics.flatMap((topic) => {
      const category = forumCategory(topic.slug)
      if (!category) return []
      return [{ ...topicRow(topic), slug: category.slug }]
    }),
  }
}

function topicRow(topic: {
  id: number
  title: string
  author: string
  lastAuthor: string | null
  pinned: number
  closed: number
  replies: number
  createdAt: number
  lastPostAt: number
}) {
  return {
    id: Number(topic.id),
    title: topic.title,
    author: topic.author,
    lastAuthor: topic.lastAuthor || topic.author,
    pinned: topic.pinned === 1,
    closed: topic.closed === 1,
    replies: Number(topic.replies),
    createdAt: Number(topic.createdAt),
    lastPostAt: Number(topic.lastPostAt),
  }
}

interface TopicRow {
  id: number
  category: string
  authorId: number
  title: string
  pinned: number
  closed: number
  createdAt: number
  posts: number
}

export async function forumTopic(id: number, page: number, viewer: { id: number, isAdmin: boolean } | null): Promise<ForumTopicPage> {
  const topic = await row<TopicRow>(cmsDb(), `
    SELECT id, category, author_id AS authorId, title, pinned, closed, created_at AS createdAt,
           (SELECT COUNT(*) FROM forum_posts WHERE topic_id = forum_topics.id AND hidden = 0) AS posts
    FROM forum_topics WHERE id = ?
  `, [id])
  const category = topic && forumCategory(topic.category)
  if (!topic || !category) fail(404, 'topic_not_found')

  const seeHidden = viewer?.isAdmin ? 1 : 0
  const totalRow = await row<{ n: number }>(cmsDb(),
    'SELECT COUNT(*) AS n FROM forum_posts WHERE topic_id = ? AND (hidden = 0 OR ? = 1)', [id, seeHidden])
  const total = Number(totalRow?.n ?? 0)
  const pages = pagesOf(total)
  const current = Math.min(page, pages)
  const posts = await rows<{
    id: number
    authorId: number
    author: string
    body: string
    format: ForumFormat
    createdAt: number
    editedAt: number
    hidden: number
  }>(cmsDb(), `
    SELECT p.id, p.author_id AS authorId, a.name AS author, p.body, p.format,
           p.created_at AS createdAt, p.edited_at AS editedAt, p.hidden
    FROM forum_posts p
    JOIN forum_profiles a ON a.master_id = p.author_id
    WHERE p.topic_id = ? AND (p.hidden = 0 OR ? = 1)
    ORDER BY p.id
    LIMIT ? OFFSET ?
  `, [id, seeHidden, forumLimits.pageSize, (current - 1) * forumLimits.pageSize])

  return {
    id: topic.id,
    slug: category.slug,
    title: topic.title,
    pinned: topic.pinned === 1,
    closed: topic.closed === 1,
    createdAt: Number(topic.createdAt),
    own: viewer?.id === topic.authorId,
    empty: Number(topic.posts) === 0,
    page: current,
    pages,
    posts: posts.map((p): ForumPost => ({
      id: p.id,
      author: p.author,
      authorId: viewer?.isAdmin ? p.authorId : null,
      body: p.body,
      format: forumFormat(p.format),
      createdAt: Number(p.createdAt),
      editedAt: Number(p.editedAt),
      hidden: p.hidden === 1,
      own: viewer?.id === p.authorId,
    })),
  }
}

async function refreshTopic(topicId: number): Promise<void> {
  await exec(cmsDb(), `
    UPDATE forum_topics t
    LEFT JOIN (
      SELECT COUNT(*) AS cnt, MAX(created_at) AS last_at
      FROM forum_posts
      WHERE topic_id = ? AND hidden = 0
    ) p ON 1 = 1
    SET t.replies = GREATEST(COALESCE(p.cnt, 0) - 1, 0),
        t.last_post_at = COALESCE(p.last_at, t.created_at)
    WHERE t.id = ?
  `, [topicId, topicId])
}

export async function createTopic(master: Master, category: ForumCategorySlug, title: string, body: string): Promise<number> {
  const created = now()
  try {
    return await transaction(cmsDb(), async (conn) => {
      const topic = await exec(conn, `
        INSERT INTO forum_topics (category, author_id, title, pinned, closed, replies, created_at, last_post_at)
        VALUES (?, ?, ?, 0, 0, 0, ?, ?)
      `, [category, master.id, title, created, created])
      await exec(conn, `
        INSERT INTO forum_posts (topic_id, author_id, body, format, hidden, created_at, edited_at)
        VALUES (?, ?, ?, ?, 0, ?, 0)
      `, [topic.insertId, master.id, body, formatMarkdown, created])
      return topic.insertId
    })
  }
  catch (e) {
    if (isBadString(e)) fail(400, 'invalid_post', { max: forumLimits.bodyMax })
    throw e
  }
}

/** Номер страницы, на которой оказалось новое сообщение. */
export async function createPost(master: Master, topicId: number, body: string, staff: boolean): Promise<number> {
  try {
    await transaction(cmsDb(), async (conn) => {
      const topic = await row<{ closed: number, category: string }>(conn, 'SELECT closed, category FROM forum_topics WHERE id = ? FOR UPDATE', [topicId])
      if (!topic) fail(404, 'topic_not_found')
      const category = forumCategory(topic.category)
      if (!category) fail(404, 'topic_not_found')
      if (category.staffOnly && !staff) fail(403, 'forbidden')
      if (topic.closed === 1 && !staff) fail(403, 'topic_closed')
      await exec(conn, `
        INSERT INTO forum_posts (topic_id, author_id, body, format, hidden, created_at, edited_at)
        VALUES (?, ?, ?, ?, 0, ?, 0)
      `, [topicId, master.id, body, formatMarkdown, now()])
    })
  }
  catch (e) {
    if (isBadString(e)) fail(400, 'invalid_post', { max: forumLimits.bodyMax })
    throw e
  }
  await refreshTopic(topicId)
  const seeHidden = staff ? 1 : 0
  const totalRow = await row<{ n: number }>(cmsDb(),
    'SELECT COUNT(*) AS n FROM forum_posts WHERE topic_id = ? AND (hidden = 0 OR ? = 1)', [topicId, seeHidden])
  return pagesOf(Number(totalRow?.n ?? 1))
}

interface PostRow {
  id: number
  topicId: number
  authorId: number
  hidden: number
}

export async function updatePost(master: Master, postId: number, patch: { body?: string, hidden?: boolean }, staff: boolean): Promise<void> {
  const post = await row<PostRow>(cmsDb(),
    'SELECT id, topic_id AS topicId, author_id AS authorId, hidden FROM forum_posts WHERE id = ?', [postId])
  if (!post) fail(404, 'post_not_found')
  const own = post.authorId === master.id
  if (patch.body !== undefined) {
    if (!own) fail(403, 'forbidden')
    if (post.hidden === 1 && !staff) fail(403, 'forbidden')
    try {
      await exec(cmsDb(), 'UPDATE forum_posts SET body = ?, format = ?, edited_at = ? WHERE id = ?', [patch.body, formatMarkdown, now(), postId])
    }
    catch (e) {
      if (isBadString(e)) fail(400, 'invalid_post', { max: forumLimits.bodyMax })
      throw e
    }
  }
  if (patch.hidden !== undefined) {
    const hide = patch.hidden
    if (hide && !own && !staff) fail(403, 'forbidden')
    if (!hide && !staff) fail(403, 'forbidden')
    if (hide && !staff) {
      const later = await row<{ id: number }>(cmsDb(), `
        SELECT id FROM forum_posts
        WHERE topic_id = ? AND id > ? AND hidden = 0
        LIMIT 1
      `, [post.topicId, post.id])
      if (later) fail(403, 'not_last_post')
    }
    await exec(cmsDb(), 'UPDATE forum_posts SET hidden = ? WHERE id = ?', [hide ? 1 : 0, postId])
    await refreshTopic(post.topicId)
  }
}

async function setTopicFlag(topicId: number, column: 'pinned' | 'closed', value: boolean): Promise<void> {
  const topic = await row<{ id: number }>(cmsDb(), 'SELECT id FROM forum_topics WHERE id = ?', [topicId])
  if (!topic) fail(404, 'topic_not_found')
  await exec(cmsDb(), `UPDATE forum_topics SET ${column} = ? WHERE id = ?`, [value ? 1 : 0, topicId])
}

export function setTopicPinned(topicId: number, pinned: boolean): Promise<void> {
  return setTopicFlag(topicId, 'pinned', pinned)
}

export function setTopicClosed(topicId: number, closed: boolean): Promise<void> {
  return setTopicFlag(topicId, 'closed', closed)
}

/** Удаляет тему без видимых сообщений. Автор — свою, администратор — любую. */
export async function deleteTopic(master: Master, topicId: number, staff: boolean): Promise<void> {
  await transaction(cmsDb(), async (conn) => {
    const topic = await row<{ authorId: number, category: string }>(conn, `
      SELECT author_id AS authorId, category FROM forum_topics WHERE id = ? FOR UPDATE
    `, [topicId])
    if (!topic || !forumCategory(topic.category)) fail(404, 'topic_not_found')
    if (!staff && topic.authorId !== master.id) fail(403, 'forbidden')
    const posts = await rows<{ hidden: number }>(conn, 'SELECT hidden FROM forum_posts WHERE topic_id = ? FOR UPDATE', [topicId])
    if (posts.some(post => post.hidden === 0)) fail(403, 'topic_not_empty')
    if (posts.length) await exec(conn, 'DELETE FROM forum_posts WHERE topic_id = ?', [topicId])
    await exec(conn, 'DELETE FROM forum_topics WHERE id = ?', [topicId])
  })
}

const freshAccountSec = 24 * 60 * 60

/** Первые сутки после регистрации. Серия новых аккаунтов не должна заливать форум. */
export async function isFreshForumAccount(masterId: number): Promise<boolean> {
  const found = await row<{ createdAt: number }>(cmsDb(), 'SELECT created_at AS createdAt FROM master_accounts WHERE id = ?', [masterId])
  const createdAt = Number(found?.createdAt ?? 0)
  return createdAt > 0 && now() - createdAt < freshAccountSec
}
