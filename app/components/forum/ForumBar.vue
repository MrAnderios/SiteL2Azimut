<script setup lang="ts">
defineProps<{
  category?: string
}>()
</script>

<template>
  <div class="forum-bar">
    <ForumSearch :category="category" />
    <div class="forum-bar__end">
      <ForumUser />
      <slot />
    </div>
  </div>
</template>
