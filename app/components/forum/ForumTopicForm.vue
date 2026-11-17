<script setup lang="ts">
import type { ForumCategorySlug } from '#shared/forum'
import { forumLimits } from '#shared/forum'
import { forumBodyReady } from '~/utils/forum'

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  category: ForumCategorySlug
}>()

const localePath = useLocalePath()
const { t, errorText } = useForum()
const content = useContent()

const form = reactive({ title: '', body: '' })
const pending = ref(false)
const error = ref('')

async function submit() {
  if (!forumBodyReady(form.body)) return
  pending.value = true
  error.value = ''
  try {
    const created = await $fetch<{ id: number }>('/api/forum/topics', {
      method: 'POST',
      body: { category: props.category, title: form.title, body: form.body },
    })
    form.title = ''
    form.body = ''
    await navigateTo(localePath(`/forum/t/${created.id}`))
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
  <UiModal v-model:open="open" :title="t.newTopic" :close-label="content.cabinet.common.close">
    <form class="forum-compose forum-compose--modal" @submit.prevent="submit">
      <p v-if="error" class="cab-note cab-note--error" role="alert">{{ error }}</p>
      <label class="cab-field">
        <span>{{ t.titleLabel }}</span>
        <input v-model="form.title" class="cab-input" required autofocus :maxlength="forumLimits.titleMax">
      </label>
      <div class="cab-field">
        <span>{{ t.bodyLabel }}</span>
        <ForumEditor v-model="form.body" :label="t.bodyLabel" :placeholder="t.editor.placeholder" />
      </div>
      <UiButton type="submit" :loading="pending" :disabled="!forumBodyReady(form.body)">{{ t.submitTopic }}</UiButton>
    </form>
  </UiModal>
</template>
