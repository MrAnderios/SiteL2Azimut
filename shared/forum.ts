// Разделы и лимиты форума. Названия разделов — в locales (forum.categories).

export const forumCategories = [
  { slug: 'news', staffOnly: true },
  { slug: 'general', staffOnly: false },
  { slug: 'clans', staffOnly: false },
  { slug: 'questions', staffOnly: false },
  { slug: 'bugs', staffOnly: false },
] as const

export type ForumCategorySlug = typeof forumCategories[number]['slug']

export function forumCategory(slug: string): (typeof forumCategories)[number] | undefined {
  return forumCategories.find(c => c.slug === slug)
}

export const forumLimits = {
  nameMin: 3,
  nameMax: 16,
  titleMax: 120,
  bodyMax: 5_000,
  pageSize: 20,
  searchMin: 2,
  searchMax: 80,
  searchLimit: 30,
} as const

/** Страница, на которой лежит последнее сообщение. replies не считает первое. */
export function forumTopicPages(replies: number): number {
  const posts = Math.max(0, replies) + 1
  return Math.max(1, Math.ceil(posts / forumLimits.pageSize))
}

/** Буква или цифра по краям; внутри ещё пробел, _ и -. Двойной пробел не проходит. */
export const forumNamePattern = /^[\p{L}\p{N}](?:[\p{L}\p{N}_-]| (?! ))*[\p{L}\p{N}]$/u

/** Как сообщение хранится. plain — старые записи, markdown — редактор. Отрисовка своя у каждого, старые записи не переписываются. */
export type ForumFormat = 'plain' | 'markdown'

export interface ForumLastTopic {
  id: number
  title: string
  author: string
}

export interface ForumCategorySummary {
  slug: ForumCategorySlug
  topics: number
  posts: number
  lastPostAt: number
  lastTopic: ForumLastTopic | null
}

export interface ForumMember {
  name: string
  joinedAt: number
}

export interface ForumActiveMember {
  name: string
  posts: number
}

export interface ForumStats {
  topics: number
  posts: number
  members: number
  newest: ForumMember | null
  active: ForumActiveMember | null
  /** Имена тех, кто задал имя на форуме, по алфавиту. */
  names: string[]
}

export interface ForumIndex {
  categories: ForumCategorySummary[]
  stats: ForumStats
}

export interface ForumTopicListItem {
  id: number
  title: string
  author: string
  lastAuthor: string
  pinned: boolean
  closed: boolean
  replies: number
  createdAt: number
  lastPostAt: number
}

export interface ForumSearchHit extends ForumTopicListItem {
  slug: ForumCategorySlug
}

export interface ForumSearchPage {
  query: string
  topics: ForumSearchHit[]
}

export interface ForumCategoryPage {
  slug: ForumCategorySlug
  page: number
  pages: number
  topics: ForumTopicListItem[]
}

export interface ForumPost {
  id: number
  author: string
  /** Есть у админа — чтобы сменить имя автора */
  authorId: number | null
  body: string
  format: ForumFormat
  createdAt: number
  editedAt: number
  hidden: boolean
  own: boolean
  /** Администратор видит, что автору запрещено писать. */
  banned: boolean
}

export interface ForumTopicPage {
  id: number
  slug: ForumCategorySlug
  title: string
  pinned: boolean
  closed: boolean
  createdAt: number
  /** Зритель — автор темы. */
  own: boolean
  /** Нет видимых сообщений. Такую тему можно удалить. */
  empty: boolean
  page: number
  pages: number
  posts: ForumPost[]
}

/** Имя текущего игрока. Без сессии authenticated = false. */
export interface ForumMe {
  name: string | null
  isAdmin: boolean
  authenticated: boolean
  /** Администратор запретил писать. У администратора всегда false. */
  banned: boolean
}

/** Одно сообщение текущего игрока и место, где оно лежит в теме. */
export interface ForumOwnPost {
  id: number
  topicId: number
  topicTitle: string
  slug: ForumCategorySlug
  body: string
  format: ForumFormat
  createdAt: number
  editedAt: number
  hidden: boolean
  page: number
}

/** Сообщения текущего игрока, новые сверху. */
export interface ForumOwnPosts {
  name: string | null
  page: number
  pages: number
  total: number
  posts: ForumOwnPost[]
}
