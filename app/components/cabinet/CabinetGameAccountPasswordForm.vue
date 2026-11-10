<script setup lang="ts">
import { limits } from '#shared/cabinet'

// Смена пароля игрового аккаунта (текущий пароль подтверждает владение аккаунтом)
const props = defineProps<{ login: string }>()
const emit = defineEmits<{ changed: [], cancel: [] }>()

const { t, notices, showError } = useCabinet()
const form = reactive({ currentPassword: '', password: '', passwordConfirm: '' })
const pending = ref(false)

async function submit() {
  pending.value = true
  try {
    await $fetch('/api/cabinet/game-accounts/password', {
      method: 'POST',
      body: { login: props.login, ...form },
    })
    notices.success(fmt(t.value.gameAccount.passwordChanged, { login: props.login }))
    emit('changed')
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
  <form class="cab-form cab-ga-password" @submit.prevent="submit">
    <h3 class="cab-ga-password__title">{{ fmt(t.gameAccount.passwordTitle, { login }) }}</h3>

    <!-- Логин для менеджеров паролей: без него новый пароль сохранится не к тому аккаунту -->
    <input type="text" name="username" autocomplete="username" :value="login" readonly hidden>

    <label class="cab-field">
      <span>{{ t.gameAccount.currentPassword }}</span>
      <CabinetPasswordInput
        v-model="form.currentPassword"
        autocomplete="current-password"
        required
        :maxlength="limits.passwordMax"
        autofocus
      />
    </label>
    <label class="cab-field">
      <span>{{ t.gameAccount.newPassword }}</span>
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
      <span>{{ t.gameAccount.repeatPassword }}</span>
      <CabinetPasswordInput v-model="form.passwordConfirm" autocomplete="new-password" required :maxlength="limits.passwordMax" />
    </label>

    <p class="cab-hint">{{ t.gameAccount.passwordHint }}</p>

    <div class="cab-actions">
      <UiButton type="submit" :loading="pending">{{ t.gameAccount.savePassword }}</UiButton>
      <UiButton variant="ghost" @click="emit('cancel')">{{ t.gameAccount.cancel }}</UiButton>
    </div>
  </form>
</template>

<style scoped>
.cab-ga-password {
  max-width: 460px;
  margin-bottom: 20px;
  padding: 18px 20px;
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius);
  background: rgb(255 255 255 / 0.02);
}

.cab-ga-password__title {
  color: var(--gold-300);
  font-size: 18px;
}
</style>
