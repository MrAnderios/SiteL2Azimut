<script setup lang="ts">
import { links, startSteps } from '~/data/site'

const t = useContent()
const steps = startSteps.map(s => ({ ...s, href: s.key === 'register' ? useCabinetHref(s.href) : s.href }))
</script>

<template>
  <UiSection id="start" :eyebrow="t.start.eyebrow" :title="t.start.title" tone="dark">
    <ol class="start">
      <li v-for="(step, i) in steps" :key="step.key" v-reveal="i * 100" class="start__card panel panel--interactive">
        <div class="start__media">
          <img :src="step.image" alt="" width="800" height="800" loading="lazy">
          <span class="start__num">{{ String(i + 1).padStart(2, '0') }}</span>
        </div>
        <div class="start__body">
          <h3 class="start__title">{{ t.start.steps[step.key].title }}</h3>
          <p class="start__text">{{ t.start.steps[step.key].text }}</p>
          <UiButton :href="step.href" :variant="i === 0 ? 'primary' : 'secondary'" size="sm">
            {{ t.start.steps[step.key].action }}
          </UiButton>
        </div>
      </li>
    </ol>
    <p v-if="links.clientEn" class="start__extra">
      {{ t.start.clientEn.text }}
      <a :href="links.clientEn" target="_blank" rel="noopener noreferrer">{{ t.start.clientEn.action }}</a>
    </p>
  </UiSection>
</template>

<style scoped>
.start {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 20px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.start__card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.start__media {
  position: relative;
  aspect-ratio: 4 / 3;
  overflow: hidden;
}

.start__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.6s var(--ease-out);
}

.start__media::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, transparent 40%, var(--color-surface));
}

.start__card:hover .start__media img {
  transform: scale(1.06);
}

.start__num {
  position: absolute;
  z-index: 1;
  left: 20px;
  bottom: 4px;
  font-family: var(--font-heading);
  font-size: 56px;
  font-weight: 700;
  line-height: 1;
  color: transparent;
  -webkit-text-stroke: 1px var(--gold-300);
  opacity: 0.85;
}

.start__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  padding: 16px 20px 24px;
}

.start__title {
  color: var(--gold-100);
  font-size: 24px;
}

.start__text {
  flex: 1;
  margin-bottom: 8px;
  color: var(--color-text-muted);
  font-size: 14px;
}

.start__extra {
  margin: 24px 0 0;
  color: var(--color-text-muted);
  font-size: 14px;
  text-align: center;
}

.start__extra a {
  color: var(--gold-300);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.start__extra a:hover {
  color: var(--gold-100);
}

@media (max-width: 1024px) {
  .start {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .start {
    grid-template-columns: 1fr;
  }
}
</style>
