<script setup lang="ts">
import type { ForumCategoryPage } from '#shared/forum'
import { forumCategory, forumLimits } from '#shared/forum'
import { forumCanStartTopic } from '~/utils/forum'

const route = useRoute()
const localePath = useLocalePath()
const { t, cabinetEnabled, me } = useForum()

const slug = computed(() => String(route.params.slug || ''))
const category = computed(() => forumCategory(slug.value))
const { page } = useForumPage()
const copy = computed(() => (category.value ? t.value.categories[category.value.slug] : null))
const canStart = computed(() => forumCanStartTopic(me.value, !!category.value?.staffOnly))
const { queryText, searching, found, searchError, searchPending, refreshSearch } = useForumSearch({
  section: slug,
  enabled: () => !!category.value,
  key: 'forum-search-category',
})

useHead(() => ({ title: copy.value ? `${copy.value.title} — ${t.value.pageTitle}` : t.value.pageTitle }))
useSeoMeta({
  description: () => copy.value?.text || t.value.description,
  ogTitle: () => (copy.value ? `${copy.value.title} — Azimut` : t.value.pageTitle),
  robots: () => (cabinetEnabled && category.value && !searching.value ? 'index, follow' : 'noindex, nofollow'),
})

const { data, error, pending, refresh } = useFetch<ForumCategoryPage>(() => `/api/forum/categories/${slug.value}`, {
  query: { page },
  immediate: cabinetEnabled && !!forumCategory(slug.value),
  watch: [slug, page],
})

const topicOpen = ref(false)
</script>

<template>
  <div class="forum">
    <div class="container">
      <header class="forum__head">
        <p class="forum__crumbs">
          <NuxtLink :to="localePath('/forum')">{{ t.title }}</NuxtLink>
          <span v-if="copy">/ {{ copy.title }}</span>
        </p>
        <h1 class="forum__title text-gold">{{ copy?.title || t.title }}</h1>
        <p v-if="copy" class="forum__lead">{{ copy.text }}</p>
      </header>

      <p v-if="!cabinetEnabled" class="cab-note">{{ t.unavailable }}</p>
      <p v-else-if="!category" class="cab-note cab-note--error">{{ t.errors.unknown_category }}</p>

      <template v-else>
        <ForumNameForm v-if="me?.authenticated && !me.name" />
        <ForumBar :category="category.slug">
          <UiButton
            v-if="canStart"
            size="sm"
            class="forum-bar__action"
            aria-haspopup="dialog"
            @click="topicOpen = true"
          >
            {{ t.newTopic }}
          </UiButton>
        </ForumBar>
        <p v-if="queryText && !searching" class="forum-search__note">{{ fmt(t.searchShort, { min: forumLimits.searchMin }) }}</p>

        <ForumSearchResults
          v-if="searching"
          :query="queryText"
          :pending="searchPending"
          :error="searchError"
          :topics="found?.topics"
          @retry="refreshSearch()"
        />

        <template v-else>
          <ForumStatus
            v-if="error || (pending && !data)"
            :error="error"
            @retry="refresh()"
          />
          <p v-else-if="data && !data.topics.length" class="forum-hint">{{ t.emptyTopics }}</p>
          <ForumTopicTable v-else-if="data" :topics="data.topics" />
          <ForumPager v-if="data" :page="data.page" :pages="data.pages" />
        </template>

        <p v-if="me?.banned" class="forum-hint">{{ t.bannedHint }}</p>
        <p v-else-if="me?.authenticated && me.name && category.staffOnly && !me.isAdmin" class="forum-hint">{{ t.newsLocked }}</p>
        <ForumLogin v-else-if="me && !me.authenticated" />
        <ForumTopicForm v-else-if="canStart" v-model:open="topicOpen" :category="category.slug" />
      </template>
    </div>
  </div>
</template>
