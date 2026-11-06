<script setup lang="ts">
import { links } from '~/data/site'
</script>

<template>
  <section id="store" class="store">
    <div class="store__glow" aria-hidden="true" />
    <div class="container store__inner">
      <img v-reveal src="/images/coin.webp" alt="Coin of Luck" class="store__coin" width="2048" height="896" loading="lazy">
      <div v-reveal="120" class="store__content">
        <p class="store__eyebrow">Магазин</p>
        <h2 class="store__title text-gold">Coin of Luck</h2>
        <UiButton :href="links.store" size="lg">Купить Coin of Luck</UiButton>
      </div>
    </div>
  </section>
</template>

<style scoped>
.store {
  position: relative;
  padding-block: calc(var(--section-gap) / 2);
  overflow: hidden;
}

.store__glow {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 40% 50% at 50% 40%, rgb(226 171 63 / 0.18), transparent 70%),
    linear-gradient(180deg, transparent, rgb(226 171 63 / 0.04), transparent);
}

.store__inner {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.store__coin {
  width: 100%;
  max-width: 560px;
  height: auto;
  margin-block: -40px 8px;
  filter: drop-shadow(0 20px 40px rgb(0 0 0 / 0.7));
  animation: float 6s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { translate: 0 0; }
  50% { translate: 0 -12px; }
}

.store__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.store__eyebrow {
  color: var(--gold-500);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.32em;
  text-transform: uppercase;
}

.store__title {
  margin-top: -8px;
  font-size: clamp(40px, 6vw, 64px);
}
</style>
