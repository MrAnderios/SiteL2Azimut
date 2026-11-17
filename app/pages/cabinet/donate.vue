<script setup lang="ts">
import type { Payment, PaymentCurrency, PaymentDetails, PaymentMethodKey, PaymentStatus, PaymentsResponse } from '#shared/cabinet'
import { payment as paymentConfig, paymentMethod, paymentMethods } from '#shared/cabinet'

definePageMeta({ layout: 'cabinet', middleware: 'auth' })

const { t, item, num, date, showError } = useCabinet()
const auth = useAuth()
usePrivatePage(() => t.value.titles.donate)

const { data, refresh } = await useCabinetFetch<PaymentsResponse>('/api/payments')

const method = ref<PaymentMethodKey>('sbp')
const amountRub = ref<number | null>(null)
const pending = ref(false)

const selected = computed(() => paymentMethod(method.value))
const coinsPreview = computed(() => Math.floor((amountRub.value || 0) / paymentConfig.coinPrice))
const active = computed(() => data.value?.active ?? null)
const activeInfo = computed(() => {
  const a = active.value
  return a ? paymentMethod(a.method) : null
})

function money(amount: number, currency: PaymentCurrency): string {
  return `${num(amount)} ${currency === 'BYN' ? 'BYN' : '₽'}`
}

async function createPayment() {
  pending.value = true
  try {
    await $fetch<PaymentDetails>('/api/payments', {
      method: 'POST',
      body: { amountRub: amountRub.value, method: method.value },
    })
    amountRub.value = null
    await refresh()
  }
  catch (e) {
    showError(e)
  }
  finally {
    pending.value = false
  }
}

// Опрос статуса неоплаченного счёта каждые 4 секунды
const liveStatus = ref<PaymentStatus | null>(null)
let timer: ReturnType<typeof setTimeout> | undefined

function stopPolling() {
  clearTimeout(timer)
  timer = undefined
}

function poll(id: number) {
  stopPolling()
  timer = setTimeout(async () => {
    try {
      const p = await $fetch<Payment>(`/api/payments/${id}`)
      liveStatus.value = p.status
      if (p.status === 'paid') {
        // Даём прочитать «оплата получена», потом обновляем баланс и историю
        timer = setTimeout(() => refresh(), 1500)
        return
      }
      if (p.status !== 'pending') return
    }
    catch {
      // сеть пропала — пробуем снова
    }
    poll(id)
  }, 4000)
}

watch(() => data.value?.active?.id, (id) => {
  liveStatus.value = null
  if (import.meta.client && id) poll(id)
  else stopPolling()
}, { immediate: true })

onBeforeUnmount(stopPolling)

const statusText = computed(() => {
  switch (liveStatus.value) {
    case 'paid': return t.value.donate.paid
    case 'canceled': return t.value.donate.canceled
    case 'expired': return t.value.donate.expired
    default: return t.value.donate.waiting
  }
})

const payHint = computed(() => {
  const a = active.value
  return a ? t.value.donate.payHints[a.method] : ''
})
</script>

