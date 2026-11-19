<script setup lang="ts">
import type { ForumPost, ForumTopicPage } from '#shared/forum'
import { forumCategory } from '#shared/forum'
import { forumBodyReady, forumCanDeleteTopic, forumCanReply, forumQuote } from '~/utils/forum'

const route = useRoute()
const localePath = useLocalePath()
const { t, cabinetEnabled, me, errorText } = useForum()

const topicId = computed(() => String(route.params.id || ''))
const { page } = useForumPage()

const { data, error, pending, refresh } = useFetch<ForumTopicPage>(() => `/api/forum/topics/${topicId.value}`, {
  query: { page },
  immediate: cabinetEnabled,
  watch: [topicId, page],
})

const copy = computed(() => (data.value ? t.value.categories[data.value.slug] : null))
const staffOnly = computed(() => !!data.value && !!forumCategory(data.value.slug)?.staffOnly)
const canReply = computed(() => forumCanReply(me.value, data.value, staffOnly.value))
const canDelete = computed(() => forumCanDeleteTopic(data.value, me.value?.isAdmin))

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
const replyError = ref('')
const actionError = ref('')
const editingId = ref<number | null>(null)
const renamingId = ref<number | null>(null)

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

watch(() => [data.value?.id, data.value?.page, route.hash] as const, async () => {
  const id = route.hash.replace(/^#/, '')
  if (!id.startsWith('p-')) return
  await nextTick()
  document.getElementById(id)?.scrollIntoView({ block: 'start' })
})

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
  replyError.value = ''
  try {
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
  }
  catch (e) {
    replyError.value = errorText(e)
    await nextTick()
    scrollToId('forum-reply-error', 'nearest')
  }
  finally {
    pendingReply.value = false
  }
}

async function setFlag(path: 'pin' | 'close', body: { pinned?: boolean, closed?: boolean }) {
  await run(async () => {
    await $fetch(`/api/forum/topics/${topicId.value}/${path}`, { method: 'POST', body })
    await refresh()
  })
}

async function onPostRemoved(result: { topicDeleted: boolean, slug: string }) {
  if (result.topicDeleted) {
    await navigateTo(localePath(`/forum/${result.slug}`))
    return
  }
  await refresh()
  if (data.value && page.value > data.value.pages) {
    await navigateTo({
      path: route.path,
      query: data.value.pages > 1 ? { page: String(data.value.pages) } : {},
    })
  }
}

async function removeTopic() {
  const slug = data.value?.slug
  if (!slug || !window.confirm(t.value.deleteTopicConfirm)) return
  await run(async () => {
    await $fetch(`/api/forum/topics/${topicId.value}`, { method: 'DELETE' })
    await navigateTo(localePath(`/forum/${slug}`))
  })
}
</script>

<template>
  <div class="forum">
    <div class="container">
      <header class="forum__head">
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
        <ForumBar :category="data?.slug" />
        <p v-if="actionError" class="cab-note cab-note--error" role="alert">{{ actionError }}</p>
        <ForumStatus
          v-if="error || (pending && !data)"
          :error="error"
          @retry="refresh()"
        />
        <p v-else-if="data && !data.posts.length" class="forum-hint">{{ t.emptyPosts }}</p>

        <ol v-if="data" class="forum__posts">
          <ForumPost
            v-for="(post, index) in data.posts"
            :key="post.id"
            v-model:editing-id="editingId"
            v-model:renaming-id="renamingId"
            :post="post"
            :index="index"
            :page="data.page"
            :pages="data.pages"
            :count="data.posts.length"
            :can-reply="canReply"
            @quote="quotePost(post)"
            @changed="refresh()"
            @removed="onPostRemoved"
            @error="actionError = $event"
          />
        </ol>
        <ForumPager v-if="data" :page="data.page" :pages="data.pages" />

        <p v-if="me?.banned" class="forum-hint">{{ t.bannedHint }}</p>
        <p v-else-if="staffOnly && !me?.isAdmin" class="forum-hint">{{ t.newsReplyLocked }}</p>
        <ForumNameForm v-else-if="me?.authenticated && !me.name" />
        <p v-else-if="data?.closed && !me?.isAdmin" class="forum-hint">{{ t.closedHint }}</p>
        <ForumLogin v-else-if="me && !me.authenticated" />
        <form v-else-if="canReply" id="forum-reply" class="forum-compose panel" @submit.prevent="sendReply">
          <div class="cab-field">
            <span>{{ t.bodyLabel }}</span>
            <ForumEditor :key="replyKey" v-model="reply" :label="t.bodyLabel" :placeholder="t.editor.placeholder" />
          </div>
          <p v-if="replyError" id="forum-reply-error" class="cab-note cab-note--error" role="alert">{{ replyError }}</p>
          <UiButton type="submit" :loading="pendingReply" :disabled="!forumBodyReady(reply)">{{ t.submitReply }}</UiButton>
        </form>
      </template>
    </div>
  </div>
</template>
