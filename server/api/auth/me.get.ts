// Текущий пользователь (из cookie сессии) или null
export default defineEventHandler(async event => ({ user: await getSessionUser(event) }))
