import type { ForumReaction, ForumReactionKind } from '#shared/forum'
import { emptyForumReactions, forumReactionKind } from '#shared/forum'
import type { Master } from '../auth'

/** Реакции сообщений страницы. Имена — в порядке постановки. */
export async function forumPostReactions(postIds: number[], viewerId: number | null): Promise<Map<number, ForumReaction[]>> {
  const map = new Map<number, ForumReaction[]>()
  for (const id of postIds) map.set(id, emptyForumReactions())
  if (!postIds.length) return map

  const marks = postIds.map(() => '?').join(', ')
  const found = await rows<{ postId: number, kind: string, masterId: number, name: string }>(cmsDb(), `
    SELECT r.post_id AS postId, r.kind, r.master_id AS masterId, a.name
    FROM forum_reactions r
    JOIN forum_profiles a ON a.master_id = r.master_id
    WHERE r.post_id IN (${marks})
    ORDER BY r.created_at, r.master_id
  `, postIds)

  for (const item of found) {
    const kind = forumReactionKind(item.kind)
    const reaction = map.get(Number(item.postId))?.find(entry => entry.kind === kind)
    if (!reaction) continue
    reaction.count += 1
    reaction.names.push(item.name)
    if (viewerId !== null && Number(item.masterId) === viewerId) reaction.mine = true
  }
  return map
}

export async function clearPostReactions(db: Parameters<typeof exec>[0], postId: number): Promise<void> {
  await exec(db, 'DELETE FROM forum_reactions WHERE post_id = ?', [postId])
}

export async function clearTopicReactions(db: Parameters<typeof exec>[0], topicId: number): Promise<void> {
  await exec(db, `
    DELETE FROM forum_reactions
    WHERE post_id IN (SELECT id FROM forum_posts WHERE topic_id = ?)
  `, [topicId])
}

/** Ставит реакцию или снимает свою, если она уже стоит. На своё и на скрытое сообщение нельзя. */
export async function togglePostReaction(master: Master, postId: number, kind: ForumReactionKind): Promise<void> {
  await requireForumName(master.id)
  await assertForumWriter(master.id)
  await transaction(cmsDb(), async (conn) => {
    const post = await row<{ authorId: number, hidden: number }>(conn,
      'SELECT author_id AS authorId, hidden FROM forum_posts WHERE id = ? FOR UPDATE', [postId])
    if (!post || post.hidden === 1) fail(404, 'post_not_found')
    if (post.authorId === master.id) fail(403, 'own_reaction')
    const existing = await row<{ kind: string }>(conn,
      'SELECT kind FROM forum_reactions WHERE post_id = ? AND master_id = ? AND kind = ?',
      [postId, master.id, kind])
    if (existing) {
      await exec(conn, 'DELETE FROM forum_reactions WHERE post_id = ? AND master_id = ? AND kind = ?', [postId, master.id, kind])
      return
    }
    await exec(conn, `
      INSERT INTO forum_reactions (post_id, master_id, kind, created_at)
      VALUES (?, ?, ?, ?)
    `, [postId, master.id, kind, now()])
  })
}
