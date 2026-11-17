<script setup lang="ts">
defineProps<{
  label: string
  icon: string
}>()
</script>

<template>
  <button type="button" class="forum-action" :aria-label="label" :data-tip="label">
    <UIcon :name="icon" aria-hidden="true" />
  </button>
</template>
