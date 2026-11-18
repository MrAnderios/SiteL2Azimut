// Предупреждение при старте, если кабинет не настроен. Сайт не роняем: лендинг должен работать и без БД.
export default defineNitroPlugin(() => {
  if (import.meta.dev) return
  const { sessionPassword, db } = useRuntimeConfig()
  const missing = [
    (!sessionPassword || sessionPassword.length < 32) && 'NUXT_SESSION_PASSWORD (≥ 32 символов)',
    !db.host && 'NUXT_DB_HOST',
    !db.user && 'NUXT_DB_USER',
  ].filter(Boolean)
  if (missing.length) {
    console.error(`[cabinet] Личный кабинет не настроен, не заданы: ${missing.join(', ')}. См. .env.example и docs/DEPLOY.md`)
  }
})
