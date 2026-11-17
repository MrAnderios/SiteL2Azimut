<script setup lang="ts">
import type { ForumFormat } from '#shared/forum'
import { renderPost } from '~/utils/forum'

const props = defineProps<{
  body: string
  format: ForumFormat
}>()

// Пока текст тот же, markdown не разбирается заново — например, при наборе ответа.
const html = computed(() => renderPost(props.body, props.format))
</script>

<template>
  <div class="forum-post__body" v-html="html" />
</template>
