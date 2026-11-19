import type { ForumCategorySlug, ForumFormat } from '#shared/forum'
import { forumCategory } from '#shared/forum'
import type { Master } from '../auth'

const formatMarkdown: ForumFormat = 'markdown'

async function refreshTopic(db: Parameters<typeof exec>[0], topicId: number): Promise<void> {
  await exec(db, `
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
  await assertForumWriter(master.id)
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
    failIfBadForumText(e, 'invalid_post')
    throw e
  }
}

/** Номер страницы, на которой оказалось новое сообщение. */
export async function createPost(master: Master, topicId: number, body: string, staff: boolean): Promise<number> {
  await assertForumWriter(master.id)
  try {
    return await transaction(cmsDb(), async (conn) => {
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
      await refreshTopic(conn, topicId)
      const seeHidden = staff ? 1 : 0
      const totalRow = await row<{ n: number }>(conn,
        'SELECT COUNT(*) AS n FROM forum_posts WHERE topic_id = ? AND (hidden = 0 OR ? = 1)', [topicId, seeHidden])
      return forumPageCount(Number(totalRow?.n ?? 1))
    })
  }
  catch (e) {
    failIfBadForumText(e, 'invalid_post')
    throw e
  }
}

interface PostRow {
  id: number
  topicId: number
  authorId: number
  hidden: number
}

export async function updatePost(master: Master, postId: number, patch: { body?: string, hidden?: boolean }, staff: boolean): Promise<void> {
  try {
    await transaction(cmsDb(), async (conn) => {
      const post = await row<PostRow>(conn,
        'SELECT id, topic_id AS topicId, author_id AS authorId, hidden FROM forum_posts WHERE id = ? FOR UPDATE', [postId])
      if (!post) fail(404, 'post_not_found')
      const own = post.authorId === master.id
      if (patch.body !== undefined) {
        if (!own) fail(403, 'forbidden')
        if (!staff) await assertForumWriter(master.id)
        if (post.hidden === 1 && !staff) fail(403, 'forbidden')
        await exec(conn, 'UPDATE forum_posts SET body = ?, format = ?, edited_at = ? WHERE id = ?', [patch.body, formatMarkdown, now(), postId])
      }
      if (patch.hidden !== undefined) {
        // Скрытие больше не пишем: кнопка удаляет строку. Вернуть можно только уже скрытое.
        if (patch.hidden) fail(400, 'invalid_post')
        if (!staff) fail(403, 'forbidden')
        if (post.hidden === 1) {
          await exec(conn, 'UPDATE forum_posts SET hidden = 0 WHERE id = ?', [postId])
          await refreshTopic(conn, post.topicId)
        }
      }
    })
  }
  catch (e) {
    failIfBadForumText(e, 'invalid_post')
    throw e
  }
}

/** Стирает сообщение и его реакции. Автор — только своё последнее видимое, администратор — любое. */
export async function deletePost(master: Master, postId: number, staff: boolean): Promise<{ topicDeleted: boolean, slug: string }> {
  return await transaction(cmsDb(), async (conn) => {
    const post = await row<PostRow>(conn,
      'SELECT id, topic_id AS topicId, author_id AS authorId, hidden FROM forum_posts WHERE id = ? FOR UPDATE', [postId])
    if (!post) fail(404, 'post_not_found')
    if (!staff) await assertForumWriter(master.id)
    if (post.authorId !== master.id && !staff) fail(403, 'forbidden')
    if (post.hidden === 1 && !staff) fail(403, 'forbidden')
    const topic = await row<{ category: string }>(conn,
      'SELECT category FROM forum_topics WHERE id = ? FOR UPDATE', [post.topicId])
    const category = topic && forumCategory(topic.category)
    if (!topic || !category) fail(404, 'topic_not_found')
    if (!staff) {
      const later = await row<{ id: number }>(conn, `
        SELECT id FROM forum_posts
        WHERE topic_id = ? AND id > ? AND hidden = 0
        LIMIT 1
      `, [post.topicId, post.id])
      if (later) fail(403, 'not_last_post')
    }
    await clearPostReactions(conn, postId)
    await exec(conn, 'DELETE FROM forum_posts WHERE id = ?', [postId])
    const left = await row<{ n: number }>(conn, 'SELECT COUNT(*) AS n FROM forum_posts WHERE topic_id = ?', [post.topicId])
    if (Number(left?.n ?? 0) === 0) {
      await exec(conn, 'DELETE FROM forum_topics WHERE id = ?', [post.topicId])
      return { topicDeleted: true, slug: category.slug }
    }
    await refreshTopic(conn, post.topicId)
    return { topicDeleted: false, slug: category.slug }
  })
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
    if (posts.length) {
      await clearTopicReactions(conn, topicId)
      await exec(conn, 'DELETE FROM forum_posts WHERE topic_id = ?', [topicId])
    }
    await exec(conn, 'DELETE FROM forum_topics WHERE id = ?', [topicId])
  })
}
