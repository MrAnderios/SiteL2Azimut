// Защита от CSRF для API: изменяющие запросы принимаем только со своего сайта.
// Вместе с cookie сессии SameSite=Lax этого достаточно, отдельный CSRF-токен не нужен.
export default defineEventHandler((event) => {
  if (!event.path.startsWith('/api/')) return
  const method = event.method
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return

  // Callback платёжного шлюза приходит с чужого домена: подлинность проверяется
  // HMAC-подписью в server/api/payments/callback.post.ts
  if (event.path.startsWith('/api/payments/callback')) return

  const fetchSite = getRequestHeader(event, 'sec-fetch-site')
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') fail(403, 'bad_origin')

  const origin = getRequestHeader(event, 'origin')
  if (origin) {
    let originHost = ''
    try {
      originHost = new URL(origin).host
    }
    catch {}
    if (originHost !== getRequestHost(event, { xForwardedHost: true })) fail(403, 'bad_origin')
  }
})
