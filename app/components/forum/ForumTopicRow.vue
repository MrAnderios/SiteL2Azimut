<script setup lang="ts">
import type { ForumCategorySlug, ForumTopicListItem } from '#shared/forum'
import { forumTopicPages } from '#shared/forum'

const props = defineProps<{
  topic: ForumTopicListItem
  category?: ForumCategorySlug
}>()

const localePath = useLocalePath()
const { t, date } = useForum()

const start = computed(() => localePath(`/forum/t/${props.topic.id}`))
const last = computed(() => {
  const pages = forumTopicPages(props.topic.replies)
  const path = localePath(`/forum/t/${props.topic.id}`)
  return pages > 1 ? { path, query: { page: String(pages) } } : path
})
</script>

<template>
  <li class="forum-row" :class="{ 'is-closed': topic.closed }">
    <div class="forum-row__main">
      <p v-if="category" class="forum-row__section">
        <NuxtLink :to="localePath(`/forum/${category}`)">{{ t.categories[category].title }}</NuxtLink>
      </p>
      <h2 class="forum-row__title">
        <NuxtLink :to="start">{{ topic.title }}</NuxtLink>
        <span v-if="topic.pinned" class="forum-flag">{{ t.pinned }}</span>
        <span v-if="topic.closed" class="forum-flag">{{ t.closed }}</span>
      </h2>
      <p class="forum-row__meta">{{ topic.author }} · {{ date(topic.createdAt) }}</p>
    </div>
    <p class="forum-row__count">
      <span class="forum-row__num">{{ topic.replies }}</span>
      <span>{{ t.repliesShort }}</span>
    </p>
    <NuxtLink :to="last" class="forum-row__last">
      <span class="forum-row__who">{{ topic.lastAuthor }}</span>
      <span>{{ date(topic.lastPostAt) }}</span>
    </NuxtLink>
  </li>
</template>
