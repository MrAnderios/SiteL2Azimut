// Карта сайта: главная на каждом языке со ссылками hreflang друг на друга.
// При добавлении страниц или языков допишите их в pages / locales.
const locales = [
  { code: 'ru', hreflang: 'ru-RU', prefix: '' },
  { code: 'en', hreflang: 'en-US', prefix: '/en' },
]
const pages = ['/']

export default defineEventHandler((event) => {
  const baseUrl = useRuntimeConfig(event).public.i18n.baseUrl as string
  const url = (prefix: string, page: string) => `${baseUrl}${prefix}${page === '/' && prefix ? '' : page}`

  const entries = pages.flatMap(page => locales.map((locale) => {
    const alternates = [
      ...locales.map(l => `    <xhtml:link rel="alternate" hreflang="${l.hreflang}" href="${url(l.prefix, page)}"/>`),
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${url('', page)}"/>`,
    ]
    return [
      '  <url>',
      `    <loc>${url(locale.prefix, page)}</loc>`,
      ...alternates,
      '  </url>',
    ].join('\n')
  }))

  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...entries,
    '</urlset>',
    '',
  ].join('\n')
})
