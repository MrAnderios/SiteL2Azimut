<script setup lang="ts">
import { site, socials } from '~/data/site'

const t = useContent()
// lang у <html>, canonical, hreflang-ссылки на другие языки, og:url и og:locale(:alternate)
const head = useLocaleHead()
const baseUrl = useRuntimeConfig().public.i18n.baseUrl as string
const ogImage = `${baseUrl}/og-image.jpg`

useHead(() => ({
  htmlAttrs: head.value.htmlAttrs,
  link: head.value.link,
  meta: head.value.meta,
  titleTemplate: (title?: string) => title || t.value.meta.title,
}))

useSeoMeta({
  description: () => t.value.meta.description,
  ogType: 'website',
  ogSiteName: site.name,
  ogTitle: () => t.value.meta.pageTitle,
  ogDescription: () => t.value.meta.description,
  ogImage,
  ogImageType: 'image/jpeg',
  ogImageWidth: 1200,
  ogImageHeight: 630,
  ogImageAlt: () => t.value.meta.ogImageAlt,
  twitterCard: 'summary_large_image',
  twitterTitle: () => t.value.meta.pageTitle,
  twitterDescription: () => t.value.meta.description,
  twitterImage: ogImage,
  twitterImageAlt: () => t.value.meta.ogImageAlt,
  robots: 'index, follow, max-image-preview:large',
})

// Структурированные данные для поисковиков (schema.org)
useHead(() => ({
  script: [{
    key: 'ld-json',
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          '@id': `${baseUrl}/#organization`,
          'name': site.name,
          'url': `${baseUrl}/`,
          'logo': `${baseUrl}/images/logo.png`,
          'email': site.email,
          'sameAs': socials.map(s => s.href),
        },
        {
          '@type': 'WebSite',
          '@id': `${baseUrl}/#website`,
          'name': t.value.meta.title,
          'description': t.value.meta.description,
          'url': `${baseUrl}/`,
          'inLanguage': head.value.htmlAttrs?.lang,
          'publisher': { '@id': `${baseUrl}/#organization` },
        },
      ],
    }),
  }],
}))
</script>

<template>
  <NuxtRouteAnnouncer />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
