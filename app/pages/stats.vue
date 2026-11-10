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

interface Castle {
  id: number
  name: string
  owner: string | null
  ally: string | null
  leader: string | null
  tax: number
  siegeAt: string | null
}

interface CastlesResponse {
  updatedAt: string
  castles: Castle[]
}

interface Hero {
  name: string
  level: number
  classId: number
  className: string
  clan: string | null
  ally: string | null
  online: boolean
  count: number
}

interface HeroesResponse {
  updatedAt: string
  heroes: Hero[]
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

const { data: castles, error: castlesError, pending: castlesPending, refresh: refreshCastles } = useFetch<CastlesResponse>('/api/castles', {
  baseURL: apiBase,
  server: false,
  lazy: true,
})

const { data: heroes, error: heroesError, pending: heroesPending, refresh: refreshHeroes } = useFetch<HeroesResponse>('/api/heroes', {
  baseURL: apiBase,
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
const dateTime = computed(() => new Intl.DateTimeFormat(locale.value, {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
}))

// Картинки замков лежат в public/images/castles/<id>.jpg (id как в API: 1 — Gludio … 9 — Schuttgart)
const CASTLE_IMAGE_IDS = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9])

function castleImage(id: number) {
  return CASTLE_IMAGE_IDS.has(id) ? `/images/castles/${id}.jpg` : undefined
}

function siegeLabel(c: Castle) {
  return c.siegeAt ? dateTime.value.format(new Date(c.siegeAt)) : t.value.stats.castleNoSiege
}

const updatedLabel = computed(() => status.value
  ? t.value.stats.updated.replace('{time}', time.value.format(new Date(status.value.updatedAt)))
  : '')

const playersLabel = computed(() => {
  const s = status.value
  if (!s) return '…'
  // null — база недоступна, поэтому число неизвестно; 0 при офлайн-сервере показываем как есть
  if (s.playersOnline === null) return t.value.stats.unknown
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

      <!-- Замки -->
      <div v-reveal="180" class="stats__block panel">
        <h2 class="stats__top-title text-gold">{{ t.stats.castlesTitle }}</h2>

        <div v-if="castlesError" class="stats__placeholder">
          {{ t.stats.error }}
          <button type="button" class="stats__retry" @click="() => refreshCastles()">{{ t.stats.retry }}</button>
        </div>
        <div v-else-if="!castles && castlesPending" class="stats__placeholder">{{ t.stats.loading }}</div>
        <div v-else-if="castles && !castles.castles.length" class="stats__placeholder">{{ t.stats.empty }}</div>

        <ul v-else-if="castles" class="stats__castles">
          <li v-for="c in castles.castles" :key="c.id" class="stats__castle">
            <div v-if="castleImage(c.id)" class="stats__castle-image" aria-hidden="true">
              <img :src="castleImage(c.id)" alt="" width="246" height="171" loading="lazy">
            </div>
            <span class="stats__castle-name">{{ c.name }}</span>
            <span class="stats__castle-owner" :class="{ 'is-free': !c.owner }">
              {{ c.owner ?? t.stats.castleFree }}
            </span>
            <span v-if="c.owner" class="stats__castle-ally">{{ c.ally ?? t.stats.noAlly }}</span>

            <dl class="stats__castle-meta">
              <div class="stats__castle-row">
                <dt>{{ t.stats.castleTax }}</dt>
                <dd>{{ c.tax }}%</dd>
              </div>
              <div v-if="c.leader" class="stats__castle-row">
                <dt>{{ t.stats.castleLeader }}</dt>
                <dd>{{ c.leader }}</dd>
              </div>
              <div class="stats__castle-row">
                <dt>{{ t.stats.castleSiege }}</dt>
                <dd>{{ siegeLabel(c) }}</dd>
              </div>
            </dl>
          </li>
        </ul>
      </div>

      <!-- Герои -->
      <div v-reveal="240" class="stats__block panel">
        <h2 class="stats__top-title text-gold">{{ t.stats.heroesTitle }}</h2>

        <div v-if="heroesError" class="stats__placeholder">
          {{ t.stats.error }}
          <button type="button" class="stats__retry" @click="() => refreshHeroes()">{{ t.stats.retry }}</button>
        </div>
        <div v-else-if="!heroes && heroesPending" class="stats__placeholder">{{ t.stats.loading }}</div>
        <div v-else-if="heroes && !heroes.heroes.length" class="stats__placeholder">{{ t.stats.heroesEmpty }}</div>

        <div v-else-if="heroes" class="stats__table-wrap" :class="{ 'is-pending': heroesPending }">
          <table class="stats__table">
            <thead>
              <tr>
                <th class="stats__rank" scope="col">{{ t.stats.rank }}</th>
                <th scope="col">{{ t.stats.name }}</th>
                <th class="stats__hide-sm" scope="col">{{ t.stats.class }}</th>
                <th class="stats__num" scope="col">{{ t.stats.level }}</th>
                <th class="stats__hide-sm" scope="col">{{ t.stats.clan }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(h, i) in heroes.heroes" :key="h.name" :class="{ 'is-podium': i < 3 }">
                <td class="stats__rank">
                  <span class="stats__place" :class="`stats__place--${i + 1}`">{{ i + 1 }}</span>
                </td>
                <td>
                  <span class="stats__name">
                    {{ h.name }}
                    <span v-if="h.online" class="stats__dot stats__dot--sm" :title="t.stats.inGame">
                      <span class="visually-hidden">{{ t.stats.inGame }}</span>
                    </span>
                    <span class="stats__hero-count" :title="t.stats.heroTimes.replace('{count}', String(h.count))">
                      ×{{ h.count }}
                    </span>
                  </span>
                  <span class="stats__class-sm">{{ h.className }}</span>
                </td>
                <td class="stats__hide-sm stats__class">{{ h.className }}</td>
                <td class="stats__num">{{ h.level }}</td>
                <td class="stats__hide-sm stats__class">{{ h.clan ?? t.stats.noClan }}</td>
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

.stats__block {
  margin-top: 48px;
  padding: 28px clamp(16px, 3vw, 32px) 24px;
}

.stats__castles {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin: 20px 0 0;
  padding: 0;
  list-style: none;
}

.stats__castle {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 18px 20px;
  overflow: hidden;
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius);
  background: rgb(255 255 255 / 0.02);
  transition: border-color 0.3s;
}

.stats__castle:hover {
  border-color: var(--gold-500);
}

/* Шапка карточки: картинка во всю ширину, снизу уходит в фон карточки */
.stats__castle-image {
  position: relative;
  aspect-ratio: 16 / 9;
  margin: -18px -20px 10px;
  overflow: hidden;
}

.stats__castle-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  /* Чуть увеличиваем, чтобы срезать рамку исходной картинки */
  transform: scale(1.06);
  transition: transform 0.6s var(--ease-out);
}

.stats__castle:hover .stats__castle-image img {
  transform: scale(1.12);
}

.stats__castle-image::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 45%, var(--color-surface) 100%);
}

.stats__castle-name {
  color: var(--gold-300);
  font-family: var(--font-heading);
  font-size: 22px;
  font-weight: 700;
  line-height: 1.2;
}

.stats__castle-owner {
  font-size: 16px;
  font-weight: 600;
}

.stats__castle-owner.is-free,
.stats__castle-ally {
  color: var(--color-text-muted);
  font-weight: 400;
}

.stats__castle-ally {
  font-size: 13px;
}

.stats__castle-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 12px 0 0;
  font-size: 13px;
}

.stats__castle-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.stats__castle-row dt {
  flex: none;
  color: var(--color-text-muted);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-size: 11px;
}

.stats__castle-row dd {
  margin: 0;
  text-align: right;
}

.stats__hero-count {
  padding: 1px 7px;
  border: 1px solid var(--color-line-strong);
  border-radius: 999px;
  color: var(--gold-300);
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
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

@media (max-width: 1024px) {
  .stats__castles {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .stats__status {
    grid-template-columns: 1fr 1fr;
  }

  .stats__status .stats__card:first-child {
    grid-column: 1 / -1;
  }

  .stats__castles {
    grid-template-columns: minmax(0, 1fr);
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
