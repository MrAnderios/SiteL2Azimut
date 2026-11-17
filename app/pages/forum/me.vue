<script setup lang="ts">
import type { ForumOwnPost, ForumOwnPosts } from '#shared/forum'

const localePath = useLocalePath()
const { t, cabinetEnabled, me, mePending, date } = useForum()
const { page } = useForumPage()

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
      <template v-else>
        <ForumNameForm v-if="me?.authenticated && !me.name" />
        <ForumBar />
        <p v-if="mePending && !me?.name" class="forum-hint">{{ t.loading }}</p>
        <ForumLogin v-else-if="!me?.authenticated" />
        <template v-else-if="me?.name">
          <ForumStatus
            v-if="error || (pending && !data)"
            :error="error"
            @retry="refresh()"
          />
          <p v-else-if="data && !data.posts.length" class="forum-hint">{{ t.myPostsEmpty }}</p>
          <ol v-else-if="data" class="forum__posts">
            <li v-for="post in data.posts" :key="post.id" class="forum-post panel" :class="{ 'is-hidden': post.hidden }">
              <div class="forum-post__side">
                <h2 class="forum-post__author">
                  <NuxtLink :to="postTo(post)">{{ post.topicTitle }}</NuxtLink>
                </h2>
                <span class="forum-post__meta">
                  <span class="forum-post__facts">
                    <NuxtLink class="forum-post__anchor" :to="localePath(`/forum/${post.slug}`)">{{ t.categories[post.slug].title }}</NuxtLink>
                    <span>{{ date(post.createdAt) }}</span>
                    <span v-if="post.editedAt" class="forum-post__mark">{{ t.edited }}</span>
                    <span v-if="post.hidden" class="forum-post__mark">{{ t.hidden }}</span>
                  </span>
                </span>
              </div>
              <div class="forum-post__main">
                <ForumPostBody :body="post.body" :format="post.format" />
              </div>
            </li>
          </ol>
          <ForumPager v-if="data" :page="data.page" :pages="data.pages" />
        </template>
      </template>
    </div>
  </div>
</template>
