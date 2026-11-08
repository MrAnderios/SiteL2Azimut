<script setup lang="ts">
// Карточка формы входа / регистрации по центру страницы
defineProps<{ title: string }>()
</script>

<template>
  <div class="cab-auth">
    <div class="cab-auth__card panel">
      <h1 class="cab-auth__title text-gold">{{ title }}</h1>
      <UiOrnament class="cab-auth__ornament" />
      <slot />
    </div>
  </div>
</template>

<style scoped>
.cab-auth {
  display: grid;
  place-items: center;
  min-height: calc(100vh - var(--header-height) - 200px);
}

.cab-auth__card {
  width: min(460px, 100%);
  padding: clamp(24px, 5vw, 40px);
}

.cab-auth__title {
  font-size: clamp(28px, 4vw, 38px);
  text-align: center;
}

.cab-auth__ornament {
  margin: 14px auto 24px;
}
</style>
