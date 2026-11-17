import xss, { type IFilterXSSOptions } from 'xss'

// Пакет отдаёт функцию и хелперы одним экспортом CommonJS. Именованные импорты из него в Node не видны.
const html = xss as typeof xss & {
  friendlyAttrValue: (value: string) => string
  escapeAttrValue: (value: string) => string
}

/** http(s) и mailto. javascript:, data: и ссылки без схемы не проходят. */
export function isForumUrl(url: string): boolean {
  const value = url.trim()
  if (!value || /[\s\u0000]/.test(value) || value.startsWith('//')) return false
  try {
    const parsed = new URL(value)
    if (parsed.username || parsed.password) return false
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' || parsed.protocol === 'mailto:'
  }
  catch {
    return false
  }
}

/** Адрес из поля ссылки: голый домен дополняется https://. */
export function normalizeForumUrl(raw: string): string | null {
  const value = raw.trim()
  if (!value) return null
  if (isForumUrl(value)) return value
  const withProtocol = `https://${value}`
  return isForumUrl(withProtocol) ? withProtocol : null
}

const linkRel = 'nofollow noopener noreferrer ugc'

// Вторая линия после своего markdown: в разметку попадают только теги редактора.
// Адрес ссылки и картинки проверяется ещё раз, обработчики и прочие атрибуты выкидываются.
const postHtmlOptions: IFilterXSSOptions = {
  whiteList: {
    a: ['href', 'rel', 'target'],
    b: [],
    blockquote: [],
    br: [],
    code: [],
    em: [],
    h1: [],
    h2: [],
    h3: [],
    h4: [],
    h5: [],
    h6: [],
    hr: [],
    i: [],
    img: ['src', 'alt', 'loading', 'referrerpolicy'],
    li: [],
    ol: [],
    p: [],
    pre: [],
    s: [],
    strong: [],
    u: [],
    ul: [],
  },
  stripIgnoreTag: true,
  css: false,
  onTagAttr(tag, name, value) {
    if (tag === 'a' && name === 'href') {
      const url = forumUrl(value)
      if (!url) return ''
      return attr('href', url)
    }
    if (tag === 'a' && name === 'rel') return attr('rel', linkRel)
    if (tag === 'a' && name === 'target') return attr('target', '_blank')
    if (tag === 'img' && name === 'src') {
      const url = forumUrl(value)
      if (!url || !url.startsWith('http')) return ''
      return attr('src', url)
    }
    if (tag === 'img' && name === 'alt') return attr('alt', html.friendlyAttrValue(value))
    if (tag === 'img' && name === 'loading') return attr('loading', 'lazy')
    if (tag === 'img' && name === 'referrerpolicy') return attr('referrerpolicy', 'no-referrer')
  },
}

function forumUrl(value: string): string | null {
  const decoded = html.friendlyAttrValue(value)
  return isForumUrl(decoded) ? decoded : null
}

function attr(name: string, value: string): string {
  return `${name}="${html.escapeAttrValue(value)}"`
}

export function sanitizePostHtml(source: string): string {
  return sealForumTags(xss(source, postHtmlOptions))
}

function sealForumTags(html: string): string {
  return html
    .replace(/<a\b([^>]*)>/gi, (_open, attrs: string) => {
      const href = readAttr(attrs, 'href')
      if (!href || !isForumUrl(decodeAttr(href))) return '<a>'
      return `<a href="${href}" rel="${linkRel}" target="_blank">`
    })
    .replace(/<img\b([^>]*?)\/?>/gi, (_open, attrs: string) => {
      const src = readAttr(attrs, 'src')
      const decoded = src ? decodeAttr(src) : ''
      if (!src || !isForumUrl(decoded) || !decoded.startsWith('http')) {
        const alt = readAttr(attrs, 'alt')
        return alt ? escapeText(decodeAttr(alt)) : ''
      }
      const alt = readAttr(attrs, 'alt') ?? ''
      return `<img src="${src}" alt="${alt}" loading="lazy" referrerpolicy="no-referrer">`
    })
}

function readAttr(attrs: string, name: string): string | null {
  const match = new RegExp(`(?:^|\\s)${name}\\s*=\\s*"([^"]*)"`, 'i').exec(attrs)
  return match?.[1] ?? null
}

function decodeAttr(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

function escapeText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
