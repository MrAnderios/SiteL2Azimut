<script setup lang="ts">
import type { ForumCategoryPage, ForumSearchPage } from '#shared/forum'
import { forumCategory, forumLimits } from '#shared/forum'
import { forumBodyReady } from '~/utils/forum'

const route = useRoute()
const localePath = useLocalePath()
const { t, cabinetEnabled, me, errorText } = useForum()
const content = useContent()

const slug = computed(() => String(route.params.slug || ''))
const category = computed(() => forumCategory(slug.value))
const page = computed(() => {
  const n = Number(route.query.page)
  return Number.isInteger(n) && n > 0 ? n : 1
})
const copy = computed(() => (category.value ? t.value.categories[category.value.slug] : null))
const canStart = computed(() => !!me.value?.name && (!category.value?.staffOnly || me.value.isAdmin))
const queryText = computed(() => (typeof route.query.q === 'string' ? route.query.q.trim() : ''))
const searching = computed(() => queryText.value.length >= forumLimits.searchMin)

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

const { data: found, error: searchError, pending: searchPending, refresh: refreshSearch } = useFetch<ForumSearchPage>('/api/forum/search', {
  key: 'forum-search-category',
  query: computed(() => ({ q: queryText.value, category: slug.value })),
  immediate: cabinetEnabled && !!forumCategory(slug.value) && searching.value,
  watch: [queryText, slug],
})

const form = reactive({ title: '', body: '' })
const topicOpen = ref(false)
const pendingPost = ref(false)
const actionError = ref('')

async function submit() {
  if (!category.value || !forumBodyReady(form.body)) return
  pendingPost.value = true
  actionError.value = ''
  try {
    const created = await $fetch<{ id: number }>('/api/forum/topics', {
      method: 'POST',
      body: { category: category.value.slug, title: form.title, body: form.body },
    })
    form.title = ''
    form.body = ''
    await navigateTo(localePath(`/forum/t/${created.id}`))
  }
  catch (e) {
    actionError.value = errorText(e)
  }
  finally {
    pendingPost.value = false
  }
}
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
        <div class="forum-bar">
          <ForumSearch :category="category.slug" />
          <ForumUser />
          <UiButton
            v-if="canStart"
            size="sm"
            class="forum-bar__action"
            aria-haspopup="dialog"
            @click="topicOpen = true"
          >
            {{ t.newTopic }}
          </UiButton>
        </div>
        <p v-if="queryText && !searching" class="forum-search__note">{{ fmt(t.searchShort, { min: forumLimits.searchMin }) }}</p>

        <template v-if="searching">
          <h2 class="forum-search__title">{{ fmt(t.searchTitle, { q: queryText }) }}</h2>
          <p v-if="searchError" class="cab-note cab-note--error">
            {{ errorText(searchError) }}
            <button type="button" class="forum-text-btn" @click="() => refreshSearch()">{{ t.retry }}</button>
          </p>
          <p v-else-if="searchPending && !found" class="forum-hint">{{ t.loading }}</p>
          <p v-else-if="found && !found.topics.length" class="forum-hint">{{ t.searchEmpty }}</p>
          <div v-else-if="found" class="forum-table panel">
            <div class="forum-table__head">
              <span>{{ t.topic }}</span>
              <span>{{ t.repliesShort }}</span>
              <span>{{ t.lastPost }}</span>
            </div>
            <ul class="forum-rows">
              <ForumTopicRow v-for="topic in found.topics" :key="topic.id" :topic="topic" />
            </ul>
          </div>
        </template>

        <template v-else>
          <p v-if="error" class="cab-note cab-note--error">
            {{ errorText(error) }}
            <button type="button" class="forum-text-btn" @click="() => refresh()">{{ t.retry }}</button>
          </p>
          <p v-else-if="pending && !data" class="forum-hint">{{ t.loading }}</p>
          <p v-else-if="data && !data.topics.length" class="forum-hint">{{ t.emptyTopics }}</p>
          <div v-else-if="data" class="forum-table panel">
            <div class="forum-table__head">
              <span>{{ t.topic }}</span>
              <span>{{ t.repliesShort }}</span>
              <span>{{ t.lastPost }}</span>
            </div>
            <ul class="forum-rows">
              <ForumTopicRow v-for="topic in data.topics" :key="topic.id" :topic="topic" />
            </ul>
          </div>
          <ForumPager v-if="data" :page="data.page" :pages="data.pages" />
        </template>

        <p v-if="me?.authenticated && me.name && category.staffOnly && !me.isAdmin" class="forum-hint">{{ t.newsLocked }}</p>
        <p v-else-if="me && !me.authenticated" class="forum-login">
          {{ t.loginToPost }}
          <NuxtLink :to="{ path: localePath('/login'), query: { redirect: route.fullPath } }" class="cab-link">{{ t.login }}</NuxtLink>
        </p>
        <UiModal
          v-else-if="canStart"
          v-model:open="topicOpen"
          :title="t.newTopic"
          :close-label="content.cabinet.common.close"
        >
          <form class="forum-compose forum-compose--modal" @submit.prevent="submit">
            <p v-if="actionError" class="cab-note cab-note--error" role="alert">{{ actionError }}</p>
            <label class="cab-field">
              <span>{{ t.titleLabel }}</span>
              <input v-model="form.title" class="cab-input" required autofocus :maxlength="forumLimits.titleMax">
            </label>
            <div class="cab-field">
              <span>{{ t.bodyLabel }}</span>
              <ForumEditor v-model="form.body" :label="t.bodyLabel" :placeholder="t.editor.placeholder" />
            </div>
            <UiButton type="submit" :loading="pendingPost" :disabled="!forumBodyReady(form.body)">{{ t.submitTopic }}</UiButton>
          </form>
        </UiModal>
      </template>
    </div>
  </div>
</template>
