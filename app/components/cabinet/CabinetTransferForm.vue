<script setup lang="ts">
import type { GameServerId } from '#shared/cabinet'
import { gameServerName } from '#shared/cabinet'

// Перевод монет с баланса персонажу
const props = defineProps<{ charId: number, charName: string, server: GameServerId, max: number }>()
const emit = defineEmits<{ done: [coins: number] }>()

const { t, item, notices, num, showError } = useCabinet()
const amount = ref<number | null>(null)
const pending = ref(false)

async function submit() {
  if (!amount.value) return
  pending.value = true
  try {
    const res = await $fetch('/api/cabinet/transfer', {
      method: 'POST',
      body: { charId: props.charId, server: props.server, amount: amount.value },
    })
    notices.success(fmt(t.value.dashboard.transferred, {
      amount: num(res.amount), item, char: res.charName, server: gameServerName(res.server),
    }))
    amount.value = null
    emit('done', res.coins)
  }
  catch (e) {
    showError(e)
  }
  finally {
    pending.value = false
  }
}
</script>

<template>
  <form class="cab-inline-form" @submit.prevent="submit">
    <input
      v-model.number="amount"
      class="cab-input cab-input--sm"
      type="number"
      min="1"
      :max="max"
      step="1"
      required
      :placeholder="t.dashboard.amount"
      :aria-label="`${fmt(t.dashboard.transferColumn, { item })}: ${charName}`"
      :disabled="max < 1"
    >
    <UiButton type="submit" size="sm" :loading="pending" :disabled="max < 1">{{ t.dashboard.transfer }}</UiButton>
  </form>
</template>
