<script setup lang="ts">
defineProps<{
  /** null — на экране «загрузка», объект ошибки — текст и повтор. */
  error: unknown
}>()

defineEmits<{ retry: [] }>()

const { t, errorText } = useForum()
</script>

<template>
  <p v-if="error" class="cab-note cab-note--error">
    {{ errorText(error) }}
    <button type="button" class="forum-text-btn" @click="$emit('retry')">{{ t.retry }}</button>
  </p>
  <p v-else class="forum-hint">{{ t.loading }}</p>
</template>
