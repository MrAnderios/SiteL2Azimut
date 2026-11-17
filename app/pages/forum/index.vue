<script setup lang="ts">
// Главная форума: список разделов.
import type { ForumIndexResponse } from '#shared/forum'

const { t, num, date } = useForum()
const localePath = useLocalePath()

useHead(() => ({ title: t.value.pageTitle }))
useSeoMeta({
  description: () => t.value.description,
  ogTitle: () => t.value.pageTitle,
  ogDescription: () => t.value.description,
})

const { data, error, refresh } = await useFetch<ForumIndexResponse>('/api/forum')
const unavailable = computed(() => error.value?.statusCode === 503)
</script>

<template>
  <div class="forum-shell container">
    <div class="forum-page">
      <div class="forum-head">
        <div>
          <p class="forum-eyebrow">{{ t.eyebrow }}</p>
          <h1 class="forum-head__title text-gold">{{ t.title }}</h1>
          <p class="forum-head__subtitle">{{ t.subtitle }}</p>
        </div>
      </div>

      <!-- Форум ещё не настроен (таблицы не созданы) -->
      <div v-if="unavailable" class="panel forum-unavailable">
        <h2 class="forum-unavailable__title">{{ t.unavailableTitle }}</h2>
        <p class="forum-unavailable__text">{{ t.unavailableText }}</p>
      </div>

      <div v-else-if="error" class="cab-note cab-note--error">
        {{ t.loadError }}
        <button type="button" class="cab-link cab-retry" @click="() => refresh()">{{ t.retry }}</button>
      </div>

      <template v-else-if="data">
        <p v-if="!data.sections.length" class="panel forum-empty">{{ t.sectionsEmpty }}</p>
        <div v-else class="forum-sections">
          <div v-for="s in data.sections" :key="s.id" class="panel panel--interactive forum-section">
            <div class="forum-section__main">
              <NuxtLink :to="localePath(`/forum/${s.id}`)" class="forum-section__name">{{ s.name }}</NuxtLink>
              <p v-if="s.description" class="forum-section__desc">{{ s.description }}</p>
              <p class="forum-section__last">
                <template v-if="s.lastTopicId">
                  {{ t.lastPost }}:
                  <NuxtLink :to="localePath(`/forum/topic/${s.lastTopicId}`)">{{ s.lastTopicTitle }}</NuxtLink>
                  · {{ date(s.lastPostAt) }}
                </template>
                <template v-else>{{ t.noPosts }}</template>
              </p>
            </div>
            <div class="forum-section__stats">
              <span class="forum-section__stat">{{ t.topics }}: <b>{{ num(s.topicCount) }}</b></span>
              <span class="forum-section__stat">{{ t.posts }}: <b>{{ num(s.postCount) }}</b></span>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.cab-retry {
  margin-left: 8px;
  padding: 0;
  border-width: 0 0 1px;
  background: none;
  font: inherit;
  cursor: pointer;
}
</style>