// Редактирование ответа (автор или админ).
export default defineEventHandler(async (event) => {
  const master = await requireMaster(event)
  const id = int(getRouterParam(event, 'id'))
  if (Number.isNaN(id)) fail(404, 'post_not_found')
  const body = await readJson(event)
  const text = str(body.body).trim()
  validateBody(text)
  const db = cmsDb()

  try {
    const post = await getPost(db, id)
    if (!post) fail(404, 'post_not_found')
    if (post.authorId !== master.id && !isAdminLogin(master.login)) fail(403, 'forbidden')
    await exec(db, 'UPDATE forum_posts SET body = ?, updated_at = ? WHERE id = ?', [text, now(), id])
    return { id }
  }
  catch (e) {
    forumFail(e)
  }
})