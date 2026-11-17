<script setup lang="ts">
// Форма ответа в теме.
import { forumLimits } from '#shared/forum'

const props = defineProps<{ topicId: number }>()
const emit = defineEmits<{ created: [] }>()

const { t, notices, showError } = useForum()
const body = ref('')
const pending = ref(false)

async function submit() {
  pending.value = true
  try {
    await $fetch(`/api/forum/topics/${props.topicId}/posts`, { method: 'POST', body: { body: body.value } })
    notices.success(t.value.replyAdded)
    body.value = ''
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
  <form class="panel forum-form" @submit.prevent="submit">
    <h3 class="forum-form__title">{{ t.replyTitle }}</h3>
    <label class="cab-field">
      <span>{{ t.body }}</span>
      <textarea v-model="body" class="cab-input forum-textarea" required :minlength="forumLimits.bodyMin" :maxlength="forumLimits.bodyMax" :placeholder="t.bodyPlaceholder" />
    </label>
    <div class="cab-actions">
      <UiButton type="submit" :loading="pending">{{ t.sendReply }}</UiButton>
    </div>
  </form>
</template>