<script setup lang="ts">
import type { ForumIndex } from '#shared/forum'
import { forumLimits } from '#shared/forum'

const { t, cabinetEnabled, me } = useForum()
const { queryText, searching, found, searchError, searchPending, refreshSearch } = useForumSearch()

useHead(() => ({ title: t.value.pageTitle }))
useSeoMeta({
  description: () => t.value.description,
  ogTitle: () => t.value.pageTitle,
  ogDescription: () => t.value.description,
  robots: () => (cabinetEnabled && !searching.value ? 'index, follow' : 'noindex, nofollow'),
})

const { data, error, pending, refresh } = useFetch<ForumIndex>('/api/forum', {
  immediate: cabinetEnabled,
})
</script>

<template>
  <div class="forum">
    <div class="container">
      <header class="forum__head">
        <p class="forum__eyebrow">{{ t.eyebrow }}</p>
        <h1 class="forum__title text-gold">{{ t.title }}</h1>
        <p class="forum__lead">{{ t.description }}</p>
      </header>

      <p v-if="!cabinetEnabled" class="cab-note">{{ t.unavailable }}</p>
      <ForumNameForm v-else-if="me?.authenticated && !me.name" />

      <template v-if="cabinetEnabled">
        <ForumBar />

        <p v-if="queryText && !searching" class="forum-search__note">{{ fmt(t.searchShort, { min: forumLimits.searchMin }) }}</p>

        <ForumSearchResults
          v-if="searching"
          :query="queryText"
          :pending="searchPending"
          :error="searchError"
          :topics="found?.topics"
          show-category
          @retry="refreshSearch()"
        />

        <template v-else>
          <ForumStatus
            v-if="error || (pending && !data)"
            :error="error"
            @retry="refresh()"
          />
          <template v-else-if="data">
            <ForumBoard :categories="data.categories" />
            <ForumOverview :stats="data.stats" />
          </template>
        </template>
      </template>
    </div>
  </div>
</template>
