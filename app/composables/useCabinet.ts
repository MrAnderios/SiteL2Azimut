// Общие помощники страниц кабинета: тексты, ошибки API, уведомления, форматирование.
import type { ApiErrorCode } from '#shared/cabinet'
import { donateItem } from '#shared/cabinet'

/** Подставляет параметры в строку: fmt('Привет, {name}', { name: 'Вася' }) */
export function fmt(template: string, params: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (m, key: string) => (key in params ? String(params[key]) : m))
}

export interface Notice {
  id: number
  type: 'success' | 'error'
  text: string
}

let noticeId = 0

/** Всплывающие уведомления (показываются в layout кабинета). */
export function useNotices() {
  const list = useState<Notice[]>('cabinet:notices', () => [])

  function remove(id: number) {
    list.value = list.value.filter(n => n.id !== id)
  }

  function push(type: Notice['type'], text: string) {
    const id = ++noticeId
    list.value = [...list.value, { id, type, text }]
    if (import.meta.client && type === 'success') setTimeout(() => remove(id), 6000)
  }

  return {
    list,
    success: (text: string) => push('success', text),
    error: (text: string) => push('error', text),
    remove,
    clear: () => { list.value = [] },
  }
}

/** Тексты кабинета на текущем языке + перевод ошибок API + форматирование чисел и дат. */
export function useCabinet() {
  const content = useContent()
  const t = computed(() => content.value.cabinet)
  const { locale } = useI18n()
  const notices = useNotices()

  function errorText(e: unknown): string {
    const err = e as { data?: { data?: { code?: string, params?: Record<string, string | number> } }, statusCode?: number }
    const code = err?.data?.data?.code as ApiErrorCode | undefined
    const errors = t.value.errors as Record<string, string>
    if (code && errors[code]) return fmt(errors[code], err.data!.data!.params)
    return errors.server_error!
  }

  const numberFormat = computed(() => new Intl.NumberFormat(locale.value === 'ru' ? 'ru-RU' : 'en-US'))
  const dateFormat = computed(() => new Intl.DateTimeFormat(locale.value === 'ru' ? 'ru-RU' : 'en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }))

  return {
    t,
    item: donateItem.name,
    notices,
    errorText,
    /** Показать ошибку API уведомлением */
    showError: (e: unknown) => notices.error(errorText(e)),
    num: (n: number) => numberFormat.value.format(n),
    /** Дата из unix-времени (секунды); 0 — прочерк */
    date: (sec: number) => (sec > 0 ? dateFormat.value.format(new Date(sec * 1000)) : t.value.common.empty),
  }
}

/** Заголовок страницы кабинета; кабинет не индексируется поисковиками. */
export function usePrivatePage(title: () => string) {
  useHead(() => ({ title: `${title()} — Azimut` }))
  useSeoMeta({ robots: 'noindex, nofollow' })
}

/**
 * useFetch для API кабинета: при истёкшей сессии (401) отправляет на страницу входа.
 */
export function useCabinetFetch<T>(url: string, opts: { query?: Ref<Record<string, string>> } = {}) {
  const auth = useAuth()
  const localePath = useLocalePath()
  const route = useRoute()
  const res = useFetch<T>(url, { key: url, query: opts.query, dedupe: 'defer' })

  watch(res.error, async (err) => {
    if (err?.statusCode === 401) {
      auth.user.value = null
      await navigateTo({ path: localePath('/login'), query: { redirect: route.fullPath } })
    }
  }, { immediate: true })

  return res
}
