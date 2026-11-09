<script setup lang="ts">
// Статистика сервера: статус и онлайн (/api/status) и топ игроков (/api/top). Формат ответов — docs/API.md.
// Данные грузятся в браузере: в статической сборке нет бэкенда, а цифры должны быть свежими.

interface ServerStatus {
  server: string
  online: boolean
  status: 'online' | 'offline'
  playersOnline: number | null
  updatedAt: string
}

type TopType = 'level' | 'pvp' | 'pk'

interface TopPlayer {
  rank: number
  name: string
  level: number
  exp: number
  classId: number
  className: string
  pvp: number
  pk: number
  online: boolean
}

interface TopResponse {
  type: TopType
  limit: number
  updatedAt: string
  players: TopPlayer[]
}

const TOP_LIMIT = 20
const STATUS_POLL_MS = 60_000
const topTypes: TopType[] = ['level', 'pvp', 'pk']

const t = useContent()
const { locale } = useI18n()
const apiBase = useRuntimeConfig().public.statsApiBase as string

useHead(() => ({ title: t.value.stats.pageTitle }))
useSeoMeta({
  description: () => t.value.stats.description,
  ogTitle: () => t.value.stats.pageTitle,
  ogDescription: () => t.value.stats.description,
})

const topType = ref<TopType>('level')

const { data: status, error: statusError, refresh: refreshStatus } = useFetch<ServerStatus>('/api/status', {
  baseURL: apiBase,
  server: false,
  lazy: true,
})

const { data: top, error: topError, pending: topPending, refresh: refreshTop } = useFetch<TopResponse>('/api/top', {
  baseURL: apiBase,
  query: { type: topType, limit: TOP_LIMIT },
  server: false,
  lazy: true,
})

let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  timer = setInterval(() => {
    if (document.visibilityState === 'visible') refreshStatus()
  }, STATUS_POLL_MS)
})
onBeforeUnmount(() => clearInterval(timer))

const number = computed(() => new Intl.NumberFormat(locale.value))
const time = computed(() => new Intl.DateTimeFormat(locale.value, { hour: '2-digit', minute: '2-digit', second: '2-digit' }))

const updatedLabel = computed(() => status.value
  ? t.value.stats.updated.replace('{time}', time.value.format(new Date(status.value.updatedAt)))
  : '')

const playersLabel = computed(() => {
  const s = status.value
  if (!s) return '…'
  if (!s.online || s.playersOnline === null) return t.value.stats.unknown
  return number.value.format(s.playersOnline)
})

/** Колонка, по которой построен текущий топ, — её подсвечиваем. */
function isSorted(col: TopType) {
  return topType.value === col
}
</script>

<template>
  <div class="stats">
    <UiSection :eyebrow="t.stats.eyebrow" :title="t.stats.title" tone="glow">
      <!-- Статус сервера -->
      <div v-reveal class="stats__status">
        <div class="stats__card panel">
          <span class="stats__label">{{ t.stats.server }}</span>
          <span class="stats__value text-gold">{{ status?.server ?? 'Azimut' }}</span>
        </div>
        <div class="stats__card panel">
          <span class="stats__label">{{ t.stats.status }}</span>
          <span v-if="status" class="stats__badge" :class="status.online ? 'is-online' : 'is-offline'">
            <span class="stats__dot" aria-hidden="true" />
            {{ status.online ? t.stats.online : t.stats.offline }}
          </span>
          <span v-else class="stats__value stats__value--muted">…</span>
        </div>
        <div class="stats__card panel">
          <span class="stats__label">{{ t.stats.playersOnline }}</span>
          <span class="stats__value text-gold">{{ playersLabel }}</span>
        </div>
      </div>

      <p v-if="statusError" class="stats__note stats__note--error">
        {{ t.stats.error }}
        <button type="button" class="stats__retry" @click="() => refreshStatus()">{{ t.stats.retry }}</button>
      </p>
      <p v-else-if="status" class="stats__note">{{ updatedLabel }}</p>

      <!-- Топ игроков -->
      <div v-reveal="120" class="stats__top panel">
        <div class="stats__top-head">
          <h2 class="stats__top-title text-gold">{{ t.stats.topTitle }}</h2>
          <div class="stats__tabs" role="tablist" :aria-label="t.stats.tabsAria">
            <button
              v-for="type in topTypes"
              :key="type"
              type="button"
              role="tab"
              class="stats__tab"
              :class="{ 'is-active': topType === type }"
              :aria-selected="topType === type"
              @click="topType = type"
            >
              {{ t.stats.tabs[type] }}
            </button>
          </div>
        </div>

        <div v-if="topError" class="stats__placeholder">
          {{ t.stats.error }}
          <button type="button" class="stats__retry" @click="() => refreshTop()">{{ t.stats.retry }}</button>
        </div>
        <div v-else-if="!top && topPending" class="stats__placeholder">{{ t.stats.loading }}</div>
        <div v-else-if="top && !top.players.length" class="stats__placeholder">{{ t.stats.empty }}</div>

        <div v-else-if="top" class="stats__table-wrap" :class="{ 'is-pending': topPending }">
          <table class="stats__table">
            <thead>
              <tr>
                <th class="stats__rank" scope="col">{{ t.stats.rank }}</th>
                <th scope="col">{{ t.stats.name }}</th>
                <th class="stats__hide-sm" scope="col">{{ t.stats.class }}</th>
                <th class="stats__num" :class="{ 'is-sorted': isSorted('level') }" scope="col">{{ t.stats.level }}</th>
                <th class="stats__num" :class="{ 'is-sorted': isSorted('pvp') }" scope="col">{{ t.stats.pvp }}</th>
                <th class="stats__num" :class="{ 'is-sorted': isSorted('pk') }" scope="col">{{ t.stats.pk }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in top.players" :key="p.name" :class="{ 'is-podium': p.rank <= 3 }">
                <td class="stats__rank">
                  <span class="stats__place" :class="`stats__place--${p.rank}`">{{ p.rank }}</span>
                </td>
                <td>
                  <span class="stats__name">
                    {{ p.name }}
                    <span v-if="p.online" class="stats__dot stats__dot--sm" :title="t.stats.inGame">
                      <span class="visually-hidden">{{ t.stats.inGame }}</span>
                    </span>
                  </span>
                  <span class="stats__class-sm">{{ p.className }}</span>
                </td>
                <td class="stats__hide-sm stats__class">{{ p.className }}</td>
                <td class="stats__num" :class="{ 'is-sorted': isSorted('level') }">{{ p.level }}</td>
                <td class="stats__num" :class="{ 'is-sorted': isSorted('pvp') }">{{ number.format(p.pvp) }}</td>
                <td class="stats__num" :class="{ 'is-sorted': isSorted('pk') }">{{ number.format(p.pk) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </UiSection>
  </div>
</template>

<style scoped>
.stats {
  padding-top: var(--header-height);
}

.stats__status {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
}

.stats__card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 28px 16px;
  text-align: center;
}

.stats__label {
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.24em;
  text-transform: uppercase;
}

.stats__value {
  font-family: var(--font-heading);
  font-size: clamp(32px, 4vw, 44px);
  font-weight: 700;
  line-height: 1.1;
}

.stats__value--muted {
  color: var(--color-text-muted);
}

.stats__badge {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-heading);
  font-size: clamp(28px, 3.5vw, 38px);
  font-weight: 700;
  line-height: 1.1;
}

.stats__badge.is-online {
  color: #7fd98a;
}

.stats__badge.is-offline {
  color: #e07a6a;
}

.stats__dot {
  display: inline-block;
  flex: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 12px currentColor;
}

.is-online .stats__dot {
  animation: pulse 2s ease-in-out infinite;
}

.stats__dot--sm {
  width: 8px;
  height: 8px;
  color: #7fd98a;
  box-shadow: 0 0 8px currentColor;
}

@keyframes pulse {
  50% { opacity: 0.45; }
}

.stats__note {
  margin-top: 14px;
  color: var(--color-text-muted);
  font-size: 13px;
  text-align: center;
}

.stats__note--error {
  color: #e07a6a;
}

.stats__retry {
  margin-left: 8px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--gold-300);
  font: inherit;
  text-decoration: underline;
  cursor: pointer;
}

