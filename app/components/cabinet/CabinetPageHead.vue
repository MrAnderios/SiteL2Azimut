<script setup lang="ts">
// Заголовок страницы кабинета: название, подпись и карточка с числом справа (баланс и т.п.)
defineProps<{
  title: string
  subtitle?: string
  statLabel?: string
  statValue?: string
}>()
</script>

<template>
  <div class="cab-head">
    <div>
      <h1 class="cab-head__title text-gold">{{ title }}</h1>
      <p v-if="subtitle" class="cab-head__subtitle">{{ subtitle }}</p>
    </div>
    <div v-if="statLabel" class="cab-head__stat panel">
      <span class="cab-head__stat-label">{{ statLabel }}</span>
      <span class="cab-head__stat-value">
        <img src="/images/coin.webp" alt="" width="28" height="28">
        {{ statValue }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.cab-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
}

.cab-head__title {
  font-size: clamp(34px, 5vw, 52px);
}

.cab-head__subtitle {
  margin-top: 8px;
  color: var(--color-text-muted);
}

.cab-head__stat {
  display: grid;
  gap: 4px;
  min-width: 220px;
  padding: 14px 22px;
}

.cab-head__stat-label {
  color: var(--color-text-muted);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.cab-head__stat-value {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--gold-300);
  font-family: var(--font-heading);
  font-size: 32px;
  font-weight: 700;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}

.cab-head__stat-value img {
  width: 28px;
  height: 28px;
}
</style>
