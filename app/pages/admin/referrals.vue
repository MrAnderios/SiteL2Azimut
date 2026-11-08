<script setup lang="ts">
import type { AdminReferrals, ReferralRewardKey, ReferralSettings } from '#shared/cabinet'
import { referralRewardKeys } from '#shared/cabinet'

definePageMeta({ layout: 'cabinet', middleware: 'admin' })

const { t, item, notices, num, date, showError } = useCabinet()
usePrivatePage(() => t.value.titles.adminReferrals)

const { data, refresh } = await useCabinetFetch<AdminReferrals>('/api/admin/referrals')

// Настройки
const settings = ref<ReferralSettings | null>(null)
watch(() => data.value?.settings, (s) => { settings.value = s ? { ...s } : null }, { immediate: true })
const numericSettings = ['commissionPct', 'prof1Coins', 'prof2Coins', 'prof3Coins', 'nobleCoins'] as const
const savePending = ref(false)

async function saveSettings() {
  savePending.value = true
  try {
    await $fetch('/api/admin/referrals/settings', { method: 'PUT', body: settings.value })
    notices.success(t.value.adminReferrals.saved)
    await refresh()
  }
  catch (e) {
    showError(e)
  }
  finally {
    savePending.value = false
  }
}

// Предметы наград
const newItems = reactive(Object.fromEntries(referralRewardKeys.map(k => [k, { itemId: null as number | null, count: null as number | null }])) as
  Record<ReferralRewardKey, { itemId: number | null, count: number | null }>)
const itemPending = ref<string | null>(null)

async function addItem(key: ReferralRewardKey) {
  const it = newItems[key]
  itemPending.value = key
  try {
    await $fetch('/api/admin/referrals/items', { method: 'POST', body: { rewardKey: key, itemId: it.itemId, count: it.count } })
    notices.success(fmt(t.value.adminReferrals.itemAdded, { id: it.itemId ?? 0, count: num(it.count ?? 0), reward: t.value.adminReferrals.rewardKeys[key] }))
    it.itemId = null
    it.count = null
    await refresh()
  }
  catch (e) {
    showError(e)
  }
  finally {
    itemPending.value = null
  }
}

async function removeItem(id: number) {
  itemPending.value = `del:${id}`
  try {
    await $fetch(`/api/admin/referrals/items/${id}`, { method: 'DELETE' })
    notices.success(t.value.adminReferrals.itemRemoved)
    await refresh()
  }
  catch (e) {
    showError(e)
  }
  finally {
    itemPending.value = null
  }
}

// Ручная проверка
const scanPending = ref(false)

async function scan() {
  scanPending.value = true
  try {
    const res = await $fetch<{ checked: number, awarded: number }>('/api/admin/referrals/scan', { method: 'POST' })
    notices.success(fmt(t.value.adminReferrals.scanDone, { checked: num(res.checked), awarded: num(res.awarded) }))
    await refresh()
  }
  catch (e) {
    showError(e)
  }
  finally {
    scanPending.value = false
  }
}
</script>

