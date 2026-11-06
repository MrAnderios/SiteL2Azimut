<script setup lang="ts">
import { streams } from '~/data/site'
</script>

<template>
  <section id="streams" class="streams">
    <div class="container">
      <div v-reveal class="streams__card panel">
        <div class="streams__icon">
          <UiIcon name="play" :size="32" />
          <span class="streams__live">Live</span>
        </div>
        <div>
          <h2 class="streams__title text-gold">{{ streams.title }}</h2>
          <p class="streams__text">{{ streams.text }}</p>
        </div>
        <!-- TODO: список/встраивание стримов -->
      </div>
    </div>
  </section>
</template>

<style scoped>
.streams {
  padding-block: calc(var(--section-gap) / 4);
}

.streams__card {
  display: flex;
  align-items: center;
  gap: 32px;
  padding: 32px 40px;
  background:
    radial-gradient(ellipse at 0% 50%, rgb(226 171 63 / 0.12), transparent 60%),
    var(--color-surface);
}

.streams__icon {
  position: relative;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 80px;
  height: 80px;
  border: 1px solid var(--color-line-strong);
  border-radius: 50%;
  color: var(--gold-300);
  box-shadow: inset 0 0 24px rgb(226 171 63 / 0.15);
}

.streams__live {
  position: absolute;
  bottom: -8px;
  padding: 2px 8px;
  border-radius: 2px;
  background: #b3261e;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  50% { box-shadow: 0 0 0 6px rgb(179 38 30 / 0); }
  0%, 100% { box-shadow: 0 0 0 0 rgb(179 38 30 / 0.6); }
}

.streams__title {
  font-size: clamp(28px, 3.5vw, 38px);
}

.streams__text {
  max-width: 640px;
  margin-top: 8px;
  color: var(--color-text-muted);
}

@media (max-width: 640px) {
  .streams__card {
    flex-direction: column;
    padding: 32px 24px;
    text-align: center;
  }
}
</style>
