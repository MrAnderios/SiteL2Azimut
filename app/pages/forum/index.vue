<script setup lang="ts">
import type { ForumIndex, ForumSearchPage } from '#shared/forum'
import { forumLimits } from '#shared/forum'

const route = useRoute()
const { t, cabinetEnabled, me, date, errorText } = useForum()
const localePath = useLocalePath()

const queryText = computed(() => (typeof route.query.q === 'string' ? route.query.q.trim() : ''))
const searching = computed(() => queryText.value.length >= forumLimits.searchMin)

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

const { data: found, error: searchError, pending: searchPending, refresh: refreshSearch } = useFetch<ForumSearchPage>('/api/forum/search', {
  key: 'forum-search-index',
  query: computed(() => ({ q: queryText.value })),
  immediate: cabinetEnabled && searching.value,
  watch: [queryText],
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
        <div class="forum-bar">
          <ForumSearch />
          <ForumUser />
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
              <ForumTopicRow v-for="topic in found.topics" :key="topic.id" :topic="topic" :category="topic.slug" />
            </ul>
          </div>
        </template>

        <template v-else>
          <p v-if="error" class="cab-note cab-note--error">
            {{ errorText(error) }}
            <button type="button" class="forum-text-btn" @click="() => refresh()">{{ t.retry }}</button>
          </p>
          <p v-else-if="pending && !data" class="forum-hint">{{ t.loading }}</p>
          <template v-else-if="data">
            <div class="forum-board panel">
              <div class="forum-board__head">
                <span>{{ t.section }}</span>
                <span>{{ t.topicsShort }}</span>
                <span>{{ t.postsShort }}</span>
                <span>{{ t.lastPost }}</span>
              </div>
              <article v-for="category in data.categories" :key="category.slug" class="forum-board__row">
                <div class="forum-board__main">
                  <h2 class="forum-board__title">
                    <NuxtLink :to="localePath(`/forum/${category.slug}`)">{{ t.categories[category.slug].title }}</NuxtLink>
                  </h2>
                  <p class="forum-board__text">{{ t.categories[category.slug].text }}</p>
                </div>
                <p class="forum-stat">
                  <b>{{ category.topics }}</b>
                  <span>{{ t.topicsShort }}</span>
                </p>
                <p class="forum-stat">
                  <b>{{ category.posts }}</b>
                  <span>{{ t.postsShort }}</span>
                </p>
                <div class="forum-board__last">
                  <template v-if="category.lastTopic">
                    <NuxtLink :to="localePath(`/forum/t/${category.lastTopic.id}`)">{{ category.lastTopic.title }}</NuxtLink>
                    <p>{{ category.lastTopic.author }} · {{ date(category.lastPostAt) }}</p>
                  </template>
                  <p v-else>{{ t.emptySection }}</p>
                </div>
              </article>
            </div>

            <section class="forum-overview panel" :aria-label="t.statsTitle">
              <h2 class="forum-overview__title">{{ t.statsTitle }}</h2>
              <div class="forum-overview__nums">
                <p>
                  <b>{{ data.stats.topics }}</b>
                  <span>{{ t.topicsShort }}</span>
                </p>
                <p>
                  <b>{{ data.stats.posts }}</b>
                  <span>{{ t.postsShort }}</span>
                </p>
                <p>
                  <b>{{ data.stats.members }}</b>
                  <span>{{ t.membersShort }}</span>
                </p>
              </div>
              <dl v-if="data.stats.newest || data.stats.active" class="forum-overview__meta">
                <div v-if="data.stats.newest">
                  <dt>{{ t.newestMember }}</dt>
                  <dd>{{ data.stats.newest.name }}<template v-if="data.stats.newest.joinedAt"> · {{ date(data.stats.newest.joinedAt) }}</template></dd>
                </div>
                <div v-if="data.stats.active">
                  <dt>{{ t.mostActive }}</dt>
                  <dd>{{ data.stats.active.name }} · {{ fmt(t.memberPosts, { n: data.stats.active.posts }) }}</dd>
                </div>
              </dl>
              <div v-if="data.stats.names.length" class="forum-overview__people">
                <h3>{{ t.membersTitle }}</h3>
                <ul>
                  <li v-for="name in data.stats.names" :key="name">{{ name }}</li>
                </ul>
              </div>
              <p v-else class="forum-overview__empty">{{ t.noMembers }}</p>
            </section>
          </template>
        </template>
      </template>
    </div>
  </div>
</template>
