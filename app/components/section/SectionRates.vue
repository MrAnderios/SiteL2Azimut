<script setup lang="ts">
import { rates, ratesIntro } from '~/data/site'
</script>

<template>
  <UiSection id="rates" eyebrow="Low Rate" title="Рейты сервера" :subtitle="ratesIntro">
    <ul class="rates">
      <li v-for="(rate, i) in rates" :key="rate.label" v-reveal="i * 80" class="rates__item panel panel--interactive">
        <div class="rates__medal">
          <img :src="rate.image" alt="" width="512" height="512" loading="lazy">
        </div>
        <span class="rates__value text-gold">{{ rate.value }}</span>
        <span class="rates__label">{{ rate.label }}</span>
      </li>
    </ul>
  </UiSection>
</template>

<style scoped>
.rates {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 20px;
  list-style: none;
}

.rates__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 28px 16px 24px;
  text-align: center;
}

.rates__medal {
  position: relative;
  width: 112px;
  aspect-ratio: 1;
  padding: 3px;
  border-radius: 50%;
  background: conic-gradient(from 210deg, var(--gold-700), var(--gold-100), var(--gold-500), var(--gold-900), var(--gold-700));
  box-shadow: 0 0 0 4px var(--color-surface), 0 0 0 5px var(--color-line), 0 8px 24px rgb(0 0 0 / 0.6);
  transition: box-shadow 0.3s;
}

.rates__medal img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.rates__item:hover .rates__medal {
  box-shadow: 0 0 0 4px var(--color-surface), 0 0 0 5px var(--color-line-strong), 0 0 32px rgb(226 171 63 / 0.4);
}

.rates__value {
  margin-top: 20px;
  font-family: var(--font-heading);
  font-size: 52px;
  font-weight: 700;
  line-height: 1;
}

.rates__label {
  margin-top: 8px;
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

@media (max-width: 960px) {
  .rates {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .rates {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .rates__medal {
    width: 88px;
  }

  .rates__value {
    font-size: 42px;
  }
}
</style>
