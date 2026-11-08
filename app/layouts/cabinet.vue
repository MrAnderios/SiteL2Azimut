<script setup lang="ts">
const route = useRoute()
const notices = useNotices()
const content = useContent()

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
    <footer class="cab-layout__footer container">
      © Azimut · {{ content.footer.copyright }}
    </footer>
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

.cab-layout__footer {
  padding-block: 24px;
  border-top: 1px solid var(--color-line);
  color: var(--color-text-muted);
  font-size: 12px;
  text-align: center;
}
</style>
