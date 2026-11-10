<script setup lang="ts">
// Компактный статус игрового сервера (доступность + игроки онлайн) из /api/status.
// Формат ответа — docs/API.md. Грузится только в браузере и обновляется раз в минуту.

interface ServerStatus {
  server: string
  online: boolean
  status: 'online' | 'offline'
  playersOnline: number | null
  updatedAt: string
}

const POLL_MS = 60_000

const t = useContent()
const { locale } = useI18n()
const apiBase = useRuntimeConfig().public.statsApiBase as string

const { data: status, error, refresh } = useFetch<ServerStatus>('/api/status', {
  baseURL: apiBase,
  server: false,
  lazy: true,
})

let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  timer = setInterval(() => {
    if (document.visibilityState === 'visible') refresh()
  }, POLL_MS)
})
onBeforeUnmount(() => clearInterval(timer))

const number = computed(() => new Intl.NumberFormat(locale.value))

/** null — статус ещё не загружен или запрос упал. */
const online = computed(() => status.value?.online ?? null)

const playersLabel = computed(() => {
  const s = status.value
  if (!s) return error.value ? t.value.stats.unknown : '…'
  if (s.playersOnline === null) return t.value.stats.unknown
  return number.value.format(s.playersOnline)
})
</script>

<template>
  <div class="server-status" aria-live="polite">
    <div class="server-status__item">
      <span class="server-status__label">{{ t.stats.status }}</span>
      <span
        class="server-status__badge"
        :class="{ 'is-online': online === true, 'is-offline': online === false }"
      >
        <span class="server-status__dot" aria-hidden="true" />
        <template v-if="online === null">{{ error ? t.stats.unknown : '…' }}</template>
        <template v-else>{{ online ? t.stats.online : t.stats.offline }}</template>
      </span>
    </div>
    <span class="server-status__sep" aria-hidden="true" />
    <div class="server-status__item">
      <span class="server-status__label">{{ t.stats.playersOnline }}</span>
      <span class="server-status__value">{{ playersLabel }}</span>
    </div>
  </div>
</template>

<style scoped>
.server-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: clamp(20px, 5vw, 48px);
}

.server-status__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.server-status__label {
  color: var(--color-text-muted);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.25em;
  text-transform: uppercase;
}

.server-status__badge,
.server-status__value {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-heading);
  font-size: clamp(26px, 5vw, 40px);
  font-weight: 700;
  line-height: 1;
}

.server-status__badge {
  color: var(--color-text-muted);
}

.server-status__badge.is-online {
  color: #7fd98a;
}

.server-status__badge.is-offline {
  color: #e07a6a;
}

.server-status__value {
  color: var(--gold-300);
  font-variant-numeric: tabular-nums;
  text-shadow: 0 0 24px rgb(226 171 63 / 0.35);
}

.server-status__dot {
  flex: none;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 12px currentColor;
}

.is-online .server-status__dot {
  animation: server-status-pulse 2s ease-in-out infinite;
}

@keyframes server-status-pulse {
  50% { opacity: 0.45; }
}

.server-status__sep {
  align-self: stretch;
  width: 1px;
  background: var(--color-line-strong);
}
</style>
