<script setup lang="ts">
import type { CabinetOverview, ReferralAward } from '#shared/cabinet'
import { l2Classes } from '#shared/cabinet'

definePageMeta({ layout: 'cabinet', middleware: 'auth' })

const { t, item, notices, num } = useCabinet()
const content = useContent()
usePrivatePage(() => t.value.titles.cabinet)

const { data, error, refresh } = await useCabinetFetch<CabinetOverview>('/api/cabinet/overview')
const showAccountForm = ref(false)
const passwordLogin = ref<string | null>(null)

function onTransferred(coins: number) {
  if (data.value) data.value.coins = coins
}

async function onAccountCreated() {
  showAccountForm.value = false
  await refresh()
}

// Проверка реферальных наград при входе в кабинет (раньше делалась при каждой загрузке index.php)
onMounted(async () => {
  try {
    const { awards } = await $fetch<{ awards: ReferralAward[] }>('/api/referrals/check', { method: 'POST' })
    const types = content.value.cabinet.referrals.types
    for (const a of awards) {
      notices.success(a.kind === 'player'
        ? fmt(t.value.referrals.awardPlayer, { type: types[a.type], char: a.charName })
        : fmt(t.value.referrals.awardReferrer, { type: types[a.type], coins: num(a.coins), item }))
    }
    if (awards.some(a => a.kind === 'referrer')) await refresh()
  }
  catch {
    // Проверка наград не должна мешать работе кабинета
  }
})
</script>

<template>
  <div class="cab-page">
    <CabinetPageHead
      :title="t.dashboard.title"
      :subtitle="data ? `${t.common.master}: ${data.login}` : undefined"
      :stat-label="`${t.common.balance} ${item}`"
      :stat-value="data ? num(data.coins) : '…'"
    />

    <div v-if="error && error.statusCode !== 401" class="cab-note cab-note--error">
      {{ t.common.loadError }}
      <button type="button" class="cab-link cab-retry" @click="() => refresh()">{{ t.common.retry }}</button>
    </div>

    <template v-if="data">
      <div class="cab-actions">
        <UiButton href="/cabinet/donate">{{ t.dashboard.topUp }}</UiButton>
        <UiButton v-if="!showAccountForm" variant="secondary" @click="showAccountForm = true">+ {{ t.dashboard.addAccount }}</UiButton>
      </div>

      <CabinetGameAccountForm v-if="showAccountForm" @created="onAccountCreated" @cancel="showAccountForm = false" />

      <div v-if="!data.accounts.length" class="panel cab-panel">
        <p class="cab-empty">{{ t.dashboard.noAccounts }}</p>
      </div>

      <section v-for="acc in data.accounts" :key="acc.login" class="panel cab-panel">
        <div class="cab-account-head">
          <h2 class="cab-panel__title">{{ t.dashboard.account }} <span class="cab-accent">{{ acc.login }}</span></h2>
          <UiButton
            v-if="passwordLogin !== acc.login"
            variant="secondary"
            size="sm"
            @click="passwordLogin = acc.login"
          >
            {{ t.gameAccount.changePassword }}
          </UiButton>
        </div>

        <CabinetGameAccountPasswordForm
          v-if="passwordLogin === acc.login"
          :login="acc.login"
          @changed="passwordLogin = null"
          @cancel="passwordLogin = null"
        />

        <div v-for="server in acc.servers" :key="server.id" class="cab-server">
          <h3 v-if="acc.servers.length > 1" class="cab-server__title">{{ server.name }}</h3>

          <p v-if="server.characters === null" class="cab-empty">{{ t.dashboard.serverUnavailable }}</p>
          <p v-else-if="!server.characters.length" class="cab-empty">{{ t.dashboard.noCharacters }}</p>
          <template v-else>
            <div class="cab-table-wrap">
              <table class="cab-table cab-table--stack">
                <thead>
                  <tr>
                    <th>{{ t.dashboard.character }}</th>
                    <th>{{ t.dashboard.class }}</th>
                    <th>{{ t.dashboard.level }}</th>
                    <th>{{ t.dashboard.status }}</th>
                    <th>{{ fmt(t.dashboard.transferColumn, { item }) }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="ch in server.characters" :key="ch.id">
                    <td class="cab-nowrap cab-char-name">{{ ch.name }}</td>
                    <td :data-label="t.dashboard.class">{{ ch.classId !== null ? l2Classes[ch.classId] ?? ch.classId : t.common.empty }}</td>
                    <td :data-label="t.dashboard.level">{{ ch.level ?? t.common.empty }}</td>
                    <td :data-label="t.dashboard.status">
                      <span class="cab-badge" :class="ch.online ? 'cab-badge--online' : 'cab-badge--offline'">
                        {{ ch.online ? t.dashboard.online : t.dashboard.offline }}
                      </span>
                    </td>
                    <td class="cab-char-transfer">
                      <CabinetTransferForm :char-id="ch.id" :char-name="ch.name" :server="server.id" :max="data.coins" @done="onTransferred" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="cab-hint cab-server__hint">{{ t.dashboard.transferHint }}</p>
          </template>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.cab-retry {
  margin-left: 8px;
  padding: 0;
  border-width: 0 0 1px;
  background: none;
  font: inherit;
  cursor: pointer;
}

.cab-account-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}

.cab-account-head .cab-panel__title {
  margin-bottom: 0;
}

.cab-server + .cab-server {
  margin-top: 24px;
}

.cab-server__title {
  margin-bottom: 10px;
  color: var(--gold-500);
  font-size: 20px;
}

.cab-server__hint {
  margin-top: 12px;
}

@media (max-width: 640px) {
  .cab-char-name {
    color: var(--gold-300);
    font-size: 16px;
    font-weight: 600;
  }

  .cab-char-transfer {
    padding-top: 10px !important;
  }

  .cab-char-transfer :deep(.cab-inline-form) {
    width: 100%;
    flex-wrap: nowrap;
  }

  .cab-char-transfer :deep(.cab-input--sm) {
    flex: 1;
    width: auto;
  }
}
</style>
