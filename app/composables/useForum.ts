import type { ForumMe } from '#shared/forum'

const emptyMe: ForumMe = { name: null, isAdmin: false, authenticated: false, banned: false, avatar: null }

/** Тексты форума, имя текущего игрока и разбор ошибок API. */
export function useForum() {
  const content = useContent()
  const t = computed(() => content.value.forum)
  const cabinetEnabled = useCabinetEnabled()
  const { locale } = useI18n()

  const { data: me, pending: mePending, refresh: refreshMe } = useFetch<ForumMe>('/api/forum/me', {
    key: 'forum-me',
    default: () => emptyMe,
    immediate: cabinetEnabled,
  })

  function errorText(e: unknown): string {
    const err = e as {
      data?: { code?: string, params?: Record<string, string | number>, data?: { code?: string, params?: Record<string, string | number> } }
    }
    const payload = err?.data?.data?.code ? err.data.data : err?.data
    const code = payload?.code
    const errors = t.value.errors as Record<string, string>
    if (code && errors[code]) return fmt(errors[code]!, payload?.params)
    return errors.server_error!
  }

  const dateFormat = computed(() => new Intl.DateTimeFormat(locale.value === 'ru' ? 'ru-RU' : 'en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  }))

  return {
    t,
    me,
    mePending,
    refreshMe,
    cabinetEnabled,
    errorText,
    date: (sec: number) => (sec > 0 ? dateFormat.value.format(new Date(sec * 1000)) : ''),
  }
}