<template>
  <div class="cab-page">
    <CabinetPageHead
      :title="t.donate.title"
      :subtitle="auth.user.value ? `${t.common.master}: ${auth.user.value.login}` : undefined"
      :stat-label="`${t.common.balance} ${item}`"
      :stat-value="data ? num(data.coins) : '…'"
    />

    <div class="cab-grid">
      <section class="panel cab-panel">
        <h2 class="cab-panel__title">{{ t.donate.createTitle }}</h2>
        <p class="cab-hint cab-donate-rate">{{ fmt(t.donate.rate, { price: num(paymentConfig.coinPrice), item }) }}</p>
        <form class="cab-form" autocomplete="off" @submit.prevent="createPayment">
          <fieldset class="cab-pay-methods">
            <legend>{{ t.donate.methodTitle }}</legend>
            <button
              v-for="m in paymentMethods"
              :key="m.key"
              type="button"
              class="cab-pay-method"
              :class="{ 'is-active': method === m.key }"
              :aria-pressed="method === m.key"
              :title="t.donate.methodHints[m.key]"
              @click="method = m.key"
            >
              <img :src="m.logos[0]" :alt="t.donate.methods[m.key]" class="cab-pay-method__logo" width="138" height="48" loading="lazy">
              <span class="cab-pay-method__name">{{ t.donate.methods[m.key] }}</span>
            </button>
          </fieldset>

          <label class="cab-field">
            <span>{{ t.donate.amount }}</span>
            <input
              v-model.number="amountRub"
              class="cab-input"
              type="number"
              :min="selected.minRub"
              :max="selected.maxRub"
              step="1"
              required
              :placeholder="t.donate.amountPlaceholder"
            >
          </label>
          <p v-if="coinsPreview > 0" class="cab-donate-preview">
            {{ t.donate.youGet }}: <strong>{{ num(coinsPreview) }}</strong> {{ item }}
          </p>
          <UiButton type="submit" :loading="pending">{{ t.donate.submit }}</UiButton>
        </form>
        <p class="cab-hint cab-donate-limits">{{ fmt(t.donate.limits, { min: num(selected.minRub), max: num(selected.maxRub) }) }}</p>
      </section>

      <section v-if="active" class="panel cab-panel cab-pay">
        <h2 class="cab-panel__title">{{ t.donate.payTitle }}</h2>
        <div v-if="activeInfo" class="cab-pay__method">
          <img :src="activeInfo.logos[0]" :alt="t.donate.methods[active.method]" width="138" height="48">
          <span>{{ t.donate.methods[active.method] }}</span>
        </div>
        <img v-if="active.qr" :src="active.qr" :alt="t.donate.qrAlt" class="cab-pay__qr" width="260" height="260">
        <UiButton v-if="active.payUrl" :href="active.payUrl" size="sm" class="cab-pay__bank">{{ t.donate.openBank }}</UiButton>
        <p>{{ t.donate.sum }}: <strong>{{ money(active.amount, active.currency) }}</strong></p>
        <p v-if="active.currency !== 'RUB'" class="cab-hint">{{ fmt(t.donate.rateNote, { rub: num(active.amountRub) }) }}</p>
        <p>{{ t.donate.youGet }}: <strong>{{ num(active.amountCoins) }}</strong> {{ item }}</p>
        <p class="cab-pay__code">{{ active.code }}</p>
        <p class="cab-hint">{{ payHint }}</p>
        <p v-if="!active.gateway && active.method !== 'sbp'" class="cab-hint cab-pay__manual">{{ t.donate.manualNote }}</p>
        <p class="cab-pay__status" :class="`is-${liveStatus ?? 'pending'}`">{{ statusText }}</p>
      </section>
    </div>

    <section class="panel cab-panel">
      <h2 class="cab-panel__title">{{ t.donate.historyTitle }}</h2>
      <div class="cab-table-wrap">
        <table class="cab-table">
          <thead>
            <tr>
              <th>{{ t.donate.code }}</th>
              <th>{{ t.donate.method }}</th>
              <th class="cab-num">{{ t.donate.sum }}</th>
              <th class="cab-num">{{ fmt(t.donate.coins, { item }) }}</th>
              <th>{{ t.donate.status }}</th>
              <th>{{ t.donate.created }}</th>
              <th>{{ t.donate.paidAt }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!data?.history.length">
              <td colspan="7" class="cab-empty-row">{{ t.donate.noPayments }}</td>
            </tr>
            <tr v-for="p in data?.history" :key="p.id">
              <td class="cab-nowrap">{{ p.code }}</td>
              <td>{{ t.donate.methods[p.method] }}</td>
              <td class="cab-num">{{ money(p.amount, p.currency) }}</td>
              <td class="cab-num">{{ num(p.amountCoins) }}</td>
              <td><span class="cab-badge" :class="`cab-badge--${p.status}`">{{ t.donate.statuses[p.status] }}</span></td>
              <td class="cab-nowrap">{{ date(p.createdAt) }}</td>
              <td class="cab-nowrap">{{ date(p.paidAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<style scoped>
.cab-donate-rate {
  margin: -8px 0 18px;
}

.cab-donate-preview {
  color: var(--color-text-muted);
  font-size: 14px;
}

.cab-donate-preview strong {
  color: var(--gold-300);
}

.cab-donate-limits {
  margin-top: 14px;
}

.cab-pay-methods {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 10px;
  margin: 0 0 18px;
  padding: 0;
  border: 0;
}

.cab-pay-methods legend {
  margin-bottom: 10px;
  color: var(--color-text-muted);
  font-size: 14px;
}

.cab-pay-method {
  display: grid;
  justify-items: center;
  gap: 8px;
  padding: 12px 10px;
  border: 1px solid var(--color-line);
  border-radius: var(--radius);
  background: rgb(0 0 0 / 0.18);
  color: inherit;
  font: inherit;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.cab-pay-method:hover {
  border-color: var(--gold-500);
}

.cab-pay-method.is-active {
  border-color: var(--gold-300);
  box-shadow: inset 0 0 0 1px var(--gold-300);
}

.cab-pay-method__logo {
  width: 138px;
  height: 48px;
  object-fit: contain;
}

.cab-pay-method__name {
  color: var(--color-text-muted);
  font-size: 13px;
  line-height: 1.3;
  text-align: center;
}

.cab-pay-method.is-active .cab-pay-method__name {
  color: var(--gold-100);
}

.cab-pay {
  display: grid;
  justify-items: center;
  gap: 10px;
  text-align: center;
}

.cab-pay__method {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--color-text-muted);
  font-size: 14px;
}

.cab-pay__method img {
  width: 96px;
  height: auto;
  border-radius: 4px;
}

.cab-pay__qr {
  width: 260px;
  height: 260px;
  margin-bottom: 8px;
  padding: 10px;
  border-radius: var(--radius);
  background: #fff;
}

.cab-pay__bank {
  margin-bottom: 8px;
}

.cab-pay strong {
  color: var(--gold-300);
}

.cab-pay__code {
  margin-top: 6px;
  padding: 8px 18px;
  border: 1px dashed var(--gold-500);
  border-radius: var(--radius);
  color: var(--gold-100);
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.12em;
  user-select: all;
}

.cab-pay__manual {
  max-width: 420px;
}

.cab-pay__status {
  margin-top: 6px;
  color: var(--gold-300);
  font-weight: 600;
}

.cab-pay__status.is-paid {
  color: #6fcf8e;
}

.cab-pay__status.is-canceled,
.cab-pay__status.is-expired {
  color: #d68080;
}
</style>
