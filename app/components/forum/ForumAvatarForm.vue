<script setup lang="ts">
import { forumLimits } from '#shared/forum'

withDefaults(defineProps<{
  /** Картинка уже показана в шапке профиля. */
  image?: boolean
}>(), {
  image: true,
})

const { t, me, errorText, refreshMe } = useForum()

const input = ref<HTMLInputElement | null>(null)
const pending = ref(false)
const error = ref('')

function pick() {
  if (!pending.value) input.value?.click()
}

async function onFile(event: Event) {
  const field = event.target as HTMLInputElement
  const file = field.files?.[0]
  field.value = ''
  if (!file || pending.value) return
  if (file.size > forumLimits.avatarBytes) {
    error.value = fmt(t.value.errors.avatar_too_large, { max: 1 })
    return
  }
  if (file.type === 'image/svg+xml' || (file.type && !file.type.startsWith('image/'))) {
    error.value = t.value.errors.invalid_avatar
    return
  }
  pending.value = true
  error.value = ''
  try {
    const body = new FormData()
    body.append('avatar', file)
    await $fetch('/api/forum/me/avatar', { method: 'POST', body })
    await refreshMe()
  }
  catch (e) {
    error.value = errorText(e)
  }
  finally {
    pending.value = false
  }
}

async function remove() {
  if (pending.value || !me.value?.avatar) return
  if (!window.confirm(t.value.avatarRemoveConfirm)) return
  pending.value = true
  error.value = ''
  try {
    await $fetch('/api/forum/me/avatar', { method: 'DELETE' })
    await refreshMe()
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
  <div class="forum-avatar-form">
    <ForumAvatar v-if="image && me?.name" :name="me.name" :src="me.avatar" />
    <div class="forum-avatar-form__body">
      <div class="forum-avatar-form__actions">
        <UiButton type="button" size="sm" :loading="pending" @click="pick">
          {{ me?.avatar ? t.avatarChange : t.avatarUpload }}
        </UiButton>
        <button v-if="me?.avatar" type="button" class="forum-text-btn" :disabled="pending" @click="remove">
          {{ t.avatarRemove }}
        </button>
        <input
          ref="input"
          class="forum-avatar-form__file"
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          :aria-label="t.avatarLabel"
          :disabled="pending"
          @change="onFile"
        >
      </div>
      <p class="forum-avatar-form__hint">{{ fmt(t.avatarHint, { max: 1 }) }}</p>
      <p v-if="error" class="forum-avatar-form__error" role="alert">{{ error }}</p>
    </div>
  </div>
</template>
