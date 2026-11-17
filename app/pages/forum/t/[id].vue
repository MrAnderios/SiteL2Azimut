<script setup lang="ts">
import type { ForumPost, ForumTopicPage } from '#shared/forum'
import { forumCategory, forumLimits } from '#shared/forum'
import { forumBodyReady, forumQuote } from '~/utils/forum'

const route = useRoute()
const localePath = useLocalePath()
const { t, cabinetEnabled, me, date, errorText, refreshMe } = useForum()

const topicId = computed(() => String(route.params.id || ''))
const page = computed(() => {
  const n = Number(route.query.page)
  return Number.isInteger(n) && n > 0 ? n : 1
})

const { data, error, pending, refresh } = useFetch<ForumTopicPage>(() => `/api/forum/topics/${topicId.value}`, {
  query: { page },
  immediate: cabinetEnabled,
  watch: [topicId, page],
})

const copy = computed(() => (data.value ? t.value.categories[data.value.slug] : null))
const staffOnly = computed(() => !!data.value && !!forumCategory(data.value.slug)?.staffOnly)
const canReply = computed(() => {
  if (!data.value || !me.value?.name) return false
  if (staffOnly.value && !me.value.isAdmin) return false
  if (data.value.closed && !me.value.isAdmin) return false
  return true
})
const canDelete = computed(() => !!data.value?.empty && (!!data.value.own || !!me.value?.isAdmin))

useHead(() => ({
  title: data.value ? `${data.value.title} — ${t.value.pageTitle}` : t.value.pageTitle,
}))
useSeoMeta({
  description: () => data.value?.title || t.value.description,
  ogTitle: () => (data.value ? `${data.value.title} — Azimut` : t.value.pageTitle),
  robots: () => (cabinetEnabled ? 'index, follow' : 'noindex, nofollow'),
})

const reply = ref('')
const replyKey = ref(0)
const pendingReply = ref(false)
const actionError = ref('')
const editingId = ref<number | null>(null)
const draft = ref('')
const renamingId = ref<number | null>(null)
const renameValue = ref('')
const copiedId = ref<number | null>(null)
let copiedTimer = 0

function postNumber(index: number): number {
  return ((data.value?.page ?? 1) - 1) * forumLimits.pageSize + index + 1
}

function canHide(post: ForumPost, index: number): boolean {
  const pageData = data.value
  if (!pageData || post.hidden) return false
  if (me.value?.isAdmin) return true
  if (!post.own) return false
  return pageData.page === pageData.pages && index === pageData.posts.length - 1
}

function scrollToId(id: string, block: ScrollLogicalPosition) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  document.getElementById(id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block })
}

function quotePost(post: ForumPost) {
  const block = forumQuote(post.author, post.body)
  const current = reply.value.trim()
  reply.value = current ? `${current}\n\n${block}` : block
  replyKey.value += 1
  nextTick(() => scrollToId('forum-reply', 'center'))
}

async function copyLink(id: number) {
  const url = new URL(window.location.href)
  url.hash = `p-${id}`
  try {
    await navigator.clipboard.writeText(url.toString())
    copiedId.value = id
    window.clearTimeout(copiedTimer)
    copiedTimer = window.setTimeout(() => {
      if (copiedId.value === id) copiedId.value = null
    }, 2000)
  }
  catch {
    window.location.hash = `p-${id}`
  }
}

