// Редактирование темы: заголовок/текст — автор или админ; закрепление/закрытие — только админ.
export default defineEventHandler(async (event) => {
  const master = await requireMaster(event)
  const id = int(getRouterParam(event, 'id'))
  if (Number.isNaN(id)) fail(404, 'topic_not_found')
  const body = await readJson(event)
  const db = cmsDb()

  try {
    const topic = await getTopic(db, id)
    if (!topic) fail(404, 'topic_not_found')
    const isAdmin = isAdminLogin(master.login)
    if (topic.authorId !== master.id && !isAdmin) fail(403, 'forbidden')

    let title = topic.title
    let text = topic.body
    if (body.title !== undefined) {
      title = str(body.title).trim()
      validateTitle(title)
    }
    if (body.body !== undefined) {
      text = str(body.body).trim()
      validateBody(text)
    }

    let pinned = topic.isPinned
    let locked = topic.isLocked
    if (isAdmin) {
      if (body.isPinned !== undefined) pinned = !!body.isPinned
      if (body.isLocked !== undefined) locked = !!body.isLocked
    }

    await exec(db, 'UPDATE forum_topics SET title = ?, body = ?, is_pinned = ?, is_locked = ? WHERE id = ?',
      [title, text, pinned ? 1 : 0, locked ? 1 : 0, id])
    return { id }
  }
  catch (e) {
    forumFail(e)
  }
})