.stats__top {
  margin-top: 48px;
  padding: 28px clamp(16px, 3vw, 32px) 20px;
}

.stats__top-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.stats__top-title {
  font-size: clamp(28px, 3.5vw, 38px);
}

.stats__tabs {
  display: flex;
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius);
}

.stats__tab {
  padding: 8px 16px;
  border: 0;
  background: none;
  color: var(--color-text-muted);
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  cursor: pointer;
  transition: color 0.2s, background-color 0.2s;
}

.stats__tab + .stats__tab {
  border-left: 1px solid var(--color-line-strong);
}

.stats__tab:hover {
  color: var(--gold-300);
}

.stats__tab.is-active {
  background: rgb(226 171 63 / 0.14);
  color: var(--gold-300);
}

.stats__placeholder {
  padding: 48px 16px;
  color: var(--color-text-muted);
  text-align: center;
}

.stats__table-wrap {
  overflow-x: auto;
  transition: opacity 0.2s;
}

.stats__table-wrap.is-pending {
  opacity: 0.5;
}

.stats__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 15px;
}

.stats__table th {
  padding: 10px 12px;
  border-bottom: 1px solid var(--color-line-strong);
  color: var(--color-text-muted);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-align: left;
  text-transform: uppercase;
  white-space: nowrap;
}

.stats__table td {
  padding: 12px;
  border-bottom: 1px solid var(--color-line);
}

.stats__table tbody tr:last-child td {
  border-bottom: 0;
}

.stats__table tbody tr {
  transition: background-color 0.2s;
}

.stats__table tbody tr:hover {
  background: rgb(226 171 63 / 0.05);
}

.stats__table .stats__num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.stats__table th.is-sorted {
  color: var(--gold-300);
}

.stats__table td.is-sorted {
  color: var(--gold-100);
  font-weight: 600;
}

.stats__rank {
  width: 56px;
}

.stats__place {
  display: inline-grid;
  place-items: center;
  min-width: 28px;
  height: 28px;
  color: var(--color-text-muted);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.stats__place--1,
.stats__place--2,
.stats__place--3 {
  border-radius: 50%;
  color: #1a1206;
  font-weight: 700;
}

.stats__place--1 { background: var(--gradient-gold-btn); box-shadow: 0 0 12px rgb(226 171 63 / 0.5); }
.stats__place--2 { background: linear-gradient(180deg, #f1f1f1, #9a9a9a); }
.stats__place--3 { background: linear-gradient(180deg, #e6a877, #8a5129); }

.stats__name {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.is-podium .stats__name {
  color: var(--gold-300);
}

.stats__class {
  color: var(--color-text-muted);
}

.stats__class-sm {
  display: none;
  color: var(--color-text-muted);
  font-size: 13px;
}

@media (max-width: 768px) {
  .stats__status {
    grid-template-columns: 1fr 1fr;
  }

  .stats__status .stats__card:first-child {
    grid-column: 1 / -1;
  }

  .stats__hide-sm {
    display: none;
  }

  .stats__class-sm {
    display: block;
  }

  .stats__table {
    font-size: 14px;
  }

  .stats__table th,
  .stats__table td {
    padding: 10px 6px;
  }

  .stats__rank {
    width: 40px;
  }
}
</style>
