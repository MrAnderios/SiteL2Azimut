<script setup lang="ts">
const route = useRoute()
const localePath = useLocalePath()
const { t } = useForum()
</script>

<template>
  <p class="forum-login">
    {{ t.loginToPost }}
    <NuxtLink :to="{ path: localePath('/login'), query: { redirect: route.fullPath } }" class="cab-link">{{ t.login }}</NuxtLink>
  </p>
</template>
