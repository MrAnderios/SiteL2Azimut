<script setup lang="ts">
import type { ForumCategorySummary } from '#shared/forum'

defineProps<{
  categories: ForumCategorySummary[]
}>()

const localePath = useLocalePath()
const { t, date } = useForum()
</script>

<template>
  <div class="forum-board panel">
    <div class="forum-board__head">
      <span>{{ t.section }}</span>
      <span>{{ t.topicsShort }}</span>
      <span>{{ t.postsShort }}</span>
      <span>{{ t.lastPost }}</span>
    </div>
    <article v-for="category in categories" :key="category.slug" class="forum-board__row">
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
          <p class="forum-board__kicker">{{ t.lastPost }}</p>
          <NuxtLink :to="localePath(`/forum/t/${category.lastTopic.id}`)">{{ category.lastTopic.title }}</NuxtLink>
          <p>{{ category.lastTopic.author }} · {{ date(category.lastPostAt) }}</p>
        </template>
        <p v-else>{{ t.emptySection }}</p>
      </div>
    </article>
  </div>
</template>
