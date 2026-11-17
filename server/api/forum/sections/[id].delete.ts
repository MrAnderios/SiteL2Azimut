// Удаление раздела форума (только админ). Раздел должен быть пуст — темы удаляются отдельно.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = int(getRouterParam(event, 'id'))
  if (Number.isNaN(id)) fail(404, 'section_not_found')
  const db = cmsDb()

  try {
    if (!await getSection(db, id)) fail(404, 'section_not_found')
    if (await countTopics(db, id) > 0) fail(409, 'section_not_empty')
    await exec(db, 'DELETE FROM forum_sections WHERE id = ?', [id])
    return { id }
  }
  catch (e) {
    forumFail(e)
  }
})