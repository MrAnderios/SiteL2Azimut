<script setup lang="ts">
import { links } from '~/data/site'

const t = useContent()
const modalOpen = ref(false)
</script>

<template>
  <section id="store" class="store">
    <div class="store__glow" aria-hidden="true" />
    <div class="container store__inner">
      <img v-reveal src="/images/coin.webp" alt="Coin of Luck" class="store__coin" width="2048" height="896" loading="lazy">
      <div v-reveal="120" class="store__content">
        <p class="store__eyebrow">{{ t.store.eyebrow }}</p>
        <h2 class="store__title text-gold">Coin of Luck</h2>
        <UiButton size="lg" aria-haspopup="dialog" @click="modalOpen = true">{{ t.store.buy }}</UiButton>
      </div>
    </div>

    <UiModal v-model:open="modalOpen" :title="t.store.modal.title" :close-label="t.store.modal.close">
      <p class="store__modal-intro">{{ t.store.modal.intro }}</p>

      <section class="store__modal-section">
        <h3 class="store__modal-heading">{{ t.store.modal.priceHeading }}</h3>
        <ul class="list-diamond store__modal-list">
          <li v-for="item in t.store.modal.price" :key="item">{{ item }}</li>
        </ul>
      </section>

      <section class="store__modal-section">
        <h3 class="store__modal-heading">{{ t.store.modal.bonusesHeading }}</h3>
        <ul class="list-diamond store__modal-list">
          <li v-for="item in t.store.modal.bonuses" :key="item">{{ item }}</li>
        </ul>
      </section>

      <section class="store__modal-section">
        <h3 class="store__modal-heading">{{ t.store.modal.paymentHeading }}</h3>
        <p>{{ t.store.modal.paymentNote }}</p>
        <div class="store__modal-actions">
          <UiButton :href="links.payment" icon="telegram">{{ t.store.modal.paymentRu }}</UiButton>
          <UiButton :href="links.payment" icon="telegram" variant="secondary">{{ t.store.modal.paymentVisa }}</UiButton>
        </div>
      </section>
    </UiModal>
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

.store__modal-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 20px;
  border-top: 1px solid var(--color-line);
}

.store__modal-heading {
  color: var(--gold-300);
  font-size: 22px;
}

.store__modal-list {
  gap: 8px;
  font-size: 15px;
}

.store__modal-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 4px;
}
</style>
