// robots.txt с абсолютной ссылкой на sitemap (адрес сайта берётся из NUXT_PUBLIC_I18N_BASE_URL)
export default defineEventHandler((event) => {
  const baseUrl = useRuntimeConfig(event).public.i18n.baseUrl as string
  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  return [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${baseUrl}/sitemap.xml`,
    '',
  ].join('\n')
})
