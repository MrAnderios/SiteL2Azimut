// Редактирование раздела форума (только админ).
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = int(getRouterParam(event, 'id'))
  if (Number.isNaN(id)) fail(404, 'section_not_found')
  const body = await readJson(event)
  const name = str(body.name).trim()
  const description = str(body.description).trim()
  const sortRaw = int(body.sort)
  const sort = Number.isNaN(sortRaw) ? 0 : sortRaw
  validateSection(name, description)

  const db = cmsDb()
  try {
    if (!await getSection(db, id)) fail(404, 'section_not_found')
    await exec(db, 'UPDATE forum_sections SET name = ?, description = ?, sort = ? WHERE id = ?', [name, description, sort, id])
    return { id }
  }
  catch (e) {
    forumFail(e)
  }
})