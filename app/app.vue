<script setup lang="ts">
const t = useContent()
const head = useLocaleHead()

// lang у <html>, hreflang-ссылки на другие языки, og:locale + title/description текущего языка
useHead(() => ({
  htmlAttrs: head.value.htmlAttrs,
  link: head.value.link,
  meta: [
    ...(head.value.meta ?? []),
    { name: 'description', content: t.value.meta.description },
  ],
  titleTemplate: (title?: string) => title || t.value.meta.title,
}))
</script>

<template>
  <NuxtRouteAnnouncer />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
