// Предупреждение при старте, если кабинет не настроен. Сайт не роняем: лендинг должен работать и без БД.
export default defineNitroPlugin(() => {
  if (import.meta.dev) return
  const { sessionPassword, db, payments } = useRuntimeConfig()
  const missing = [
    (!sessionPassword || sessionPassword.length < 32) && 'NUXT_SESSION_PASSWORD (≥ 32 символов)',
    !db.host && 'NUXT_DB_HOST',
    !db.user && 'NUXT_DB_USER',
  ].filter(Boolean)
  if (missing.length) {
    console.error(`[cabinet] Личный кабинет не настроен, не заданы: ${missing.join(', ')}. См. .env.example и docs/DEPLOY.md`)
  }

  // Шлюз настроен частично — счета будут создаваться с ручным подтверждением оператором
  if (payments.gatewayUrl || payments.merchantId || payments.secret) {
    const gatewayMissing = [
      !payments.gatewayUrl && 'NUXT_PAYMENTS_GATEWAY_URL',
      !payments.merchantId && 'NUXT_PAYMENTS_MERCHANT_ID',
      !payments.secret && 'NUXT_PAYMENTS_SECRET',
    ].filter(Boolean)
    if (gatewayMissing.length) {
      console.error(`[payments] Платёжный шлюз настроен частично, не заданы: ${gatewayMissing.join(', ')}. См. docs/PAYMENTS.md`)
    }
  }
  if (Number(payments.eripRubPerByn) <= 0) {
    console.error('[payments] NUXT_PAYMENTS_ERIP_RUB_PER_BYN должен быть больше 0, используется курс 28')
  }
})
