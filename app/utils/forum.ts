import type { ForumFormat, ForumMe, ForumPost } from '#shared/forum'
import { forumLimits } from '#shared/forum'
import MarkdownIt from 'markdown-it'
import { isForumImageUrl, isForumUrl, sanitizePostHtml } from './forum-html'

export { isForumImageUrl, isForumUrl, normalizeForumUrl } from './forum-html'

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

/** Кнопки на страницах. Итог всё равно проверяет сервер. */

export function forumCanStartTopic(me: ForumMe | null | undefined, staffOnly: boolean): boolean {
  return !!me?.name && !me.banned && (!staffOnly || me.isAdmin)
}

export function forumCanReply(
  me: ForumMe | null | undefined,
  topic: { closed: boolean } | null | undefined,
  staffOnly: boolean,
): boolean {
  if (!topic || !me?.name || me.banned) return false
  if (staffOnly && !me.isAdmin) return false
  if (topic.closed && !me.isAdmin) return false
  return true
}

export function forumCanDeleteTopic(
  topic: { empty: boolean, own: boolean } | null | undefined,
  isAdmin: boolean | undefined,
): boolean {
  return !!topic?.empty && (topic.own || !!isAdmin)
}

/** Игрок с именем ставит реакцию чужому видимому сообщению. Забаненный — нет. */
export function forumCanReact(
  me: ForumMe | null | undefined,
  post: Pick<ForumPost, 'own' | 'hidden'>,
): boolean {
  return !!me?.name && !me.banned && !post.own && !post.hidden
}

/** Админ удаляет любое сообщение. Автор — только своё последнее видимое на последней странице. */
export function forumCanDeletePost(
  post: Pick<ForumPost, 'hidden' | 'own'>,
  me: ForumMe | null | undefined,
  lastOnLastPage: boolean,
): boolean {
  if (me?.isAdmin) return true
  if (post.hidden || me?.banned || !post.own) return false
  return lastOnLastPage
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
  if (!isForumImageUrl(src)) return alt
  return `<img src="${markdown.utils.escapeHtml(src)}" alt="${alt}" loading="lazy" referrerpolicy="no-referrer">`
}

function renderMarkdown(body: string): string {
  return markdown.render(body)
}
