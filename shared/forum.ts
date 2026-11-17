// Настройки и типы форума, общие для сервера и фронтенда.
// Таблицы форума лежат в базе логин-сервера (la2, см. server/database/forum.sql).
// Контент форума (названия разделов, темы, сообщения) не переводится — это пользовательские
// данные; локализуется только интерфейс (app/locales: forum).

export const forumLimits = {
  sectionNameMax: 100,
  sectionDescMax: 255,
  titleMin: 3,
  titleMax: 150,
  bodyMin: 2,
  bodyMax: 20_000,
  /** Тем и сообщений на страницу */
  perPage: 20,
  /** Сколько страниц показывать в пагинации максимум (защита от огромных offset) */
  maxPages: 500,
} as const

/** Раздел форума. Счётчики и последняя активность считаются из тем/сообщений. */
export interface ForumSection {
  id: number
  name: string
  description: string
  sort: number
  topicCount: number
  postCount: number
  /** Unix-время последнего сообщения в разделе; 0 — сообщений нет */
  lastPostAt: number
  lastTopicId: number | null
  lastTopicTitle: string | null
}

/** Тема в списке раздела (без тела первого сообщения). */
export interface ForumTopic {
  id: number
  sectionId: number
  title: string
  authorId: number
  authorLogin: string
  isPinned: boolean
  isLocked: boolean
  viewCount: number
  /** Количество ответов (без первого сообщения темы) */
  replyCount: number
  createdAt: number
  lastPostAt: number
  lastPostLogin: string
}

/** Тема целиком: с телом первого сообщения и названием раздела. */
export interface ForumTopicDetail extends ForumTopic {
  body: string
  sectionName: string
}

/** Ответ в теме. */
export interface ForumPost {
  id: number
  topicId: number
  body: string
  authorId: number
  authorLogin: string
  createdAt: number
  /** Unix-время последнего редактирования; 0 — не редактировалось */
  updatedAt: number
}

export interface ForumIndexResponse {
  sections: ForumSection[]
}

export interface ForumSectionResponse {
  section: ForumSection
  topics: ForumTopic[]
  page: number
  pages: number
  total: number
}

export interface ForumTopicResponse {
  topic: ForumTopicDetail
  posts: ForumPost[]
  page: number
  pages: number
  /** Всего сообщений в теме, включая первое */
  total: number
}