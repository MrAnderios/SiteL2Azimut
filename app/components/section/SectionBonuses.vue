<script setup lang="ts">
import { bonuses, links, stability } from '~/data/site'
</script>

<!-- Бонусы и стабильность — две колонки в одном ряду -->
<template>
  <section id="bonuses" class="perks">
    <div class="container perks__grid">
      <div v-reveal class="perks__col">
        <h2 class="perks__title text-gold">Бонусы</h2>
        <ul class="perks__list">
          <li v-for="item in bonuses" :key="item.title" class="perks__item panel panel--interactive">
            <span class="perks__icon"><UiIcon :name="item.icon" /></span>
            {{ item.title }}
          </li>
        </ul>
        <UiButton :href="links.telegramBonuses" variant="ghost" size="sm">Подробнее →</UiButton>
      </div>

      <div id="stability" v-reveal="120" class="perks__col">
        <h2 class="perks__title text-gold">{{ stability.title }}</h2>
        <ul class="perks__list">
          <li v-for="item in stability.items" :key="item.title" class="perks__item panel panel--interactive">
            <span class="perks__icon"><UiIcon :name="item.icon" /></span>
            {{ item.title }}
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<style scoped>
.perks {
  padding-block: calc(var(--section-gap) / 2);
}

.perks__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(32px, 5vw, 64px);
}

.perks__col {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 20px;
}

.perks__title {
  font-size: clamp(30px, 3.5vw, 40px);
}

.perks__list {
  display: grid;
  gap: 12px;
  width: 100%;
  list-style: none;
}

.perks__item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 20px;
  font-weight: 600;
}

.perks__icon {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 1px solid var(--color-line-strong);
  color: var(--gold-300);
  transform: rotate(45deg);
}

.perks__icon :deep(svg) {
  transform: rotate(-45deg);
}

@media (max-width: 768px) {
  .perks__grid {
    grid-template-columns: 1fr;
  }
}
</style>
