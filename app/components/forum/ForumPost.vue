<script setup lang="ts">
import type { ForumPost } from '#shared/forum'
import { forumLimits } from '#shared/forum'
import { forumBodyReady, forumCanDeletePost } from '~/utils/forum'

const props = defineProps<{
  post: ForumPost
  index: number
  page: number
  pages: number
  count: number
  canReply: boolean
}>()

// Одно поле на всю тему: правка второго сообщения закрывает первое.
const editingId = defineModel<number | null>('editingId', { required: true })
const renamingId = defineModel<number | null>('renamingId', { required: true })

const emit = defineEmits<{
  quote: []
  changed: []
  removed: [result: { topicDeleted: boolean, slug: string }]
  error: [message: string]
}>()

const localePath = useLocalePath()
const { t, me, date, errorText, refreshMe } = useForum()

function memberTo(name: string) {
  return localePath(`/forum/u/${encodeURIComponent(name)}`)
}

const draft = ref('')
const renameValue = ref('')

const number = computed(() => (props.page - 1) * forumLimits.pageSize + props.index + 1)
const editing = computed(() => editingId.value === props.post.id)
const renaming = computed(() => renamingId.value === props.post.id)
const canDelete = computed(() => forumCanDeletePost(
  props.post,
  me.value,
  props.page === props.pages && props.index === props.count - 1,
))

function startEdit() {
  draft.value = props.post.body
  editingId.value = props.post.id
}

function startRename() {
  renameValue.value = props.post.author
  renamingId.value = props.post.id
}

async function act(task: () => Promise<void>) {
  emit('error', '')
  try {
    await task()
    emit('changed')
  }
  catch (e) {
    emit('error', errorText(e))
  }
}

async function saveEdit() {
  if (!forumBodyReady(draft.value)) return
  await act(async () => {
    await $fetch(`/api/forum/posts/${props.post.id}`, { method: 'PATCH', body: { body: draft.value } })
    editingId.value = null
  })
}

async function unhide() {
  await act(async () => {
    await $fetch(`/api/forum/posts/${props.post.id}`, { method: 'PATCH', body: { hidden: false } })
  })
}

async function remove() {
  if (!window.confirm(t.value.deletePostConfirm)) return
  emit('error', '')
  try {
    const result = await $fetch<{ topicDeleted: boolean, slug: string }>(`/api/forum/posts/${props.post.id}`, { method: 'DELETE' })
    emit('removed', result)
  }
  catch (e) {
    emit('error', errorText(e))
  }
}

async function saveRename() {
  if (!props.post.authorId) return
  await act(async () => {
    await $fetch(`/api/forum/profiles/${props.post.authorId}`, { method: 'PATCH', body: { name: renameValue.value } })
    renamingId.value = null
    await refreshMe()
  })
}

async function setBan(banned: boolean) {
  if (!props.post.authorId) return
  const ask = fmt(banned ? t.value.banConfirm : t.value.unbanConfirm, { name: props.post.author })
  if (!window.confirm(ask)) return
  await act(async () => {
    await $fetch(`/api/forum/profiles/${props.post.authorId}/ban`, { method: 'POST', body: { banned } })
  })
}
</script>

<template>
  <li :id="`p-${post.id}`" class="forum-post panel" :class="{ 'is-hidden': post.hidden }">
    <div class="forum-post__side">
      <span class="forum-post__author">
        <NuxtLink :to="memberTo(post.author)">{{ post.author }}</NuxtLink>
      </span>
      <span class="forum-post__meta">
        <span class="forum-post__tools">
          <ForumAction
            v-if="canReply && !post.hidden && !editing"
            :label="t.quote"
            icon="i-lucide-quote"
            @click="emit('quote')"
          />
          <ForumAction
            v-if="post.own && !me?.banned && !editing && (!post.hidden || me?.isAdmin)"
            :label="t.edit"
            icon="i-lucide-pencil"
            @click="startEdit"
          />
          <ForumAction
            v-if="canDelete"
            :label="t.deletePost"
            icon="i-lucide-trash"
            @click="remove"
          />
          <ForumAction
            v-if="me?.isAdmin && post.hidden"
            :label="t.unhide"
            icon="i-lucide-eye"
            @click="unhide"
          />
          <ForumAction
            v-if="me?.isAdmin && post.authorId && !renaming"
            :label="t.rename"
            icon="i-lucide-user-pen"
            @click="startRename"
          />
          <ForumAction
            v-if="me?.isAdmin && post.authorId && !post.own"
            :label="post.banned ? t.unban : t.ban"
            :icon="post.banned ? 'i-lucide-user-check' : 'i-lucide-ban'"
            @click="setBan(!post.banned)"
          />
        </span>
        <span class="forum-post__facts">
          <a class="forum-post__anchor" :href="`#p-${post.id}`">#{{ number }}</a>
          <span>{{ date(post.createdAt) }}</span>
          <span v-if="post.editedAt" class="forum-post__mark">{{ t.edited }}</span>
          <span v-if="post.hidden" class="forum-post__mark">{{ t.hidden }}</span>
          <span v-if="post.banned" class="forum-post__mark forum-post__mark--ban">{{ t.banned }}</span>
        </span>
      </span>
    </div>
    <div class="forum-post__main">
      <form v-if="editing" class="forum-compose" @submit.prevent="saveEdit">
        <ForumEditor v-model="draft" :label="t.bodyLabel" :placeholder="t.editor.placeholder" />
        <div class="forum-compose__actions">
          <UiButton type="submit" size="sm" :disabled="!forumBodyReady(draft)">{{ t.save }}</UiButton>
          <button type="button" class="forum-text-btn" @click="editingId = null">{{ t.cancel }}</button>
        </div>
      </form>
      <ForumPostBody v-else :body="post.body" :format="post.format" />
      <ForumReactions :post="post" @changed="emit('changed')" @error="emit('error', $event)" />

      <form v-if="renaming && post.authorId" class="forum-rename" @submit.prevent="saveRename">
        <input v-model="renameValue" class="cab-input" required :maxlength="forumLimits.nameMax">
        <UiButton type="submit" size="sm">{{ t.save }}</UiButton>
        <button type="button" class="forum-text-btn" @click="renamingId = null">{{ t.cancel }}</button>
      </form>
    </div>
  </li>
</template>
