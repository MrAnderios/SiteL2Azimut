// Удаление ответа (автор или админ). Пересчитывает счётчик ответов темы.
export default defineEventHandler(async (event) => {
  const master = await requireMaster(event)
  const id = int(getRouterParam(event, 'id'))
  if (Number.isNaN(id)) fail(404, 'post_not_found')
  const db = cmsDb()

  try {
    const post = await getPost(db, id)
    if (!post) fail(404, 'post_not_found')
    if (post.authorId !== master.id && !isAdminLogin(master.login)) fail(403, 'forbidden')
    await exec(db, 'DELETE FROM forum_posts WHERE id = ?', [id])
    await recomputeTopic(db, post.topicId)
    return { id, topicId: post.topicId }
  }
  catch (e) {
    forumFail(e)
  }
})