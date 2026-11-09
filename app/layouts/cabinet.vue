<script setup lang="ts">
const route = useRoute()
const notices = useNotices()

// Ошибки прошлой страницы при переходе не нужны; успешные уведомления исчезают сами
watch(() => route.path, () => {
  notices.list.value = notices.list.value.filter(n => n.type === 'success')
})
</script>

<template>
  <div class="cab-layout">
    <CabinetHeader />
    <main class="cab-layout__main container">
      <slot />
    </main>
    <AppFooter />
    <CabinetToasts />
  </div>
</template>

<style scoped>
.cab-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background:
    radial-gradient(ellipse 80% 40% at 50% 0%, rgb(226 171 63 / 0.08), transparent 70%),
    var(--color-bg);
}

.cab-layout__main {
  flex: 1;
  padding-top: calc(var(--header-height) + clamp(24px, 4vw, 48px));
  padding-bottom: 64px;
}
</style>
