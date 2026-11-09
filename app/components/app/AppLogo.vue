<script setup lang="ts">
// Логотип-ссылка на главную — общий для шапки лендинга и шапки кабинета
const t = useContent()
const localePath = useLocalePath()
</script>

<template>
  <NuxtLink :to="localePath('/')" class="logo" :aria-label="t.header.homeAria">
    <img src="/images/logo.png" alt="Azimut" width="148" height="40">
  </NuxtLink>
</template>

<style scoped>
.logo img {
  display: block;
  height: 34px;
  width: auto;
}
</style>
