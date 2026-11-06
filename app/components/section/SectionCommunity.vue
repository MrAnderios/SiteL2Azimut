<script setup lang="ts">
import { banners, community, links } from '~/data/site'
</script>

<template>
  <section id="community" class="community">
    <div class="container">
      <div v-reveal class="community__card panel">
        <div class="community__content">
          <p class="community__eyebrow">Сообщество</p>
          <h2 class="community__title text-gold">{{ community.title }}</h2>
          <p class="community__text">{{ community.text }}</p>
        </div>
        <UiButton :href="links.telegram" size="lg" icon="telegram">Перейти в Telegram</UiButton>
      </div>

      <ul v-reveal="120" class="community__banners" aria-label="Мы в рейтингах серверов">
        <li v-for="banner in banners" :key="banner.href">
          <a :href="banner.href" target="_blank" rel="noopener" :title="banner.label">
            <img :src="banner.image" :alt="banner.label" loading="lazy">
          </a>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.community {
  padding-block: calc(var(--section-gap) / 2) 0;
}

.community__card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 40px;
  padding: clamp(32px, 5vw, 56px);
  background:
    radial-gradient(ellipse 50% 80% at 100% 50%, rgb(42 171 238 / 0.12), transparent 70%),
    radial-gradient(ellipse 50% 80% at 0% 0%, rgb(226 171 63 / 0.1), transparent 70%),
    var(--color-surface);
}

.community__content {
  max-width: 640px;
}

.community__eyebrow {
  color: var(--gold-500);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.32em;
  text-transform: uppercase;
}

.community__title {
  margin-top: 8px;
  font-size: clamp(32px, 4.5vw, 52px);
}

.community__text {
  margin-top: 16px;
  color: var(--color-text-muted);
}

.community__banners {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 20px;
  margin-top: 40px;
  list-style: none;
}

.community__banners img {
  height: 44px;
  width: auto;
  filter: grayscale(1) brightness(0.8);
  opacity: 0.6;
  transition: filter 0.3s, opacity 0.3s;
}

.community__banners a:hover img {
  filter: none;
  opacity: 1;
}

@media (max-width: 768px) {
  .community__card {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
