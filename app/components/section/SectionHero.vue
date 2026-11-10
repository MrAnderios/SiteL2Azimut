<script setup lang="ts">
import { launch, links, obt } from '~/data/site'

const t = useContent()

// Сервер стартовал: вместо таймера показываем статус и онлайн.
// Выставляется событием finish у таймера. Для дебага — поменять на ref(true).
const launched = ref(true)

// Детерминированные параметры искр — одинаковые на сервере и клиенте (без hydration mismatch)
const embers = Array.from({ length: 22 }, (_, i) => ({
  left: `${(i * 47 + 11) % 100}%`,
  size: `${2 + (i % 3)}px`,
  delay: `${((i * 0.83) % 8).toFixed(2)}s`,
  duration: `${7 + ((i * 37) % 7)}s`,
  drift: `${((i % 5) - 2) * 18}px`,
}))
</script>

<template>
  <section id="hero" class="hero">
    <div class="hero__bg" aria-hidden="true" />
    <div class="hero__embers" aria-hidden="true">
      <span
        v-for="(e, i) in embers"
        :key="i"
        :style="{ left: e.left, width: e.size, height: e.size, animationDelay: e.delay, animationDuration: e.duration, '--drift': e.drift }"
      />
    </div>

    <div class="container hero__inner">
      <p class="hero__eyebrow">Lineage II · Epilogue</p>
      <h1 class="hero__title text-gold">Azimut</h1>
      <UiOrnament class="hero__ornament" />
      <p class="hero__subtitle">{{ t.site.tagline }}</p>

      <div class="hero__actions">
        <UiButton href="#start" size="lg">{{ t.hero.play }}</UiButton>
        <UiButton :href="links.telegram" variant="secondary" size="lg" icon="telegram">Telegram</UiButton>
      </div>

      <div class="hero__launch">
        <template v-if="launched">
          <span class="hero__launch-date">{{ t.hero.opened }}</span>
          <AppServerStatus class="hero__countdown" />
        </template>
        <template v-else>
          <span class="hero__launch-label">{{ t.hero.countdownLabel }}</span>
          <UiCountdown :to="launch.date" :labels="t.countdown" class="hero__countdown" @finish="launched = true" />
        </template>
        <div class="hero__dates">
          <span class="hero__date">
            <span class="hero__date-label">{{ t.hero.obt }}</span>
            <time :datetime="obt.date">{{ t.hero.obtLabel }}</time>
          </span>
          <span class="hero__date hero__date--main">
            <span class="hero__date-label">{{ t.hero.launch }}</span>
            <time :datetime="launch.date">{{ t.hero.launchLabel }}</time>
          </span>
        </div>
      </div>
    </div>

    <a href="#rates" class="hero__scroll" :aria-label="t.hero.scrollAria">
      <UiIcon name="arrowDown" :size="20" />
    </a>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  display: grid;
  place-items: center;
  min-height: min(100svh, 980px);
  padding-block: calc(var(--header-height) + 48px) 96px;
  overflow: hidden;
  text-align: center;
}

/* Десктоп: hero ровно на высоту экрана (растёт, только если контент не влезает) */
@media (min-width: 1025px) {
  .hero {
    min-height: 100svh;
    padding-block: calc(var(--header-height) + 24px) 80px;
  }
}

.hero__bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 70% 60% at 50% 45%, transparent 0%, rgb(10 8 6 / 0.55) 60%, var(--color-bg) 100%),
    linear-gradient(to bottom, rgb(10 8 6 / 0.55) 0%, rgb(10 8 6 / 0.15) 35%, rgb(10 8 6 / 0.6) 75%, var(--color-bg) 100%),
    url('/images/hero-bg.jpg') center 30% / cover no-repeat;
  animation: hero-zoom 24s ease-out both;
}

@keyframes hero-zoom {
  from { transform: scale(1.12); }
  to { transform: scale(1); }
}

/* ---------- Искры ---------- */
.hero__embers {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.hero__embers span {
  position: absolute;
  bottom: -10px;
  border-radius: 50%;
  background: var(--gold-300);
  box-shadow: 0 0 6px 2px rgb(246 160 60 / 0.7);
  opacity: 0;
  animation: ember linear infinite;
}

@keyframes ember {
  0% { transform: translate(0, 0); opacity: 0; }
  10% { opacity: 0.9; }
  70% { opacity: 0.6; }
  100% { transform: translate(var(--drift), -85vh); opacity: 0; }
}

/* ---------- Контент ---------- */
.hero__inner {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: hero-in 1.2s var(--ease-out) both 0.2s;
}

@keyframes hero-in {
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: none; }
}

.hero__eyebrow {
  color: var(--gold-300);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.5em;
  text-transform: uppercase;
}

.hero__title {
  margin-top: 8px;
  font-size: clamp(72px, 15vw, 184px);
  line-height: 0.9;
  letter-spacing: 0.06em;
  filter: drop-shadow(0 6px 24px rgb(0 0 0 / 0.8)) drop-shadow(0 0 40px rgb(226 171 63 / 0.25));
}

.hero__ornament {
  margin-top: 20px;
}

.hero__subtitle {
  max-width: 520px;
  margin-top: 20px;
  color: var(--color-text);
  font-size: clamp(16px, 2vw, 19px);
  text-shadow: 0 2px 12px rgb(0 0 0 / 0.9);
}

.hero__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 16px;
  margin-top: 40px;
}

.hero__launch {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  margin-top: 48px;
  padding: 16px clamp(16px, 5vw, 48px);
  border-block: 1px solid var(--color-line-strong);
  background: linear-gradient(90deg, transparent, rgb(10 8 6 / 0.7), transparent);
}

.hero__launch-label {
  color: var(--color-text-muted);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.3em;
  text-transform: uppercase;
}

.hero__launch-date {
  color: var(--gold-300);
  font-family: var(--font-heading);
  font-size: 26px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.hero__countdown {
  margin-top: 12px;
}

.hero__dates {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px 28px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--color-line);
  color: var(--color-text);
  font-size: 14px;
  font-weight: 500;
}

.hero__date-label {
  margin-right: 8px;
  color: var(--color-text-muted);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.hero__date--main time {
  color: var(--gold-300);
}

.hero__scroll {
  position: absolute;
  bottom: 24px;
  left: 50%;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  margin-left: -20px;
  border: 1px solid var(--color-line-strong);
  border-radius: 50%;
  color: var(--gold-300);
  animation: bob 2.4s ease-in-out infinite;
}

@keyframes bob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(6px); }
}
</style>
