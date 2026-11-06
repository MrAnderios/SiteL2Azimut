// v-reveal — плавное появление элемента при попадании во вьюпорт.
// Использование: <div v-reveal> или <div v-reveal="150"> (задержка в мс).
// Только для обычных HTML-элементов, не для компонентов.
import type { DirectiveBinding } from 'vue'

export default defineNuxtPlugin((nuxtApp) => {
  let observer: IntersectionObserver | undefined

  const ssrProps = (binding: DirectiveBinding<number | undefined>) => ({
    'data-reveal': '',
    ...(binding.value ? { style: `--reveal-delay: ${binding.value}ms` } : {}),
  })

  nuxtApp.vueApp.directive<HTMLElement, number | undefined>('reveal', {
    getSSRProps: ssrProps,
    mounted(el, binding) {
      el.setAttribute('data-reveal', '')
      if (binding.value) el.style.setProperty('--reveal-delay', `${binding.value}ms`)

      if (!observer) {
        el.classList.add('is-visible')
        return
      }
      observer.observe(el)
    },
    unmounted(el) {
      observer?.unobserve(el)
    },
  })

  if (import.meta.client) {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!reduced && 'IntersectionObserver' in window) {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue
            entry.target.classList.add('is-visible')
            observer?.unobserve(entry.target)
          }
        },
        { rootMargin: '0px 0px -8% 0px' },
      )
      document.documentElement.classList.add('reveal-ready')
    }
  }
})
