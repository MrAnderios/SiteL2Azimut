import type { MaybeRefOrGetter } from 'vue'
import type { ForumSearchPage } from '#shared/forum'
import { forumLimits } from '#shared/forum'

/** Номер страницы из ?page=. Нечисло и числа меньше 1 — первая страница. */
export function useForumPage() {
  const route = useRoute()
  const page = computed(() => {
    const n = Number(route.query.page)
    return Number.isInteger(n) && n > 0 ? n : 1
  })
  return { page }
}

/**
 * Поиск по ?q=. Запрос уходит, когда строка уже достаточно длинная.
 * enabled гасит первый запрос на неизвестном разделе.
 */
export function useForumSearch(options?: {
  section?: MaybeRefOrGetter<string | undefined>
  enabled?: MaybeRefOrGetter<boolean>
  key?: string
}) {
  const route = useRoute()
  const cabinetEnabled = useCabinetEnabled()
  const section = computed(() => toValue(options?.section) || '')
  const enabled = computed(() => toValue(options?.enabled) ?? true)
  const queryText = computed(() => (typeof route.query.q === 'string' ? route.query.q.trim() : ''))
  const searching = computed(() => queryText.value.length >= forumLimits.searchMin)

  const { data, error, pending, refresh } = useFetch<ForumSearchPage>('/api/forum/search', {
    key: options?.key ?? 'forum-search',
    query: computed(() => (
      section.value
        ? { q: queryText.value, category: section.value }
        : { q: queryText.value }
    )),
    immediate: cabinetEnabled && enabled.value && searching.value,
    watch: [queryText, section],
  })

  return {
    queryText,
    searching,
    found: data,
    searchError: error,
    searchPending: pending,
    refreshSearch: refresh,
  }
}
