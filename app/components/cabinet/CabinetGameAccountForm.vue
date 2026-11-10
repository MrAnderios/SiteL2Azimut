<script setup lang="ts">
import { limits } from '#shared/cabinet'

// Создание игрового аккаунта
const emit = defineEmits<{ created: [], cancel: [] }>()

const { t, notices, showError } = useCabinet()
const form = reactive({ login: '', password: '', passwordConfirm: '' })
const pending = ref(false)

async function submit() {
  pending.value = true
  try {
    const res = await $fetch('/api/cabinet/game-accounts', { method: 'POST', body: form })
    notices.success(fmt(t.value.gameAccount.created, { login: res.login }))
    Object.assign(form, { login: '', password: '', passwordConfirm: '' })
    emit('created')
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
  <section class="panel cab-panel">
    <h2 class="cab-panel__title">{{ t.gameAccount.title }}</h2>
    <form class="cab-form cab-ga-form" autocomplete="off" @submit.prevent="submit">
      <label class="cab-field">
        <span>{{ t.gameAccount.login }}</span>
        <input
          v-model.trim="form.login"
          class="cab-input"
          required
          :minlength="limits.loginMin"
          :maxlength="limits.loginMax"
          pattern="[a-zA-Z0-9_.\-]+"
          :placeholder="t.fields.loginPlaceholder"
          autofocus
        >
      </label>
      <label class="cab-field">
        <span>{{ t.fields.password }}</span>
        <CabinetPasswordInput
          v-model="form.password"
          autocomplete="new-password"
          required
          :minlength="limits.passwordMin"
          :maxlength="limits.passwordMax"
          :placeholder="fmt(t.fields.passwordPlaceholder, { min: limits.passwordMin })"
        />
      </label>
      <label class="cab-field">
        <span>{{ t.fields.passwordConfirm }}</span>
        <CabinetPasswordInput v-model="form.passwordConfirm" autocomplete="new-password" required :maxlength="limits.passwordMax" />
      </label>
      <div class="cab-actions">
        <UiButton type="submit" :loading="pending">{{ t.gameAccount.submit }}</UiButton>
        <UiButton variant="ghost" @click="emit('cancel')">{{ t.gameAccount.cancel }}</UiButton>
      </div>
    </form>
  </section>
</template>

<style scoped>
.cab-ga-form {
  max-width: 460px;
}
</style>
