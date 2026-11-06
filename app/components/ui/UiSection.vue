<script setup lang="ts">
withDefaults(
  defineProps<{
    id?: string
    eyebrow?: string
    title?: string
    subtitle?: string
    tone?: 'default' | 'dark' | 'glow'
  }>(),
  { tone: 'default' },
)
</script>

<template>
  <section :id="id" class="section" :class="`section--${tone}`">
    <div class="container">
      <header v-if="title || subtitle" v-reveal class="section__header">
        <p v-if="eyebrow" class="section__eyebrow">{{ eyebrow }}</p>
        <h2 v-if="title" class="section__title text-gold">{{ title }}</h2>
        <UiOrnament v-if="title" class="section__ornament" />
        <p v-if="subtitle" class="section__subtitle">{{ subtitle }}</p>
      </header>
      <slot />
    </div>
  </section>
</template>

<style scoped>
.section {
  position: relative;
  padding-block: calc(var(--section-gap) / 2);
}

.section--dark {
  background: var(--color-bg-2);
  border-block: 1px solid var(--color-line);
}

.section--glow {
  background: radial-gradient(ellipse 60% 50% at 50% 50%, rgb(226 171 63 / 0.09), transparent 70%);
}

.section__header {
  margin-bottom: clamp(32px, 5vw, 56px);
  text-align: center;
}

.section__eyebrow {
  margin-bottom: 12px;
  color: var(--gold-500);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.32em;
  text-transform: uppercase;
}

.section__title {
  font-size: clamp(34px, 5vw, 56px);
}

.section__ornament {
  margin-top: 16px;
}

.section__subtitle {
  max-width: 680px;
  margin: 20px auto 0;
  color: var(--color-text-muted);
  font-size: 17px;
}
</style>
