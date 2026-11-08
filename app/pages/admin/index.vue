<script setup lang="ts">
import type { AdminDashboard, AdminPayment } from '#shared/cabinet'
import { gameServerName } from '#shared/cabinet'

definePageMeta({ layout: 'cabinet', middleware: 'admin' })

const { t, item, notices, num, date, showError } = useCabinet()
usePrivatePage(() => t.value.titles.admin)

const search = ref('')
const query = ref<Record<string, string>>({})
const { data, refresh } = await useCabinetFetch<AdminDashboard>('/api/admin/dashboard', { query })

let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, (q) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { query.value = q.trim() ? { q: q.trim() } : {} }, 300)
})

// Начисление / списание
const balance = reactive({ login: '', amount: null as number | null, action: 'credit' as 'credit' | 'debit' })
const balancePending = ref(false)

async function applyBalance() {
  balancePending.value = true
  try {
    const res = await $fetch('/api/admin/balance', { method: 'POST', body: balance })
    notices.success(fmt(res.action === 'credit' ? t.value.admin.credited : t.value.admin.debited, {
      login: res.login, amount: num(res.amount), item,
    }))
    balance.amount = null
    await refresh()
  }
  catch (e) {
    showError(e)
  }
  finally {
    balancePending.value = false
  }
}

// Подтверждение / отмена платежей
const paymentPending = ref<number | null>(null)

async function processPayment(p: AdminPayment, action: 'confirm' | 'cancel') {
  const ask = action === 'confirm'
    ? fmt(t.value.admin.confirmAsk, { code: p.code, sum: num(p.amountRub), login: p.masterLogin })
    : fmt(t.value.admin.cancelAsk, { code: p.code })
  if (!window.confirm(ask)) return

  paymentPending.value = p.id
  try {
    await $fetch(`/api/admin/payments/${p.id}`, { method: 'POST', body: { action } })
    notices.success(action === 'confirm' ? t.value.admin.confirmed : t.value.admin.canceled)
  }
  catch (e) {
    showError(e)
  }
  finally {
    paymentPending.value = null
    await refresh()
  }
}
</script>

