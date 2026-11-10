<script setup lang="ts">
import type { ReferralsResponse } from '#shared/cabinet'

definePageMeta({ layout: 'cabinet', middleware: 'auth' })

const { t, item, num, date } = useCabinet()
const auth = useAuth()
const localePath = useLocalePath()
const baseUrl = useRuntimeConfig().public.i18n.baseUrl as string
usePrivatePage(() => t.value.titles.referrals)

const { data } = await useCabinetFetch<ReferralsResponse>('/api/referrals')

// Ссылка ведёт на регистрацию на языке, на котором открыт кабинет
const link = computed(() => data.value ? `${baseUrl}${localePath('/register')}?ref=${encodeURIComponent(data.value.code)}` : '')

const copied = ref(false)
const linkInput = ref<HTMLInputElement>()

async function copy() {
  try {
    await navigator.clipboard.writeText(link.value)
  }
  catch {
    linkInput.value?.select()
    document.execCommand('copy')
  }
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

const rules = computed(() => {
  const r = t.value.referrals.rules
  const s = data.value?.settings
  if (!s) return []
  return [
    r.player,
    s.commissionPct > 0 ? fmt(r.commission, { pct: s.commissionPct }) : null,
    fmt(r.referrer, { item, prof1: num(s.prof1Coins), prof2: num(s.prof2Coins), prof3: num(s.prof3Coins), noble: num(s.nobleCoins) }),
    r.check,
  ].filter(Boolean) as string[]
})
</script>

<template>
  <div class="cab-page">
    <CabinetPageHead
      :title="t.referrals.title"
      :subtitle="auth.user.value ? `${t.common.master}: ${auth.user.value.login}` : undefined"
      :stat-label="t.referrals.earned"
      :stat-value="data ? num(data.earnings) : '…'"
    />

    <template v-if="data">
      <p v-if="!data.settings.rewardEnabled" class="cab-note">{{ t.referrals.disabled }}</p>
      <p v-if="data.referredBy" class="cab-note">{{ fmt(t.referrals.invitedBy, { login: data.referredBy }) }}</p>

      <section class="panel cab-panel">
        <h2 class="cab-panel__title">{{ t.referrals.linkTitle }}</h2>
        <div class="cab-ref-link">
          <input ref="linkInput" class="cab-input" :value="link" readonly :aria-label="t.referrals.linkTitle" @focus="($event.target as HTMLInputElement).select()">
          <UiButton @click="copy">{{ copied ? t.referrals.copied : t.referrals.copy }}</UiButton>
        </div>
        <p class="cab-hint cab-ref-hint">{{ t.referrals.linkHint }}</p>
      </section>

      <div class="cab-grid">
        <section class="panel cab-panel">
          <h2 class="cab-panel__title">{{ t.referrals.invitesTitle }} <span class="cab-accent">{{ data.invites.length }}</span></h2>
          <p v-if="!data.invites.length" class="cab-empty">{{ t.referrals.noInvites }}</p>
          <div v-else class="cab-table-wrap">
            <table class="cab-table">
              <thead>
                <tr>
                  <th>{{ t.fields.login }}</th>
                  <th>{{ t.referrals.registered }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="inv in data.invites" :key="inv.login">
                  <td>{{ inv.login }}</td>
                  <td class="cab-nowrap">{{ date(inv.createdAt) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="panel cab-panel">
          <h2 class="cab-panel__title">{{ t.referrals.rewardsTitle }}</h2>
          <p v-if="!data.log.length" class="cab-empty">{{ t.referrals.noRewards }}</p>
          <div v-else class="cab-table-wrap">
            <table class="cab-table">
              <thead>
                <tr>
                  <th>{{ t.referrals.reward }}</th>
                  <th>{{ t.referrals.details }}</th>
                  <th>{{ t.referrals.date }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in data.log" :key="row.id">
                  <td>
                    {{ t.referrals.types[row.type] ?? row.type }}
                    <template v-if="row.kind !== 'commission'">
                      {{ row.kind === 'referrer' ? t.referrals.forInvited : t.referrals.forYou }}
                    </template>
                  </td>
                  <td class="cab-nowrap">
                    <template v-if="row.coinAmount > 0">+{{ num(row.coinAmount) }} {{ item }}</template>
                    <template v-else-if="row.itemCount > 0">{{ fmt(t.referrals.items, { count: num(row.itemCount), id: row.itemId }) }}</template>
                    <template v-else>{{ t.common.empty }}</template>
                  </td>
                  <td class="cab-nowrap">{{ date(row.createdAt) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section class="panel cab-panel">
        <h2 class="cab-panel__title">{{ t.referrals.howTitle }}</h2>
        <ul class="list-diamond">
          <li v-for="rule in rules" :key="rule">{{ rule }}</li>
        </ul>
      </section>
    </template>
  </div>
</template>

<style scoped>
.cab-ref-link {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.cab-ref-link .cab-input {
  flex: 1 1 280px;
  color: var(--gold-100);
}

.cab-ref-hint {
  margin-top: 12px;
}
</style>
