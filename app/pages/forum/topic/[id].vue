<script setup lang="ts">
// Тема форума: первое сообщение, ответы с пагинацией, форма ответа и модерация.
import type { ForumTopicResponse } from '#shared/forum'
import { forumLimits } from '#shared/forum'

const route = useRoute()
const localePath = useLocalePath()
const { t, num, date, notices, showError } = useForum()
const auth = useAuth()
await auth.ensure()
const user = auth.user

const topicId = computed(() => route.params.id as string)
const page = computed(() => String(route.query.page ?? '1'))

const { data, error, refresh } = await useFetch<ForumTopicResponse>(
  () => `/api/forum/topics/${topicId.value}`,
  { query: { page } },
)

const unavailable = computed(() => error.value?.statusCode === 503)
const notFound = computed(() => error.value?.statusCode === 404)

useHead(() => ({ title: data.value ? `${data.value.topic.title} — ${t.value.title} — Azimut` : t.value.title }))
useSeoMeta({ description: () => data.value?.topic.title || t.value.description })

const isAdmin = computed(() => !!user.value?.isAdmin)
const canModifyTopic = computed(() => !!user.value && !!data.value && (data.value.topic.authorId === user.value.id || isAdmin.value))
const canReply = computed(() => !!user.value && !!data.value && !data.value.topic.isLocked)

function canModifyPost(authorId: number): boolean {
  return !!user.value && (authorId === user.value.id || isAdmin.value)
}

// Редактирование темы (заголовок и первое сообщение)
const editingTopic = ref(false)
const topicDraft = reactive({ title: '', body: '' })
const pending = ref(false)

function startEditTopic() {
  if (!data.value) return
  topicDraft.title = data.value.topic.title
  topicDraft.body = data.value.topic.body
  editingTopic.value = true
}

async function saveTopic() {
  pending.value = true
  try {
    await $fetch(`/api/forum/topics/${topicId.value}`, { method: 'PATCH', body: { title: topicDraft.title, body: topicDraft.body } })
    notices.success(t.value.topicSaved)
    editingTopic.value = false
    await refresh()
  }
  catch (e) {
    showError(e)
  }
  finally {
    pending.value = false
  }
}

async function moderate(field: 'isPinned' | 'isLocked', value: boolean) {
  pending.value = true
  try {
    await $fetch(`/api/forum/topics/${topicId.value}`, { method: 'PATCH', body: { [field]: value } })
    await refresh()
  }
  catch (e) {
    showError(e)
  }
  finally {
    pending.value = false
  }
}

async function removeTopic() {
  if (!data.value || !window.confirm(fmt(t.value.deleteTopicAsk, { title: data.value.topic.title }))) return
  pending.value = true
  try {
    const { sectionId } = await $fetch<{ sectionId: number }>(`/api/forum/topics/${topicId.value}`, { method: 'DELETE' })
    notices.success(t.value.topicDeleted)
    await navigateTo(localePath(`/forum/${sectionId}`))
  }
  catch (e) {
    showError(e)
    pending.value = false
  }
}

async function onReplied() {
  await refresh()
  // Показать новый ответ: переходим на последнюю страницу
  if (data.value && data.value.page !== data.value.pages) {
    await navigateTo({ path: route.path, query: { ...route.query, page: String(data.value.pages) } })
  }
}
</script>

