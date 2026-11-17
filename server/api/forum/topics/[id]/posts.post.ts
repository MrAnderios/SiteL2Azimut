// Ответ в теме (вошедший мастер-аккаунт). В закрытой теме отвечать нельзя.
export default defineEventHandler(async (event) => {
  const master = await requireMaster(event)
  const topicId = int(getRouterParam(event, 'id'))
  if (Number.isNaN(topicId)) fail(404, 'topic_not_found')
  const body = await readJson(event)
  const text = str(body.body).trim()

  rateLimit(`forum-post:${master.id}`, 30, 60 * 60)
  validateBody(text)

  const db = cmsDb()
  try {
    const topic = await getTopic(db, topicId)
    if (!topic) fail(404, 'topic_not_found')
    if (topic.isLocked) fail(403, 'topic_locked')
    const res = await exec(db,
      'INSERT INTO forum_posts (topic_id, body, author_id, author_login, created_at) VALUES (?, ?, ?, ?, ?)',
      [topicId, text, master.id, master.login, now()])
    await recomputeTopic(db, topicId)
    return { id: Number(res.insertId) }
  }
  catch (e) {
    forumFail(e)
  }
})