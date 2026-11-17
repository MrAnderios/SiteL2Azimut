<script setup lang="ts">
// Форма создания/редактирования раздела форума (админ-панель).
import type { ForumSection } from '#shared/forum'
import { forumLimits } from '#shared/forum'

const props = defineProps<{ section?: ForumSection | null }>()
const emit = defineEmits<{ saved: [], cancel: [] }>()

const { t, notices, showError } = useForum()
const form = reactive({
  name: props.section?.name ?? '',
  description: props.section?.description ?? '',
  sort: props.section?.sort ?? 0,
})
const pending = ref(false)

async function submit() {
  pending.value = true
  try {
    if (props.section) {
      await $fetch(`/api/forum/sections/${props.section.id}`, { method: 'PATCH', body: { ...form } })
      notices.success(t.value.sectionSaved)
    }
    else {
      await $fetch('/api/forum/sections', { method: 'POST', body: { ...form } })
      notices.success(fmt(t.value.sectionCreated, { name: form.name }))
    }
    emit('saved')
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
  <form class="cab-form" @submit.prevent="submit">
    <label class="cab-field">
      <span>{{ t.sectionName }}</span>
      <input v-model="form.name" class="cab-input" type="text" required :maxlength="forumLimits.sectionNameMax" autofocus>
    </label>
    <label class="cab-field">
      <span>{{ t.sectionDesc }}</span>
      <input v-model="form.description" class="cab-input" type="text" :maxlength="forumLimits.sectionDescMax">
    </label>
    <label class="cab-field">
      <span>{{ t.sectionSort }}</span>
      <input v-model.number="form.sort" class="cab-input cab-input--sm" type="number" step="1">
    </label>
    <div class="cab-actions">
      <UiButton type="submit" size="sm" :loading="pending">{{ t.save }}</UiButton>
      <UiButton variant="ghost" size="sm" @click="emit('cancel')">{{ t.cancel }}</UiButton>
    </div>
  </form>
</template>