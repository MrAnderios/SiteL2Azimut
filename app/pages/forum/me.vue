<script setup lang="ts">
import type { ForumOwnPost, ForumOwnPosts } from '#shared/forum'

const route = useRoute()
const localePath = useLocalePath()
const { t, cabinetEnabled, me, mePending, date, errorText } = useForum()

const page = computed(() => {
  const n = Number(route.query.page)
  return Number.isInteger(n) && n > 0 ? n : 1
})

const { data, error, pending, refresh } = useFetch<ForumOwnPosts>('/api/forum/me/posts', {
  query: { page },
  immediate: cabinetEnabled,
  watch: [page],
})

const name = computed(() => data.value?.name || me.value?.name || '')

useHead(() => ({
  title: name.value ? `${name.value} — ${t.value.pageTitle}` : t.value.pageTitle,
}))
useSeoMeta({
  robots: 'noindex, nofollow',
})

function postTo(post: ForumOwnPost) {
  return {
    path: localePath(`/forum/t/${post.topicId}`),
    query: post.page > 1 ? { page: String(post.page) } : {},
    hash: `#p-${post.id}`,
  }
}
</script>

<template>
  <div class="forum">
    <div class="container">
      <header class="forum__head">
        <ForumUser />
        <p class="forum__crumbs">
          <NuxtLink :to="localePath('/forum')">{{ t.title }}</NuxtLink>
          <template v-if="name">
            <span>/</span>
            <span>{{ name }}</span>
          </template>
        </p>
        <h1 class="forum__title text-gold">{{ name || t.title }}</h1>
        <p v-if="data?.name" class="forum__lead">
          {{ t.myPosts }}
          <template v-if="data.total"> · {{ fmt(t.memberPosts, { n: data.total }) }}</template>
        </p>
      </header>

      <p v-if="!cabinetEnabled" class="cab-note">{{ t.unavailable }}</p>
      <ForumNameForm v-else-if="me?.authenticated && !me.name" />
      <p v-else-if="mePending && !me?.name" class="forum-hint">{{ t.loading }}</p>
      <p v-else-if="!me?.authenticated" class="forum-login">
        {{ t.loginToPost }}
        <NuxtLink :to="{ path: localePath('/login'), query: { redirect: route.fullPath } }" class="cab-link">{{ t.login }}</NuxtLink>
      </p>
      <template v-else-if="me?.name">
        <p v-if="error" class="cab-note cab-note--error">
          {{ errorText(error) }}
          <button type="button" class="forum-text-btn" @click="() => refresh()">{{ t.retry }}</button>
        </p>
        <p v-else-if="pending && !data" class="forum-hint">{{ t.loading }}</p>
        <p v-else-if="data && !data.posts.length" class="forum-hint">{{ t.myPostsEmpty }}</p>
        <ol v-else-if="data" class="forum__posts">
          <li v-for="post in data.posts" :key="post.id" class="forum-mine panel">
            <p class="forum-mine__meta">
              <NuxtLink :to="localePath(`/forum/${post.slug}`)">{{ t.categories[post.slug].title }}</NuxtLink>
              <span>· {{ date(post.createdAt) }}</span>
              <template v-if="post.editedAt"> · {{ t.edited }}</template>
              <template v-if="post.hidden"> · {{ t.hidden }}</template>
            </p>
            <h2 class="forum-mine__title">
              <NuxtLink :to="postTo(post)">{{ post.topicTitle }}</NuxtLink>
            </h2>
            <div class="forum-post__body" v-html="renderPost(post.body, post.format)" />
          </li>
        </ol>
        <ForumPager v-if="data" :page="data.page" :pages="data.pages" />
      </template>
    </div>
  </div>
</template>
