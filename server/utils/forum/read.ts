import type { ForumActiveMember, ForumCategoryPage, ForumFormat, ForumIndex, ForumMember, ForumMemberPosts, ForumOwnPosts, ForumPost, ForumSearchPage, ForumTopicPage } from '#shared/forum'
import { emptyForumReactions, forumCategories, forumCategory, forumLimits, forumNamePattern } from '#shared/forum'

function forumFormat(value: string): ForumFormat {
  return value === 'markdown' ? 'markdown' : 'plain'
}

/** Имя автора последнего видимого сообщения. Имя меняют, поэтому на теме хранится только время. */
const lastAuthorSql = `
  (
    SELECT la.name
    FROM forum_posts fp
    JOIN forum_profiles la ON la.master_id = fp.author_id
    WHERE fp.topic_id = t.id AND fp.hidden = 0
    ORDER BY fp.id DESC
    LIMIT 1
  )`

/** Сообщения участника по имени. Чужое или кривое имя — как будто такого игрока нет. */
export async function forumMemberPosts(rawName: string, page: number, staff: boolean): Promise<ForumMemberPosts> {
  const name = normalizeForumName(rawName)
  if (
    name.length < forumLimits.nameMin
    || name.length > forumLimits.nameMax
    || !forumNamePattern.test(name)
  ) {
    fail(404, 'master_not_found')
  }
  const member = await forumProfileByName(name)
  if (!member) fail(404, 'master_not_found')
  return {
    ...await forumOwnPosts(member.id, page, staff),
    id: staff ? member.id : null,
    banned: staff && member.banned,
  }
}

/** Сообщения игрока, новые сверху. Скрытые видит только администратор, как в теме. */
export async function forumOwnPosts(masterId: number, page: number, staff: boolean): Promise<ForumOwnPosts> {
  const about = await forumProfileCard(masterId, staff)
  if (!about.name) return { ...about, page: 1, pages: 1, total: 0, posts: [] }

  const seeHidden = staff ? 1 : 0
  const db = cmsDb()
  const totalRow = await row<{ n: number }>(db,
    'SELECT COUNT(*) AS n FROM forum_posts WHERE author_id = ? AND (hidden = 0 OR ? = 1)',
    [masterId, seeHidden])
  const total = Number(totalRow?.n ?? 0)
  const list = forumPageWindow(total, page)
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
  `, [seeHidden, masterId, seeHidden, list.limit, list.offset])

  return {
    ...about,
    page: list.page,
    pages: list.pages,
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
  const list = forumPageWindow(total, page)
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
  `, [slug, list.limit, list.offset])

  return {
    slug: category.slug,
    page: list.page,
    pages: list.pages,
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
  total: number
  visible: number
}

export async function forumTopic(id: number, page: number, viewer: { id: number, isAdmin: boolean } | null): Promise<ForumTopicPage> {
  const seeHidden = viewer?.isAdmin ? 1 : 0
  const topic = await row<TopicRow>(cmsDb(), `
    SELECT id, category, author_id AS authorId, title, pinned, closed, created_at AS createdAt,
           (SELECT COUNT(*) FROM forum_posts WHERE topic_id = forum_topics.id AND (hidden = 0 OR ? = 1)) AS total,
           (SELECT COUNT(*) FROM forum_posts WHERE topic_id = forum_topics.id AND hidden = 0) AS visible
    FROM forum_topics WHERE id = ?
  `, [seeHidden, id])
  const category = topic && forumCategory(topic.category)
  if (!topic || !category) fail(404, 'topic_not_found')

  const total = Number(topic.total)
  const list = forumPageWindow(total, page)
  const posts = await rows<{
    id: number
    authorId: number
    author: string
    body: string
    format: ForumFormat
    createdAt: number
    editedAt: number
    hidden: number
    banned: number
  }>(cmsDb(), `
    SELECT p.id, p.author_id AS authorId, a.name AS author, p.body, p.format,
           p.created_at AS createdAt, p.edited_at AS editedAt, p.hidden, a.banned
    FROM forum_posts p
    JOIN forum_profiles a ON a.master_id = p.author_id
    WHERE p.topic_id = ? AND (p.hidden = 0 OR ? = 1)
    ORDER BY p.id
    LIMIT ? OFFSET ?
  `, [id, seeHidden, list.limit, list.offset])
  const reactions = await forumPostReactions(posts.map(p => p.id), viewer?.id ?? null)

  return {
    id: topic.id,
    slug: category.slug,
    title: topic.title,
    pinned: topic.pinned === 1,
    closed: topic.closed === 1,
    createdAt: Number(topic.createdAt),
    own: viewer?.id === topic.authorId,
    empty: Number(topic.visible) === 0,
    page: list.page,
    pages: list.pages,
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
      banned: !!viewer?.isAdmin && p.banned === 1,
      reactions: reactions.get(p.id) ?? emptyForumReactions(),
    })),
  }
}
