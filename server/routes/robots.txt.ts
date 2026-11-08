// robots.txt с абсолютной ссылкой на sitemap (адрес сайта берётся из NUXT_PUBLIC_I18N_BASE_URL)
// Личный кабинет, админка и API закрыты от индексации.
const privatePaths = ['/api/', '/cabinet', '/admin', '/login', '/register']

export default defineEventHandler((event) => {
  const baseUrl = useRuntimeConfig(event).public.i18n.baseUrl as string
  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  return [
    'User-agent: *',
    'Allow: /',
    ...privatePaths.flatMap(p => p.startsWith('/api') ? [`Disallow: ${p}`] : [`Disallow: ${p}`, `Disallow: /en${p}`]),
    '',
    `Sitemap: ${baseUrl}/sitemap.xml`,
    '',
  ].join('\n')
})
