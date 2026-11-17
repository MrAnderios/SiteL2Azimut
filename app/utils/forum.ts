import type { ForumFormat } from '#shared/forum'
import { forumLimits } from '#shared/forum'
import MarkdownIt from 'markdown-it'
import { isForumUrl, sanitizePostHtml } from './forum-html'

export { isForumUrl, normalizeForumUrl } from './forum-html'

/** Текст сообщения для v-html. Свой рендер, затем allowlist: сырой HTML и опасные адреса не проходят. */
export function renderPost(body: string, format: ForumFormat): string {
  switch (format) {
    case 'plain':
      return sanitizePostHtml(renderPlain(body))
    case 'markdown':
      return sanitizePostHtml(renderMarkdown(body))
    default: {
      const unknown: never = format
      return unknown
    }
  }
}

export function normalizedForumBody(body: string): string {
  return (body || '').replace(/\r\n?/g, '\n').trim()
}

export function forumBodyReady(body: string): boolean {
  const text = normalizedForumBody(body)
  return text.length > 0 && text.length <= forumLimits.bodyMax
}

/** Цитата для редактора: имя и текст сообщения блоком markdown. */
export function forumQuote(author: string, body: string): string {
  const quoted = normalizedForumBody(body).split('\n').map(line => `> ${line}`).join('\n')
  return `**${author}:**\n${quoted}\n\n`
}

function renderPlain(body: string): string {
  return body
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br>')
}

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
  typographer: false,
})

markdown.validateLink = isForumUrl

// Редактор пишет подчёркивание как <u>…</u>. Другие теги по-прежнему экранируются.
markdown.inline.ruler.before('html_inline', 'underline_tag', (state, silent) => {
  const rest = state.src.slice(state.pos)
  const open = rest.startsWith('<u>')
  const close = rest.startsWith('</u>')
  if (!open && !close) return false
  if (!silent) {
    const token = state.push(open ? 'u_open' : 'u_close', 'u', open ? 1 : -1)
    token.markup = open ? '<u>' : '</u>'
  }
  state.pos += open ? 3 : 4
  return true
})

const linkOpen = markdown.renderer.rules.link_open
  ?? ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options))

markdown.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx]
  if (token) {
    token.attrSet('rel', 'nofollow noopener noreferrer ugc')
    token.attrSet('target', '_blank')
  }
  return linkOpen(tokens, idx, options, env, self)
}

markdown.renderer.rules.image = (tokens, idx) => {
  const token = tokens[idx]
  if (!token) return ''
  const src = String(token.attrGet('src') ?? '')
  const alt = markdown.utils.escapeHtml(token.content)
  if (!isForumUrl(src) || !src.startsWith('http')) return alt
  return `<img src="${markdown.utils.escapeHtml(src)}" alt="${alt}" loading="lazy" referrerpolicy="no-referrer">`
}

function renderMarkdown(body: string): string {
  return markdown.render(body)
}