<template>
  <div class="cab-page">
    <CabinetPageHead :title="t.admin.title" />

    <section class="panel cab-panel">
      <h2 class="cab-panel__title">
        {{ t.admin.pendingTitle }}
        <span v-if="data?.pending.length" class="cab-badge cab-badge--pending">{{ data.pending.length }}</span>
      </h2>
      <div class="cab-table-wrap">
        <table class="cab-table">
          <thead>
            <tr>
              <th>{{ t.admin.code }}</th>
              <th>{{ t.admin.master }}</th>
              <th class="cab-num">{{ t.admin.sum }}</th>
              <th class="cab-num">{{ item }}</th>
              <th>{{ t.admin.created }}</th>
              <th>{{ t.admin.actions }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!data?.pending.length">
              <td colspan="6" class="cab-empty-row">{{ t.admin.noPending }}</td>
            </tr>
            <tr v-for="p in data?.pending" :key="p.id">
              <td class="cab-nowrap">{{ p.code }}</td>
              <td>{{ p.masterLogin }}</td>
              <td class="cab-num">{{ num(p.amountRub) }} ₽</td>
              <td class="cab-num">{{ num(p.amountCoins) }}</td>
              <td class="cab-nowrap">{{ date(p.createdAt) }}</td>
              <td>
                <div class="cab-inline-form">
                  <UiButton size="sm" :loading="paymentPending === p.id" @click="processPayment(p, 'confirm')">{{ t.admin.confirm }}</UiButton>
                  <UiButton size="sm" variant="secondary" :disabled="paymentPending === p.id" @click="processPayment(p, 'cancel')">{{ t.admin.cancel }}</UiButton>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="cab-hint cab-admin-hint">{{ t.admin.pendingHint }}</p>
    </section>

    <div class="cab-grid">
      <section class="panel cab-panel">
        <h2 class="cab-panel__title">{{ fmt(t.admin.balanceTitle, { item }) }}</h2>
        <form class="cab-form" autocomplete="off" @submit.prevent="applyBalance">
          <label class="cab-field">
            <span>{{ t.admin.masterLogin }}</span>
            <input v-model.trim="balance.login" class="cab-input" required list="admin-masters">
            <datalist id="admin-masters">
              <option v-for="m in data?.masters" :key="m.id" :value="m.login" />
            </datalist>
          </label>
          <label class="cab-field">
            <span>{{ t.admin.amount }}</span>
            <input v-model.number="balance.amount" class="cab-input" type="number" min="1" step="1" required>
          </label>
          <label class="cab-field">
            <span>{{ t.admin.operation }}</span>
            <select v-model="balance.action" class="cab-input">
              <option value="credit">{{ t.admin.credit }}</option>
              <option value="debit">{{ t.admin.debit }}</option>
            </select>
          </label>
          <UiButton type="submit" :loading="balancePending">{{ t.admin.execute }}</UiButton>
        </form>
      </section>

      <section class="panel cab-panel">
        <h2 class="cab-panel__title">{{ t.admin.mastersTitle }}</h2>
        <input v-model="search" class="cab-input cab-admin-search" type="search" :placeholder="t.admin.search" :aria-label="t.admin.search">
        <div class="cab-table-wrap cab-admin-masters">
          <table class="cab-table">
            <thead>
              <tr>
                <th>{{ t.admin.id }}</th>
                <th>{{ t.admin.login }}</th>
                <th>{{ t.admin.email }}</th>
                <th class="cab-num">{{ t.admin.balance }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!data?.masters.length">
                <td colspan="4" class="cab-empty-row">{{ t.admin.noMasters }}</td>
              </tr>
              <tr v-for="m in data?.masters" :key="m.id">
                <td>{{ m.id }}</td>
                <td>
                  <button type="button" class="cab-admin-pick" @click="balance.login = m.login">{{ m.login }}</button>
                </td>
                <td>{{ m.email }}</td>
                <td class="cab-num">{{ num(m.coins) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <section class="panel cab-panel">
      <h2 class="cab-panel__title">{{ t.admin.historyTitle }}</h2>
      <div class="cab-table-wrap">
        <table class="cab-table">
          <thead>
            <tr>
              <th>{{ t.admin.code }}</th>
              <th>{{ t.admin.master }}</th>
              <th class="cab-num">{{ t.admin.sum }}</th>
              <th>{{ t.admin.status }}</th>
              <th>{{ t.admin.created }}</th>
              <th>{{ t.admin.paid }}</th>
              <th>{{ t.admin.confirmedBy }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!data?.history.length">
              <td colspan="7" class="cab-empty-row">{{ t.admin.noHistory }}</td>
            </tr>
            <tr v-for="p in data?.history" :key="p.id">
              <td class="cab-nowrap">{{ p.code }}</td>
              <td>{{ p.masterLogin }}</td>
              <td class="cab-num">{{ num(p.amountRub) }} ₽</td>
              <td><span class="cab-badge" :class="`cab-badge--${p.status}`">{{ t.donate.statuses[p.status] }}</span></td>
              <td class="cab-nowrap">{{ date(p.createdAt) }}</td>
              <td class="cab-nowrap">{{ date(p.paidAt) }}</td>
              <td>{{ p.confirmedBy || t.common.empty }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="panel cab-panel">
      <h2 class="cab-panel__title">{{ t.admin.logTitle }}</h2>
      <div class="cab-table-wrap">
        <table class="cab-table">
          <thead>
            <tr>
              <th>{{ t.admin.id }}</th>
              <th>{{ t.admin.master }}</th>
              <th>{{ t.admin.target }}</th>
              <th>{{ t.admin.server }}</th>
              <th class="cab-num">{{ t.admin.count }}</th>
              <th>{{ t.admin.operation }}</th>
              <th>{{ t.admin.time }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!data?.log.length">
              <td colspan="7" class="cab-empty-row">{{ t.admin.noLog }}</td>
            </tr>
            <tr v-for="l in data?.log" :key="l.id">
              <td>{{ l.id }}</td>
              <td>{{ l.masterLogin }}</td>
              <td>{{ l.target }}</td>
              <td>{{ l.server ? gameServerName(l.server) : t.common.empty }}</td>
              <td class="cab-num">{{ num(l.amount) }}</td>
              <td><code>{{ l.action }}</code></td>
              <td class="cab-nowrap">{{ date(l.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<style scoped>
.cab-admin-hint {
  margin-top: 12px;
}

.cab-admin-search {
  margin-bottom: 12px;
}

.cab-admin-masters {
  max-height: 420px;
  overflow-y: auto;
}

.cab-admin-pick {
  padding: 0;
  border: 0;
  background: none;
  color: var(--gold-300);
  font: inherit;
  cursor: pointer;
}

.cab-admin-pick:hover {
  text-decoration: underline;
}
</style>
