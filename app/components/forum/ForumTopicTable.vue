<script setup lang="ts">
import type { ForumCategorySlug, ForumTopicListItem } from '#shared/forum'

defineProps<{
  topics: readonly (ForumTopicListItem & { slug?: ForumCategorySlug })[]
  /** В поиске по всему форуму у строки виден раздел. */
  showCategory?: boolean
}>()

const { t } = useForum()
</script>

<template>
  <div class="forum-table panel">
    <div class="forum-table__head">
      <span>{{ t.topic }}</span>
      <span>{{ t.repliesShort }}</span>
      <span>{{ t.lastPost }}</span>
    </div>
    <ul class="forum-rows">
      <ForumTopicRow
        v-for="topic in topics"
        :key="topic.id"
        :topic="topic"
        :category="showCategory ? topic.slug : undefined"
      />
    </ul>
  </div>
</template>
