<script setup lang="ts">
// Ответ в теме: автор, дата, текст и действия редактирования/удаления (для автора и админа).
import type { ForumPost } from '#shared/forum'
import { forumLimits } from '#shared/forum'

const props = defineProps<{ post: ForumPost, canModify: boolean }>()
const emit = defineEmits<{ changed: [], deleted: [] }>()

const { t, notices, showError, date } = useForum()
const editing = ref(false)
const draft = ref('')
const pending = ref(false)

function startEdit() {
  draft.value = props.post.body
  editing.value = true
}

async function save() {
  pending.value = true
  try {
    await $fetch(`/api/forum/posts/${props.post.id}`, { method: 'PATCH', body: { body: draft.value } })
    notices.success(t.value.postSaved)
    editing.value = false
    emit('changed')
  }
  catch (e) {
    showError(e)
  }
  finally {
    pending.value = false
  }
}

async function remove() {
  if (!window.confirm(t.value.deletePostAsk)) return
  pending.value = true
  try {
    await $fetch(`/api/forum/posts/${props.post.id}`, { method: 'DELETE' })
    notices.success(t.value.postDeleted)
    emit('deleted')
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
  <article class="panel forum-post">
    <div class="forum-post__author">
      <span class="forum-post__login">{{ post.authorLogin }}</span>
      <span class="forum-post__date">{{ date(post.createdAt) }}</span>
    </div>
    <div class="forum-post__main">
      <form v-if="editing" class="cab-form" @submit.prevent="save">
        <textarea v-model="draft" class="cab-input forum-textarea" required :minlength="forumLimits.bodyMin" :maxlength="forumLimits.bodyMax" />
        <div class="cab-actions">
          <UiButton type="submit" size="sm" :loading="pending">{{ t.save }}</UiButton>
          <UiButton variant="ghost" size="sm" @click="editing = false">{{ t.cancel }}</UiButton>
        </div>
      </form>
      <template v-else>
        <p class="forum-post__body">{{ post.body }}</p>
        <p v-if="post.updatedAt" class="forum-post__edited">{{ t.edited.replace('{date}', date(post.updatedAt)) }}</p>
        <div v-if="canModify" class="forum-post__actions">
          <button type="button" class="forum-post__action" @click="startEdit">{{ t.edit }}</button>
          <button type="button" class="forum-post__action forum-post__action--danger" :disabled="pending" @click="remove">{{ t.delete }}</button>
        </div>
      </template>
    </div>
  </article>
</template>