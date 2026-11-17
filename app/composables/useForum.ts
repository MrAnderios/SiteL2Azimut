// Общие помощники страниц форума: тексты, ошибки API (коды общие с кабинетом), уведомления, форматирование.
import type { ApiErrorCode } from '#shared/cabinet'

export function useForum() {
  const content = useContent()
  const t = computed(() => content.value.forum)
  const { locale } = useI18n()
  const notices = useNotices()

  function errorText(e: unknown): string {
    const err = e as { data?: { data?: { code?: string, params?: Record<string, string | number> } }, statusCode?: number }
    const code = err?.data?.data?.code as ApiErrorCode | undefined
    const errors = content.value.cabinet.errors as Record<string, string>
    if (code && errors[code]) return fmt(errors[code], err.data!.data!.params)
    return errors.server_error!
  }

  const numberFormat = computed(() => new Intl.NumberFormat(locale.value === 'ru' ? 'ru-RU' : 'en-US'))
  const dateFormat = computed(() => new Intl.DateTimeFormat(locale.value === 'ru' ? 'ru-RU' : 'en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }))

  return {
    t,
    notices,
    errorText,
    showError: (e: unknown) => notices.error(errorText(e)),
    num: (n: number) => numberFormat.value.format(n),
    /** Дата из unix-времени (секунды); 0 — прочерк */
    date: (sec: number) => (sec > 0 ? dateFormat.value.format(new Date(sec * 1000)) : t.value.unknown),
  }
}