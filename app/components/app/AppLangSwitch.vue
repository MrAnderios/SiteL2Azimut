<script setup lang="ts">
// Переключатель языка — общий для шапки лендинга и шапки кабинета
const t = useContent()
const { locale, locales } = useI18n()
const switchLocalePath = useSwitchLocalePath()
</script>

<template>
  <div class="lang" role="group" :aria-label="t.header.langAria">
    <NuxtLink
      v-for="l in locales"
      :key="l.code"
      :to="switchLocalePath(l.code)"
      :hreflang="l.language"
      :lang="l.code"
      :title="l.name"
      :aria-current="l.code === locale ? 'true' : undefined"
      :class="{ 'is-active': l.code === locale }"
    >
      {{ l.code }}
    </NuxtLink>
  </div>
</template>

<style scoped>
.lang {
  display: flex;
  align-items: center;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.lang a {
  padding: 6px;
  color: var(--color-text-muted);
  transition: color 0.2s;
}

.lang a + a {
  border-left: 1px solid var(--color-line-strong);
}

.lang a:hover,
.lang a.is-active {
  color: var(--gold-300);
}
</style>