watch(() => [data.value?.id, data.value?.page, route.hash] as const, async () => {
  const id = route.hash.replace(/^#/, '')
  if (!id.startsWith('p-')) return
  await nextTick()
  document.getElementById(id)?.scrollIntoView({ block: 'start' })
})

onBeforeUnmount(() => window.clearTimeout(copiedTimer))

async function run(task: () => Promise<void>) {
  actionError.value = ''
  try {
    await task()
  }
  catch (e) {
    actionError.value = errorText(e)
  }
}

async function sendReply() {
  if (!forumBodyReady(reply.value)) return
  pendingReply.value = true
  await run(async () => {
    const result = await $fetch<{ page: number }>(`/api/forum/topics/${topicId.value}/posts`, {
      method: 'POST',
      body: { body: reply.value },
    })
    reply.value = ''
    replyKey.value += 1
    if (result.page > 1 && result.page !== page.value) {
      await navigateTo({ path: route.path, query: { page: String(result.page) } })
    }
    await refresh()
  })
  pendingReply.value = false
}

function startEdit(post: ForumPost) {
  editingId.value = post.id
  draft.value = post.body
}

async function saveEdit(post: ForumPost) {
  if (!forumBodyReady(draft.value)) return
  await run(async () => {
    await $fetch(`/api/forum/posts/${post.id}`, { method: 'PATCH', body: { body: draft.value } })
    editingId.value = null
    await refresh()
  })
}

async function setHidden(post: ForumPost, hidden: boolean) {
  if (hidden && !window.confirm(t.value.hideConfirm)) return
  await run(async () => {
    await $fetch(`/api/forum/posts/${post.id}`, { method: 'PATCH', body: { hidden } })
    await refresh()
  })
}

async function setFlag(path: 'pin' | 'close', body: { pinned?: boolean, closed?: boolean }) {
  await run(async () => {
    await $fetch(`/api/forum/topics/${topicId.value}/${path}`, { method: 'POST', body })
    await refresh()
  })
}

async function removeTopic() {
  const slug = data.value?.slug
  if (!slug || !window.confirm(t.value.deleteTopicConfirm)) return
  await run(async () => {
    await $fetch(`/api/forum/topics/${topicId.value}`, { method: 'DELETE' })
    await navigateTo(localePath(`/forum/${slug}`))
  })
}

function startRename(post: ForumPost) {
  renamingId.value = post.id
  renameValue.value = post.author
}

async function saveRename(post: ForumPost) {
  if (!post.authorId) return
  await run(async () => {
    await $fetch(`/api/forum/profiles/${post.authorId}`, { method: 'PATCH', body: { name: renameValue.value } })
    renamingId.value = null
    await refresh()
    await refreshMe()
  })
}
</script>

<template>
  <div class="forum">
    <div class="container">
      <header class="forum__head">
        <ForumUser />
        <p class="forum__crumbs">
          <NuxtLink :to="localePath('/forum')">{{ t.title }}</NuxtLink>
          <template v-if="data && copy">
            <span>/</span>
            <NuxtLink :to="localePath(`/forum/${data.slug}`)">{{ copy.title }}</NuxtLink>
          </template>
        </p>
        <h1 class="forum__title text-gold">{{ data?.title || t.title }}</h1>
        <div v-if="data" class="forum-topic__flags">
          <span v-if="data.pinned" class="forum-flag">{{ t.pinned }}</span>
          <span v-if="data.closed" class="forum-flag">{{ t.closed }}</span>
          <template v-if="me?.isAdmin">
            <button type="button" class="forum-text-btn" @click="setFlag('pin', { pinned: !data.pinned })">
              {{ data.pinned ? t.unpin : t.pin }}
            </button>
            <button type="button" class="forum-text-btn" @click="setFlag('close', { closed: !data.closed })">
              {{ data.closed ? t.open : t.close }}
            </button>
          </template>
          <button v-if="canDelete" type="button" class="forum-text-btn" @click="removeTopic">
            {{ t.deleteTopic }}
          </button>
        </div>
      </header>

      <p v-if="!cabinetEnabled" class="cab-note">{{ t.unavailable }}</p>
      <template v-else>
        <p v-if="actionError" class="cab-note cab-note--error" role="alert">{{ actionError }}</p>
        <p v-if="error" class="cab-note cab-note--error">
          {{ errorText(error) }}
          <button type="button" class="forum-text-btn" @click="() => refresh()">{{ t.retry }}</button>
        </p>
        <p v-else-if="pending && !data" class="forum-hint">{{ t.loading }}</p>
        <p v-else-if="data && !data.posts.length" class="forum-hint">{{ t.emptyPosts }}</p>

        <ol v-if="data" class="forum__posts">
          <li v-for="(post, index) in data.posts" :id="`p-${post.id}`" :key="post.id" class="forum-post panel" :class="{ 'is-hidden': post.hidden }">
            <div class="forum-post__side">
              <span class="forum-post__author">{{ post.author }}</span>
              <a class="forum-post__anchor" :href="`#p-${post.id}`">#{{ postNumber(index) }}</a>
              <span class="forum-post__meta">
                {{ date(post.createdAt) }}
                <template v-if="post.editedAt"> · {{ t.edited }}</template>
                <template v-if="post.hidden"> · {{ t.hidden }}</template>
              </span>
            </div>
            <div class="forum-post__main">
              <form v-if="editingId === post.id" class="forum-compose" @submit.prevent="saveEdit(post)">
                <ForumEditor v-model="draft" :label="t.bodyLabel" :placeholder="t.editor.placeholder" />
                <div class="forum-compose__actions">
                  <UiButton type="submit" size="sm" :disabled="!forumBodyReady(draft)">{{ t.save }}</UiButton>
                  <button type="button" class="forum-text-btn" @click="editingId = null">{{ t.cancel }}</button>
                </div>
              </form>
              <div v-else class="forum-post__body" v-html="renderPost(post.body, post.format)" />

              <div class="forum-actions">
                <button v-if="canReply && !post.hidden && editingId !== post.id" type="button" class="forum-text-btn" @click="quotePost(post)">
                  {{ t.quote }}
                </button>
                <button type="button" class="forum-text-btn" @click="copyLink(post.id)">
                  {{ copiedId === post.id ? t.copied : t.postLink }}
                </button>
                <button v-if="post.own && editingId !== post.id && (!post.hidden || me?.isAdmin)" type="button" class="forum-text-btn" @click="startEdit(post)">
                  {{ t.edit }}
                </button>
                <button v-if="canHide(post, index)" type="button" class="forum-text-btn" @click="setHidden(post, true)">
                  {{ t.hide }}
                </button>
                <button v-if="me?.isAdmin && post.hidden" type="button" class="forum-text-btn" @click="setHidden(post, false)">
                  {{ t.unhide }}
                </button>
                <button v-if="me?.isAdmin && post.authorId && renamingId !== post.id" type="button" class="forum-text-btn" @click="startRename(post)">
                  {{ t.rename }}
                </button>
              </div>
              <form v-if="renamingId === post.id && post.authorId" class="forum-rename" @submit.prevent="saveRename(post)">
                <input v-model="renameValue" class="cab-input" required :maxlength="forumLimits.nameMax">
                <UiButton type="submit" size="sm">{{ t.save }}</UiButton>
                <button type="button" class="forum-text-btn" @click="renamingId = null">{{ t.cancel }}</button>
              </form>
            </div>
          </li>
        </ol>
        <ForumPager v-if="data" :page="data.page" :pages="data.pages" />

        <p v-if="staffOnly && !me?.isAdmin" class="forum-hint">{{ t.newsReplyLocked }}</p>
        <ForumNameForm v-else-if="me?.authenticated && !me.name" />
        <p v-else-if="data?.closed && !me?.isAdmin" class="forum-hint">{{ t.closedHint }}</p>
        <p v-else-if="me && !me.authenticated" class="forum-login">
          {{ t.loginToPost }}
          <NuxtLink :to="{ path: localePath('/login'), query: { redirect: route.fullPath } }" class="cab-link">{{ t.login }}</NuxtLink>
        </p>
        <form v-else-if="canReply" id="forum-reply" class="forum-compose panel" @submit.prevent="sendReply">
          <div class="cab-field">
            <span>{{ t.bodyLabel }}</span>
            <ForumEditor :key="replyKey" v-model="reply" :label="t.bodyLabel" :placeholder="t.editor.placeholder" />
          </div>
          <UiButton type="submit" :loading="pendingReply" :disabled="!forumBodyReady(reply)">{{ t.submitReply }}</UiButton>
        </form>
      </template>
    </div>
  </div>
</template>
