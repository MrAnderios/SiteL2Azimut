<script setup lang="ts">
import type { ForumSearchHit } from '#shared/forum'

defineProps<{
  query: string
  pending: boolean
  error: unknown
  topics?: ForumSearchHit[]
  showCategory?: boolean
}>()

defineEmits<{ retry: [] }>()

const { t } = useForum()
</script>

<template>
  <h2 class="forum-search__title">{{ fmt(t.searchTitle, { q: query }) }}</h2>
  <ForumStatus
    v-if="error || (pending && !topics)"
    :error="error"
    @retry="$emit('retry')"
  />
  <p v-else-if="topics && !topics.length" class="forum-hint">{{ t.searchEmpty }}</p>
  <ForumTopicTable v-else-if="topics" :topics="topics" :show-category="showCategory" />
</template>
