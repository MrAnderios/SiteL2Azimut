import { links } from '~/data/site'

/** Пути нового личного кабинета (без языкового префикса). */
export const cabinetPaths = ['/login', '/register', '/cabinet', '/admin']

/**
 * Работает ли новый личный кабинет. Выключен в статической сборке (FTP-деплой): там нет бэкенда,
 * и ссылки на кабинет ведут в старую CMS. Включается переменной NUXT_PUBLIC_CABINET_ENABLED.
 */
export function useCabinetEnabled(): boolean {
  return useRuntimeConfig().public.cabinetEnabled !== false
}

/** Ссылка на страницу кабинета: новый кабинет, если он работает, иначе — старая CMS. */
export function useCabinetHref(path: string): string {
  return useCabinetEnabled() ? path : links.legacyCabinet
}
