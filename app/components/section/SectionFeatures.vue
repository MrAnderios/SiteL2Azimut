<script setup lang="ts">
import { features, links } from '~/data/site'
</script>

<template>
  <UiSection id="features" tone="dark">
    <div class="features">
      <div v-reveal class="features__media">
        <div class="features__frame panel">
          <img src="/images/features.jpg" alt="" width="1024" height="1024" loading="lazy">
        </div>
        <div class="features__badge">
          <UiIcon name="globe" :size="22" />
          <span>Мероприятия под разные часовые пояса</span>
        </div>
      </div>

      <div v-reveal="120" class="features__content">
        <p class="features__eyebrow">Особенности</p>
        <h2 class="features__title text-gold">{{ features.title }}</h2>
        <p class="features__intro">{{ features.intro }}</p>
        <ul class="features__list list-diamond">
          <li v-for="item in features.list" :key="item">{{ item }}</li>
        </ul>
        <p class="features__more">
          Подробнее — в нашем <a :href="links.telegram" target="_blank" rel="noopener">Telegram-канале</a>.
        </p>
        <div class="features__actions">
          <UiButton :href="links.telegramDescription" variant="secondary">Описание</UiButton>
          <UiButton :href="links.telegramBonuses" variant="secondary">Бонусы</UiButton>
        </div>
      </div>
    </div>
  </UiSection>
</template>

<style scoped>
.features {
  display: grid;
  grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
  align-items: center;
  gap: clamp(40px, 6vw, 80px);
}

.features__media {
  position: relative;
}

.features__frame {
  padding: 10px;
  box-shadow: 0 30px 60px rgb(0 0 0 / 0.6), 0 0 80px rgb(226 171 63 / 0.12);
}

.features__frame img {
  width: 100%;
  height: auto;
  border-radius: 2px;
}

.features__badge {
  position: absolute;
  right: -16px;
  bottom: 32px;
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 240px;
  padding: 14px 18px;
  background: rgb(10 8 6 / 0.92);
  border: 1px solid var(--color-line-strong);
  color: var(--gold-300);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.3;
  backdrop-filter: blur(6px);
}

.features__badge span {
  color: var(--color-text);
}

.features__content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.features__eyebrow {
  color: var(--gold-500);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.32em;
  text-transform: uppercase;
}

.features__title {
  font-size: clamp(34px, 4.5vw, 52px);
}

.features__intro,
.features__more {
  color: var(--color-text-muted);
}

.features__list {
  margin-block: 4px;
}

.features__more a {
  color: var(--gold-300);
  border-bottom: 1px solid var(--color-line-strong);
}

.features__more a:hover {
  color: var(--gold-100);
}

.features__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

@media (max-width: 900px) {
  .features {
    grid-template-columns: 1fr;
  }

  .features__media {
    max-width: 480px;
    margin-inline: auto;
  }

  .features__badge {
    right: 8px;
  }
}
</style>
