// Создание темы в разделе (вошедший мастер-аккаунт).
export default defineEventHandler(async (event) => {
  const master = await requireMaster(event)
  const body = await readJson(event)
  const sectionId = int(body.sectionId)
  const title = str(body.title).trim()
  const text = str(body.body).trim()

  rateLimit(`forum-topic:${master.id}`, 10, 60 * 60)
  if (Number.isNaN(sectionId)) fail(400, 'invalid_section')
  validateTitle(title)
  validateBody(text)

  const db = cmsDb()
  try {
    if (!await getSection(db, sectionId)) fail(404, 'section_not_found')
    const t = now()
    const res = await exec(db,
      `INSERT INTO forum_topics (section_id, title, body, author_id, author_login, created_at, last_post_at, last_post_login)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [sectionId, title, text, master.id, master.login, t, t, master.login])
    return { id: Number(res.insertId) }
  }
  catch (e) {
    forumFail(e)
  }
})