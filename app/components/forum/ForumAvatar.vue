<script setup lang="ts">
const props = defineProps<{
  name: string
  src: string | null
  size?: 'sm' | 'md'
}>()

const failed = ref(false)
const letter = computed(() => {
  const ch = props.name.trim().charAt(0)
  return ch ? ch.toLocaleUpperCase() : '?'
})

watch(() => props.src, () => {
  failed.value = false
})
</script>

<template>
  <span class="forum-avatar" :class="{ 'forum-avatar--sm': size === 'sm' }" aria-hidden="true">
    <img v-if="src && !failed" :src="src" alt="" @error="failed = true">
    <span v-else>{{ letter }}</span>
  </span>
</template>
