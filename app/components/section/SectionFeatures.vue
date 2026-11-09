<script setup lang="ts">
import { links } from '~/data/site'

const t = useContent()

type ModalKey = 'description' | 'bonuses'
const activeModal = ref<ModalKey | null>(null)
const modalOpen = computed({
  get: () => activeModal.value !== null,
  set: (value) => { if (!value) activeModal.value = null },
})
// Держим последний открытый контент, чтобы он не пропадал во время закрытия
const lastModal = ref<ModalKey>('description')
watch(activeModal, (key) => { if (key) lastModal.value = key })
const modal = computed(() => t.value.features.modals[lastModal.value])
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
          <span>{{ t.features.badge }}</span>
        </div>
      </div>

      <div v-reveal="120" class="features__content">
        <p class="features__eyebrow">{{ t.features.eyebrow }}</p>
        <h2 class="features__title text-gold">{{ t.features.title }}</h2>
        <p class="features__intro">{{ t.features.intro }}</p>
        <ul class="features__list list-diamond">
          <li v-for="item in t.features.list" :key="item">{{ item }}</li>
        </ul>
        <div class="features__actions">
          <UiButton variant="secondary" aria-haspopup="dialog" @click="activeModal = 'description'">{{ t.features.description }}</UiButton>
          <UiButton variant="secondary" aria-haspopup="dialog" @click="activeModal = 'bonuses'">{{ t.features.bonuses }}</UiButton>
        </div>
        <p class="features__more">
          {{ t.features.moreBefore }} <a :href="links.telegram" target="_blank" rel="noopener">{{ t.features.moreLink }}</a>{{ t.features.moreAfter }}
        </p>
      </div>
    </div>

    <UiModal v-model:open="modalOpen" :title="modal.title" :close-label="t.features.modalClose">
      <section v-for="(section, i) in modal.sections" :key="i" class="features__modal-section">
        <h3 v-if="section.heading" class="features__modal-heading">{{ section.heading }}</h3>
        <p v-for="(text, j) in section.text" :key="j">{{ text }}</p>
        <ul v-if="section.list.length" class="list-diamond features__modal-list">
          <li v-for="(item, j) in section.list" :key="j">{{ item }}</li>
        </ul>
      </section>
    </UiModal>
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

.features__modal-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.features__modal-section + .features__modal-section {
  padding-top: 20px;
  border-top: 1px solid var(--color-line);
}

.features__modal-heading {
  color: var(--gold-300);
  font-size: 22px;
}

.features__modal-list {
  gap: 8px;
  font-size: 15px;
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
