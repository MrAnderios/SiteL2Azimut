<script setup lang="ts">
import { limits } from '#shared/cabinet'

definePageMeta({ layout: 'cabinet', middleware: 'guest' })

const { t, item, notices, showError } = useCabinet()
usePrivatePage(() => t.value.titles.register)

const auth = useAuth()
const route = useRoute()
const localePath = useLocalePath()

// Реферальный код из ссылки ?ref=… запоминаем, чтобы он не потерялся, если игрок ушёл и вернулся позже
const refCookie = useCookie<string | null>('azimut_ref', { maxAge: 60 * 60 * 24 * 30, sameSite: 'lax' })
const queryRef = typeof route.query.ref === 'string' ? route.query.ref.trim().slice(0, 16) : ''
if (queryRef) refCookie.value = queryRef

const { data: referrer } = await useFetch('/api/auth/referrer', {
  query: { code: refCookie.value ?? '' },
  immediate: !!refCookie.value,
  transform: r => r.login,
})

const form = reactive({ login: '', email: '', password: '', passwordConfirm: '' })
const pending = ref(false)

async function submit() {
  pending.value = true
  try {
    const { referrer: invitedBy } = await auth.register({ ...form, ref: referrer.value ? refCookie.value ?? '' : '' })
    refCookie.value = null
    notices.success(invitedBy
      ? fmt(t.value.register.successInvited, { login: form.login, referrer: invitedBy })
      : fmt(t.value.register.success, { login: form.login }))
    await navigateTo(localePath('/cabinet'))
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
  <CabinetAuthCard :title="t.register.title">
    <p v-if="referrer" class="cab-note cab-register-note">{{ fmt(t.register.invitedBy, { login: referrer }) }}</p>
    <p v-else class="cab-hint cab-register-note">{{ fmt(t.register.intro, { item }) }}</p>

    <form class="cab-form" @submit.prevent="submit">
      <label class="cab-field">
        <span>{{ t.fields.login }}</span>
        <input
          v-model.trim="form.login"
          class="cab-input"
          name="login"
          autocomplete="username"
          required
          :minlength="limits.loginMin"
          :maxlength="limits.loginMax"
          pattern="[a-zA-Z0-9_.\-]+"
          :placeholder="t.fields.loginPlaceholder"
          autofocus
        >
      </label>
      <label class="cab-field">
        <span>{{ t.fields.email }}</span>
        <input v-model.trim="form.email" class="cab-input" type="email" name="email" autocomplete="email" required :maxlength="limits.emailMax" placeholder="you@example.com">
      </label>
      <label class="cab-field">
        <span>{{ t.fields.password }}</span>
        <input
          v-model="form.password"
          class="cab-input"
          type="password"
          name="password"
          autocomplete="new-password"
          required
          :minlength="limits.passwordMin"
          :maxlength="limits.passwordMax"
          :placeholder="fmt(t.fields.passwordPlaceholder, { min: limits.passwordMin })"
        >
      </label>
      <label class="cab-field">
        <span>{{ t.fields.passwordConfirm }}</span>
        <input v-model="form.passwordConfirm" class="cab-input" type="password" name="password_confirm" autocomplete="new-password" required :maxlength="limits.passwordMax">
      </label>
      <UiButton type="submit" :loading="pending">{{ t.register.submit }}</UiButton>
    </form>
    <p class="cab-auth-switch">
      {{ t.register.hasAccount }}
      <NuxtLink :to="localePath('/login')" class="cab-link">{{ t.register.login }}</NuxtLink>
    </p>
  </CabinetAuthCard>
</template>

<style scoped>
.cab-register-note {
  margin-bottom: 20px;
}

.cab-auth-switch {
  margin-top: 22px;
  color: var(--color-text-muted);
  font-size: 14px;
  text-align: center;
}
</style>
