<script setup lang="ts">
const route = useRoute()
const localePath = useLocalePath()
const { t, me } = useForum()

const minePath = computed(() => localePath('/forum/me'))
const onMine = computed(() => route.path === minePath.value)
</script>

<template>
  <p v-if="me?.name" class="forum-user">
    <span>{{ t.youAre }}</span>
    <NuxtLink :to="minePath" :aria-current="onMine ? 'page' : undefined">{{ me.name }}</NuxtLink>
  </p>
</template>
