// Заголовки, которые применяет сам браузер.
// frame-ancestors не даёт встроить сайт в чужой iframe.
// script-src-attr 'none' не запускает onerror и прочие обработчики, если они попадут в HTML поста.
export default defineEventHandler((event) => {
  setResponseHeaders(event, {
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'permissions-policy': 'camera=(), microphone=(), geolocation=()',
    'content-security-policy': contentSecurityPolicy(event),
  })
})

function contentSecurityPolicy(event: Parameters<typeof useRuntimeConfig>[0]): string {
  const stats = httpOrigin(useRuntimeConfig(event).public.statsApiBase)
  const connect = ["'self'", 'https://fonts.googleapis.com', 'https://fonts.gstatic.com']
  if (stats) connect.push(stats)
  const script = ["'self'", "'unsafe-inline'"]
  // Плееры из app/utils/streams.ts. 'self' — оверлей Nuxt в разработке.
  const frame = [
    "'self'",
    'https://player.kick.com',
    'https://player.twitch.tv',
    'https://www.youtube.com',
    'https://vkvideo.ru',
    'https://rutube.ru',
  ]
  if (import.meta.dev) {
    script.push("'unsafe-eval'")
    connect.push('ws:', 'http://localhost:*', 'http://127.0.0.1:*', 'ws://localhost:*', 'ws://127.0.0.1:*')
  }
  const directives = [
    "default-src 'self'",
    `script-src ${script.join(' ')}`,
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https: http:",
    `connect-src ${connect.join(' ')}`,
    `frame-src ${frame.join(' ')}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "manifest-src 'self'",
  ]
  if (!import.meta.dev) directives.push('upgrade-insecure-requests')
  return directives.join('; ')
}

function httpOrigin(value: unknown): string | null {
  if (typeof value !== 'string' || !value) return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    return url.origin
  }
  catch {
    return null
  }
}
