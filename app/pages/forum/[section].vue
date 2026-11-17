<script setup lang="ts">
// Раздел форума: список тем с пагинацией и формой создания темы.
import type { ForumSectionResponse } from '#shared/forum'

const route = useRoute()
const localePath = useLocalePath()
const { t, num, date } = useForum()
const auth = useAuth()
await auth.ensure()
const user = auth.user

const sectionId = computed(() => route.params.section as string)
const page = computed(() => String(route.query.page ?? '1'))

const { data, error, refresh } = await useFetch<ForumSectionResponse>(
  () => `/api/forum/sections/${sectionId.value}`,
  { query: { page } },
)

const unavailable = computed(() => error.value?.statusCode === 503)
const notFound = computed(() => error.value?.statusCode === 404)

useHead(() => ({ title: data.value ? `${data.value.section.name} — ${t.value.title} — Azimut` : t.value.title }))
useSeoMeta({ description: () => data.value?.section.description || t.value.description })

const showForm = ref(false)

async function onCreated(id: number) {
  showForm.value = false
  await navigateTo(localePath(`/forum/topic/${id}`))
}
</script>

<template>
  <div class="forum-shell container">
    <div class="forum-page">
      <nav class="forum-crumbs" aria-label="Breadcrumb">
        <NuxtLink :to="localePath('/forum')">{{ t.title }}</NuxtLink>
        <span class="forum-crumbs__sep">/</span>
        <span>{{ data?.section.name ?? '…' }}</span>
      </nav>

      <div v-if="unavailable" class="panel forum-unavailable">
        <h2 class="forum-unavailable__title">{{ t.unavailableTitle }}</h2>
        <p class="forum-unavailable__text">{{ t.unavailableText }}</p>
      </div>

      <div v-else-if="notFound" class="panel forum-empty">
        {{ t.loadError }}
        <NuxtLink :to="localePath('/forum')" class="cab-link">{{ t.backToSections }}</NuxtLink>
      </div>

      <div v-else-if="error" class="cab-note cab-note--error">
        {{ t.loadError }}
        <button type="button" class="cab-link cab-retry" @click="() => refresh()">{{ t.retry }}</button>
      </div>

      <template v-else-if="data">
        <div class="forum-head">
          <div>
            <h1 class="forum-head__title text-gold">{{ data.section.name }}</h1>
            <p v-if="data.section.description" class="forum-head__subtitle">{{ data.section.description }}</p>
          </div>
          <UiButton v-if="user && !showForm" @click="showForm = true">+ {{ t.newTopic }}</UiButton>
        </div>

        <ForumTopicForm v-if="user && showForm" :section-id="data.section.id" @created="onCreated" @cancel="showForm = false" />

        <p v-if="!user" class="cab-hint">
          {{ t.loginToPost }}
          <NuxtLink :to="{ path: localePath('/login'), query: { redirect: route.fullPath } }" class="cab-link">{{ t.login }}</NuxtLink>
        </p>

        <div class="panel cab-panel">
          <p v-if="!data.topics.length" class="forum-empty">{{ t.topicsEmpty }}</p>
          <div v-else class="cab-table-wrap">
            <table class="cab-table cab-table--stack">
              <thead>
                <tr>
                  <th>{{ t.topicTitle }}</th>
                  <th class="cab-num">{{ t.replies }}</th>
                  <th class="cab-num">{{ t.views }}</th>
                  <th>{{ t.lastReply }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="topic in data.topics" :key="topic.id">
                  <td :data-label="t.topicTitle">
                    <span v-if="topic.isPinned" class="forum-badge forum-badge--pin">{{ t.pinned }}</span>
                    <span v-if="topic.isLocked" class="forum-badge forum-badge--lock">{{ t.locked }}</span>
                    <NuxtLink :to="localePath(`/forum/topic/${topic.id}`)" class="forum-topic-title">{{ topic.title }}</NuxtLink>
                    <p class="forum-topic-meta">{{ t.author }}: {{ topic.authorLogin }} · {{ date(topic.createdAt) }}</p>
                  </td>
                  <td class="cab-num" :data-label="t.replies">{{ num(topic.replyCount) }}</td>
                  <td class="cab-num" :data-label="t.views">{{ num(topic.viewCount) }}</td>
                  <td :data-label="t.lastReply">
                    <span class="cab-nowrap">{{ topic.lastPostLogin }}</span>
                    <p class="forum-topic-meta">{{ date(topic.lastPostAt) }}</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <ForumPager :page="data.page" :pages="data.pages" />
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