<template>
  <div class="forum-shell container">
    <div class="forum-page">
      <nav class="forum-crumbs" aria-label="Breadcrumb">
        <NuxtLink :to="localePath('/forum')">{{ t.title }}</NuxtLink>
        <span class="forum-crumbs__sep">/</span>
        <NuxtLink v-if="data" :to="localePath(`/forum/${data.topic.sectionId}`)">{{ data.topic.sectionName }}</NuxtLink>
        <span class="forum-crumbs__sep">/</span>
        <span>{{ data?.topic.title ?? '…' }}</span>
      </nav>

      <div v-if="unavailable" class="panel forum-unavailable">
        <h2 class="forum-unavailable__title">{{ t.unavailableTitle }}</h2>
        <p class="forum-unavailable__text">{{ t.unavailableText }}</p>
      </div>

      <div v-else-if="notFound" class="panel forum-empty">
        {{ t.loadError }}
        <NuxtLink :to="localePath('/forum')" class="cab-link">{{ t.backToSections }}</NuxtLink>
      </div>

      <div v-else-if="error" class="cab-note cab-note--error">
        {{ t.loadError }}
        <button type="button" class="cab-link cab-retry" @click="() => refresh()">{{ t.retry }}</button>
      </div>

      <template v-else-if="data">
        <div class="forum-head">
          <div>
            <h1 class="forum-head__title text-gold">
              <span v-if="data.topic.isPinned" class="forum-badge forum-badge--pin">{{ t.pinned }}</span>
              <span v-if="data.topic.isLocked" class="forum-badge forum-badge--lock">{{ t.locked }}</span>
              {{ data.topic.title }}
            </h1>
            <p class="forum-head__subtitle">
              {{ t.author }}: {{ data.topic.authorLogin }} · {{ date(data.topic.createdAt) }}
              · {{ t.replies }}: {{ num(data.topic.replyCount) }} · {{ t.views }}: {{ num(data.topic.viewCount) }}
            </p>
          </div>
        </div>

        <!-- Первое сообщение темы -->
        <article class="panel forum-post">
          <div class="forum-post__author">
            <span class="forum-post__login">{{ data.topic.authorLogin }}</span>
            <span class="forum-post__date">{{ date(data.topic.createdAt) }}</span>
          </div>
          <div class="forum-post__main">
            <form v-if="editingTopic" class="cab-form" @submit.prevent="saveTopic">
              <label class="cab-field">
                <span>{{ t.topicTitle }}</span>
                <input v-model="topicDraft.title" class="cab-input" type="text" required :minlength="forumLimits.titleMin" :maxlength="forumLimits.titleMax">
              </label>
              <label class="cab-field">
                <span>{{ t.body }}</span>
                <textarea v-model="topicDraft.body" class="cab-input forum-textarea" required :minlength="forumLimits.bodyMin" :maxlength="forumLimits.bodyMax" />
              </label>
              <div class="cab-actions">
                <UiButton type="submit" size="sm" :loading="pending">{{ t.save }}</UiButton>
                <UiButton variant="ghost" size="sm" @click="editingTopic = false">{{ t.cancel }}</UiButton>
              </div>
            </form>
            <template v-else>
              <p class="forum-post__body">{{ data.topic.body }}</p>
              <div v-if="canModifyTopic || isAdmin" class="forum-post__actions">
                <button v-if="canModifyTopic" type="button" class="forum-post__action" @click="startEditTopic">{{ t.edit }}</button>
                <button v-if="isAdmin" type="button" class="forum-post__action" :disabled="pending" @click="moderate('isPinned', !data.topic.isPinned)">
                  {{ data.topic.isPinned ? t.unpin : t.pin }}
                </button>
                <button v-if="isAdmin" type="button" class="forum-post__action" :disabled="pending" @click="moderate('isLocked', !data.topic.isLocked)">
                  {{ data.topic.isLocked ? t.unlock : t.lock }}
                </button>
                <button v-if="canModifyTopic" type="button" class="forum-post__action forum-post__action--danger" :disabled="pending" @click="removeTopic">{{ t.delete }}</button>
              </div>
            </template>
          </div>
        </article>

        <!-- Ответы -->
        <div v-if="data.posts.length" class="forum-posts">
          <ForumPost
            v-for="post in data.posts"
            :key="post.id"
            :post="post"
            :can-modify="canModifyPost(post.authorId)"
            @changed="refresh"
            @deleted="refresh"
          />
        </div>

        <ForumPager :page="data.page" :pages="data.pages" />

        <!-- Ответ / приглашение войти / закрытая тема -->
        <ForumReplyForm v-if="canReply" :topic-id="data.topic.id" @created="onReplied" />
        <p v-else-if="data.topic.isLocked" class="cab-note">{{ t.topicLocked }}</p>
        <p v-else-if="!user" class="cab-hint">
          {{ t.loginToPost }}
          <NuxtLink :to="{ path: localePath('/login'), query: { redirect: route.fullPath } }" class="cab-link">{{ t.login }}</NuxtLink>
        </p>
      </template>
    </div>
  </div>
</template>

<style scoped>
.cab-retry {
  margin-left: 8px;
  padding: 0;
  border-width: 0 0 1px;
  background: none;
  font: inherit;
  cursor: pointer;
}
</style>