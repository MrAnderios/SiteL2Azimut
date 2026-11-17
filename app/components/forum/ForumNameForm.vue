<script setup lang="ts">
import { forumLimits } from '#shared/forum'

const { t, errorText, refreshMe } = useForum()
const content = useContent()

const open = ref(false)
const name = ref('')
const pending = ref(false)
const error = ref('')

onMounted(() => {
  open.value = true
})

async function submit() {
  pending.value = true
  error.value = ''
  try {
    await $fetch('/api/forum/profile', { method: 'POST', body: { name: name.value } })
    await refreshMe()
    open.value = false
  }
  catch (e) {
    error.value = errorText(e)
  }
  finally {
    pending.value = false
  }
}
</script>

<template>
  <div>
    <p v-if="!open" class="forum-login forum-name-prompt">
      {{ t.nameText }}
      <button type="button" class="forum-name-open" aria-haspopup="dialog" @click="open = true">{{ t.nameTitle }}</button>
    </p>

    <UiModal v-model:open="open" :title="t.nameTitle" :close-label="content.cabinet.common.close">
      <form class="cab-form" @submit.prevent="submit">
        <p class="forum-name__text">{{ t.nameText }}</p>
        <label class="cab-field">
          <span>{{ t.nameLabel }}</span>
          <input
            v-model="name"
            class="cab-input"
            name="forum-name"
            required
            autofocus
            autocomplete="nickname"
            :minlength="forumLimits.nameMin"
            :maxlength="forumLimits.nameMax"
          >
        </label>
        <p v-if="error" class="cab-note cab-note--error" role="alert">{{ error }}</p>
        <UiButton type="submit" :loading="pending">{{ t.nameSubmit }}</UiButton>
      </form>
    </UiModal>
  </div>
</template>

<style scoped>
.forum-name-prompt {
  margin-bottom: 20px;
}

.forum-name-open {
  padding: 0;
  border: 0;
  border-bottom: 1px solid var(--color-line-strong);
  background: none;
  color: var(--gold-300);
  font: inherit;
  cursor: pointer;
}

.forum-name-open:hover,
.forum-name-open:focus-visible {
  color: var(--gold-100);
  border-color: var(--gold-300);
}
</style>
