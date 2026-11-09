<script setup lang="ts">
// Страница ошибок Nuxt: 404 для несуществующих адресов и общая заглушка для остальных ошибок.
// При `nuxt generate` из неё собирается 404.html для статического хостинга.
// Переход по любой ссылке (шапка, кнопки) сам сбрасывает ошибку — это делает роутер Nuxt.
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

const t = useContent()
const head = useLocaleHead()

const is404 = computed(() => props.error.statusCode === 404)
const code = computed(() => props.error.statusCode || 500)
const text = computed(() => is404.value ? t.value.error.notFound : t.value.error.generic)

useHead(() => ({
  htmlAttrs: head.value.htmlAttrs,
  title: `${text.value.title} — ${t.value.meta.title}`,
  meta: [{ name: 'robots', content: 'noindex, follow' }],
}))
</script>

<template>
  <NuxtLayout>
    <section class="error-page">
      <div class="container error-page__inner">
        <p class="error-page__code text-gold" aria-hidden="true">{{ code }}</p>
        <p class="error-page__eyebrow">{{ t.error.eyebrow }}</p>
        <h1 class="error-page__title text-gold">{{ text.title }}</h1>
        <UiOrnament class="error-page__ornament" />
        <p class="error-page__text">{{ text.text }}</p>
        <div class="error-page__actions">
          <UiButton href="/" size="lg">{{ t.error.home }}</UiButton>
          <UiButton href="/stats" variant="secondary" size="lg">{{ t.nav.stats }}</UiButton>
        </div>
      </div>
    </section>
  </NuxtLayout>
</template>

<style scoped>
.error-page {
  display: flex;
  align-items: center;
  min-height: calc(100vh - var(--header-height));
  padding-block: calc(var(--header-height) + 48px) 72px;
  background:
    radial-gradient(ellipse 60% 50% at 50% 45%, rgb(226 171 63 / 0.1), transparent 70%),
    var(--color-bg);
}

.error-page__inner {
  text-align: center;
}

.error-page__code {
  font-family: var(--font-heading);
  font-size: clamp(120px, 26vw, 240px);
  font-weight: 700;
  line-height: 0.9;
  letter-spacing: 0.04em;
  filter: drop-shadow(0 0 32px rgb(226 171 63 / 0.25));
}

.error-page__eyebrow {
  margin-top: 16px;
  color: var(--gold-500);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.32em;
  text-transform: uppercase;
}

.error-page__title {
  margin-top: 12px;
  font-family: var(--font-heading);
  font-size: clamp(30px, 4.5vw, 48px);
  line-height: 1.15;
}

.error-page__ornament {
  margin-top: 16px;
}

.error-page__text {
  max-width: 560px;
  margin: 20px auto 0;
  color: var(--color-text-muted);
  font-size: 17px;
}

.error-page__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 16px;
  margin-top: 36px;
}
</style>
