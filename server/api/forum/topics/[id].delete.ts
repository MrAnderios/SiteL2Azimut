// Удаление темы вместе с ответами (автор или админ).
export default defineEventHandler(async (event) => {
  const master = await requireMaster(event)
  const id = int(getRouterParam(event, 'id'))
  if (Number.isNaN(id)) fail(404, 'topic_not_found')
  const db = cmsDb()

  try {
    const topic = await getTopic(db, id)
    if (!topic) fail(404, 'topic_not_found')
    if (topic.authorId !== master.id && !isAdminLogin(master.login)) fail(403, 'forbidden')
    await exec(db, 'DELETE FROM forum_posts WHERE topic_id = ?', [id])
    await exec(db, 'DELETE FROM forum_topics WHERE id = ?', [id])
    return { id, sectionId: topic.sectionId }
  }
  catch (e) {
    forumFail(e)
  }
})