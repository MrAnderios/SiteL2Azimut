<script setup lang="ts">
import { streams } from '~/data/site'
import { parseStream, streamPlatformNames } from '~/utils/streams'

const t = useContent()

// Twitch пускает плеер только с доменов из parent — берём текущий хост, поэтому плееры только на клиенте
const host = ref('')
onMounted(() => {
  host.value = location.hostname
})

const players = computed(() => {
  if (!host.value)
    return []
  const seen = new Set<string>()
  return streams.flatMap((input) => {
    const embed = parseStream(input, host.value)
    if (!embed) {
      if (import.meta.dev)
        console.warn(`[streams] не удалось распознать стрим, см. docs/STREAMS.md: ${input}`)
      return []
    }
    if (seen.has(embed.src))
      return []
    seen.add(embed.src)
    return [{ ...embed, title: `${streamPlatformNames[embed.platform]} — ${embed.name}` }]
  })
})
</script>

<template>
  <section id="streams" class="streams">
    <div class="container">
      <div v-reveal class="streams__card panel">
        <div class="streams__head">
          <div class="streams__icon">
            <UiIcon name="play" :size="32" />
            <span class="streams__live">Live</span>
          </div>
          <div>
            <h2 class="streams__title text-gold">{{ t.streams.title }}</h2>
            <p class="streams__text">{{ t.streams.text }}</p>
          </div>
        </div>
        <div v-if="players.length" class="streams__grid">
          <div v-for="player in players" :key="player.src" class="streams__player">
            <iframe
              :src="player.src"
              :title="player.title"
              loading="lazy"
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture; clipboard-write"
              allowfullscreen
              scrolling="no"
              frameborder="0"
            />
          </div>
        </div>
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
  flex-direction: column;
  gap: 32px;
  padding: 32px 40px;
  background:
    radial-gradient(ellipse at 0% 50%, rgb(226 171 63 / 0.12), transparent 60%),
    var(--color-surface);
}

.streams__head {
  display: flex;
  align-items: center;
  gap: 32px;
}

.streams__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr));
  gap: 24px;
}

.streams__player {
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border: 1px solid var(--color-line-strong);
  border-radius: 4px;
  background: #000;
}

.streams__player iframe {
  display: block;
  width: 100%;
  height: 100%;
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
    padding: 32px 24px;
  }

  .streams__head {
    flex-direction: column;
    text-align: center;
  }
}
</style>
