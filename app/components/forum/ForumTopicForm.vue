<script setup lang="ts">
// Форма создания темы в разделе.
import { forumLimits } from '#shared/forum'

const props = defineProps<{ sectionId: number }>()
const emit = defineEmits<{ created: [id: number], cancel: [] }>()

const { t, notices, showError } = useForum()
const form = reactive({ title: '', body: '' })
const pending = ref(false)

async function submit() {
  pending.value = true
  try {
    const { id } = await $fetch<{ id: number }>('/api/forum/topics', {
      method: 'POST',
      body: { sectionId: props.sectionId, title: form.title, body: form.body },
    })
    notices.success(t.value.topicCreated)
    emit('created', id)
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
    <h3 class="forum-form__title">{{ t.newTopic }}</h3>
    <label class="cab-field">
      <span>{{ t.topicTitle }}</span>
      <input v-model="form.title" class="cab-input" type="text" required :minlength="forumLimits.titleMin" :maxlength="forumLimits.titleMax" :placeholder="t.topicTitlePlaceholder" autofocus>
    </label>
    <label class="cab-field">
      <span>{{ t.body }}</span>
      <textarea v-model="form.body" class="cab-input forum-textarea" required :minlength="forumLimits.bodyMin" :maxlength="forumLimits.bodyMax" :placeholder="t.bodyPlaceholder" />
    </label>
    <div class="cab-actions">
      <UiButton type="submit" :loading="pending">{{ t.createTopic }}</UiButton>
      <UiButton variant="ghost" @click="emit('cancel')">{{ t.cancel }}</UiButton>
    </div>
  </form>
</template>