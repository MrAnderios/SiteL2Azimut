// Создание раздела форума (только админ).
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readJson(event)
  const name = str(body.name).trim()
  const description = str(body.description).trim()
  const sortRaw = int(body.sort)
  const sort = Number.isNaN(sortRaw) ? 0 : sortRaw
  validateSection(name, description)

  try {
    const res = await exec(cmsDb(),
      'INSERT INTO forum_sections (name, description, sort, created_at) VALUES (?, ?, ?, ?)',
      [name, description, sort, now()])
    return { id: Number(res.insertId) }
  }
  catch (e) {
    forumFail(e)
  }
})