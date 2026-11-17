import { visitDay, visitSectionFromPath } from '#shared/visits'

// Один запрос на раздел за московские сутки. Сервер всё равно отбрасывает повтор.
export default defineNuxtPlugin(() => {
  if (!useCabinetEnabled()) return

  const router = useRouter()
  const sent = new Set<string>()

  function track(path: string) {
    const section = visitSectionFromPath(path)
    if (!section) return
    const key = `${visitDay()}:${section}`
    if (sent.has(key)) return
    sent.add(key)
    void $fetch('/api/visits', { method: 'POST', body: { path }, keepalive: true }).catch(() => {
      sent.delete(key)
    })
  }

  track(router.currentRoute.value.path)
  router.afterEach(to => track(to.path))
})