<template>
  <div class="cab-page">
    <CabinetPageHead :title="t.adminReferrals.title" />

    <template v-if="data && settings">
      <section class="panel cab-panel">
        <h2 class="cab-panel__title">{{ t.adminReferrals.settingsTitle }}</h2>
        <form class="cab-form" autocomplete="off" @submit.prevent="saveSettings">
          <div>
            <label class="cab-toggle">
              <input v-model="settings.rewardEnabled" type="checkbox">
              <span class="cab-toggle__track" />
              <span>{{ t.adminReferrals.enabled }}</span>
            </label>
            <p class="cab-hint cab-ar-hint">{{ t.adminReferrals.enabledHint }}</p>
          </div>
          <div class="cab-ar-settings">
            <label v-for="key in numericSettings" :key="key" class="cab-field">
              <span>{{ t.adminReferrals.settings[key] }}</span>
              <input v-model.number="settings[key]" class="cab-input" type="number" min="0" :max="key === 'commissionPct' ? 100 : undefined" step="1" required>
            </label>
          </div>
          <div>
            <UiButton type="submit" :loading="savePending">{{ t.adminReferrals.save }}</UiButton>
          </div>
        </form>
      </section>

      <div class="cab-grid">
        <section v-for="key in referralRewardKeys" :key="key" class="panel cab-panel">
          <h2 class="cab-panel__title">{{ t.adminReferrals.rewardKeys[key] }}</h2>
          <div class="cab-table-wrap">
            <table class="cab-table">
              <thead>
                <tr>
                  <th>{{ t.adminReferrals.itemId }}</th>
                  <th class="cab-num">{{ t.adminReferrals.count }}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                <tr v-if="!data.items[key].length">
                  <td colspan="3" class="cab-empty-row">{{ t.adminReferrals.noItems }}</td>
                </tr>
                <tr v-for="it in data.items[key]" :key="it.id">
                  <td>{{ it.itemId }}</td>
                  <td class="cab-num">{{ num(it.count) }}</td>
                  <td class="cab-num">
                    <UiButton size="sm" variant="secondary" :loading="itemPending === `del:${it.id}`" @click="removeItem(it.id)">{{ t.adminReferrals.remove }}</UiButton>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <form class="cab-inline-form cab-ar-add" autocomplete="off" @submit.prevent="addItem(key)">
            <input v-model.number="newItems[key].itemId" class="cab-input cab-input--sm" type="number" min="1" step="1" required :placeholder="t.adminReferrals.itemId" :aria-label="t.adminReferrals.itemId">
            <input v-model.number="newItems[key].count" class="cab-input cab-input--sm" type="number" min="1" step="1" required :placeholder="t.adminReferrals.count" :aria-label="t.adminReferrals.count">
            <UiButton type="submit" size="sm" :loading="itemPending === key">{{ t.adminReferrals.add }}</UiButton>
          </form>
        </section>
      </div>

      <section class="panel cab-panel">
        <h2 class="cab-panel__title">{{ t.adminReferrals.scanTitle }}</h2>
        <p class="cab-hint cab-ar-scan-text">{{ t.adminReferrals.scanText }}</p>
        <UiButton variant="secondary" :loading="scanPending" @click="scan">{{ t.adminReferrals.scan }}</UiButton>
      </section>

      <div class="cab-grid">
        <section class="panel cab-panel">
          <h2 class="cab-panel__title">{{ t.adminReferrals.topTitle }}</h2>
          <div class="cab-table-wrap">
            <table class="cab-table">
              <thead>
                <tr>
                  <th>{{ t.admin.login }}</th>
                  <th class="cab-num">{{ t.adminReferrals.invites }}</th>
                  <th class="cab-num">{{ fmt(t.adminReferrals.earned, { item }) }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!data.top.length">
                  <td colspan="3" class="cab-empty-row">{{ t.adminReferrals.noTop }}</td>
                </tr>
                <tr v-for="r in data.top" :key="r.login">
                  <td>{{ r.login }}</td>
                  <td class="cab-num">{{ num(r.invites) }}</td>
                  <td class="cab-num">{{ num(r.earned) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="panel cab-panel">
          <h2 class="cab-panel__title">{{ t.adminReferrals.logTitle }}</h2>
          <div class="cab-table-wrap">
            <table class="cab-table">
              <thead>
                <tr>
                  <th>{{ t.adminReferrals.master }}</th>
                  <th>{{ t.adminReferrals.kind }}</th>
                  <th>{{ t.adminReferrals.reward }}</th>
                  <th>{{ t.adminReferrals.player }}</th>
                  <th>{{ t.adminReferrals.date }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!data.log.length">
                  <td colspan="5" class="cab-empty-row">{{ t.adminReferrals.noLog }}</td>
                </tr>
                <tr v-for="l in data.log" :key="l.id">
                  <td>{{ l.masterLogin ?? t.common.empty }}</td>
                  <td>{{ t.adminReferrals.kinds[l.kind] }}</td>
                  <td>
                    <template v-if="l.coinAmount > 0">+{{ num(l.coinAmount) }} {{ item }}</template>
                    <template v-else-if="l.itemCount > 0">{{ fmt(t.referrals.items, { count: num(l.itemCount), id: l.itemId }) }}</template>
                    <template v-else>{{ t.common.empty }}</template>
                    <span v-if="l.type !== 'commission'" class="cab-badge cab-badge--pending cab-ar-type">{{ t.referrals.types[l.type] }}</span>
                  </td>
                  <td>{{ l.referredLogin ?? t.common.empty }}</td>
                  <td class="cab-nowrap">{{ date(l.createdAt) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.cab-ar-hint {
  margin-top: 8px;
}

.cab-ar-settings {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr));
  gap: 16px;
}

.cab-ar-add {
  margin-top: 16px;
}

.cab-ar-scan-text {
  margin-bottom: 16px;
}

.cab-ar-type {
  margin-left: 6px;
}
</style>
