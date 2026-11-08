<script setup lang="ts">
import { limits } from '#shared/cabinet'

definePageMeta({ layout: 'cabinet', middleware: 'guest' })

const { t, showError } = useCabinet()
usePrivatePage(() => t.value.titles.login)

const auth = useAuth()
const route = useRoute()
const localePath = useLocalePath()

const form = reactive({ login: '', password: '' })
const pending = ref(false)

async function submit() {
  pending.value = true
  try {
    await auth.login(form)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : ''
    // Только относительный путь своего сайта
    await navigateTo(redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : localePath('/cabinet'))
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
  <CabinetAuthCard :title="t.login.title">
    <form class="cab-form" @submit.prevent="submit">
      <label class="cab-field">
        <span>{{ t.fields.login }}</span>
        <input v-model.trim="form.login" class="cab-input" name="login" autocomplete="username" required :maxlength="limits.loginMax" autofocus>
      </label>
      <label class="cab-field">
        <span>{{ t.fields.password }}</span>
        <input v-model="form.password" class="cab-input" type="password" name="password" autocomplete="current-password" required :maxlength="limits.passwordMax">
      </label>
      <UiButton type="submit" :loading="pending">{{ t.login.submit }}</UiButton>
    </form>
    <p class="cab-auth-switch">
      {{ t.login.noAccount }}
      <NuxtLink :to="localePath('/register')" class="cab-link">{{ t.login.register }}</NuxtLink>
    </p>
  </CabinetAuthCard>
</template>

<style scoped>
.cab-auth-switch {
  margin-top: 22px;
  color: var(--color-text-muted);
  font-size: 14px;
  text-align: center;
}
</style>
