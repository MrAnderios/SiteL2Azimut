import en from '~/locales/en'
import ru from '~/locales/ru'
import type { Messages } from '~/locales/ru'

const dictionaries: Record<string, Messages> = { ru, en }

/** Тексты лендинга на текущем языке (реактивно меняются при переключении языка). */
export function useContent() {
  const { locale } = useI18n()
  return computed(() => dictionaries[locale.value] ?? ru)
}
