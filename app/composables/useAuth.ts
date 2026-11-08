import type { AuthUser } from '#shared/cabinet'

/** Текущий пользователь кабинета. undefined — ещё не загружали, null — не вошёл. */
export function useAuth() {
  const user = useState<AuthUser | null | undefined>('auth:user', () => undefined)
  // На сервере пробрасывает cookie входящего запроса в запрос к API
  const requestFetch = useRequestFetch()

  async function refresh(): Promise<AuthUser | null> {
    try {
      user.value = (await requestFetch<{ user: AuthUser | null }>('/api/auth/me')).user
    }
    catch {
      user.value = null
    }
    return user.value
  }

  async function ensure(): Promise<AuthUser | null> {
    return user.value === undefined ? refresh() : user.value
  }

  async function login(body: { login: string, password: string }) {
    user.value = await $fetch<AuthUser>('/api/auth/login', { method: 'POST', body })
  }

  async function register(body: { login: string, email: string, password: string, passwordConfirm: string, ref: string }) {
    const { referrer, ...me } = await $fetch<AuthUser & { referrer: string | null }>('/api/auth/register', { method: 'POST', body })
    user.value = me
    return { referrer }
  }

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    user.value = null
    clearNuxtData()
  }

  return { user, ensure, refresh, login, register, logout }
}
