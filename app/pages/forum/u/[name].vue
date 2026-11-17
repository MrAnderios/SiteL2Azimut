<script setup lang="ts">
import type { ForumMemberPosts, ForumOwnPost } from '#shared/forum'
import { forumLimits } from '#shared/forum'

const route = useRoute()
const localePath = useLocalePath()
const { t, cabinetEnabled, me, date, errorText, refreshMe } = useForum()
const { page } = useForumPage()

const requested = computed(() => String(route.params.name || ''))

const { data, error, pending, refresh } = useFetch<ForumMemberPosts>(
  () => `/api/forum/members/${encodeURIComponent(requested.value)}`,
  {
    query: { page },
    immediate: cabinetEnabled,
    watch: [requested, page],
  },
)

const name = computed(() => data.value?.name || requested.value)
const own = computed(() => !!name.value && me.value?.name === name.value)
const renaming = ref(false)
const renameValue = ref('')
const actionError = ref('')

useHead(() => ({
  title: name.value ? `${name.value} — ${t.value.pageTitle}` : t.value.pageTitle,
}))
useSeoMeta({
  robots: 'noindex, nofollow',
})

watch(requested, () => {
  renaming.value = false
  actionError.value = ''
})

function postTo(post: ForumOwnPost) {
  return {
    path: localePath(`/forum/t/${post.topicId}`),
    query: post.page > 1 ? { page: String(post.page) } : {},
    hash: `#p-${post.id}`,
  }
}

function startRename() {
  renameValue.value = data.value?.name || ''
  renaming.value = true
  actionError.value = ''
}

async function act(task: () => Promise<void>) {
  actionError.value = ''
  try {
    await task()
  }
  catch (e) {
    actionError.value = errorText(e)
  }
}

async function saveRename() {
  const id = data.value?.id
  if (!id) return
  const wasOwn = own.value
  await act(async () => {
    const result = await $fetch<{ name: string }>(`/api/forum/profiles/${id}`, {
      method: 'PATCH',
      body: { name: renameValue.value },
    })
    renaming.value = false
    if (wasOwn) await refreshMe()
    const next = localePath(`/forum/u/${encodeURIComponent(result.name)}`)
    if (decodeURI(next) !== decodeURI(route.path)) await navigateTo(next)
    else await refresh()
  })
}

async function setBan(banned: boolean) {
  const id = data.value?.id
  if (!id || !data.value?.name) return
  const ask = fmt(banned ? t.value.banConfirm : t.value.unbanConfirm, { name: data.value.name })
  if (!window.confirm(ask)) return
  await act(async () => {
    await $fetch(`/api/forum/profiles/${id}/ban`, { method: 'POST', body: { banned } })
    await refresh()
  })
}
</script>

<template>
  <div class="forum">
    <div class="container">
      <header class="forum__head">
        <p class="forum__crumbs">
          <NuxtLink :to="localePath('/forum')">{{ t.title }}</NuxtLink>
          <template v-if="name">
            <span>/</span>
            <span>{{ name }}</span>
          </template>
        </p>
        <h1 class="forum__title text-gold">{{ name || t.title }}</h1>
        <div v-if="me?.isAdmin && data?.id" class="forum-topic__flags">
          <span v-if="data.banned" class="forum-post__mark forum-post__mark--ban">{{ t.banned }}</span>
          <ForumAction
            v-if="!renaming"
            :label="t.rename"
            icon="i-lucide-user-pen"
            @click="startRename"
          />
          <ForumAction
            v-if="!own"
            :label="data.banned ? t.unban : t.ban"
            :icon="data.banned ? 'i-lucide-user-check' : 'i-lucide-ban'"
            @click="setBan(!data.banned)"
          />
        </div>
        <form v-if="renaming && data?.id" class="forum-rename" @submit.prevent="saveRename">
          <input v-model="renameValue" class="cab-input" required :maxlength="forumLimits.nameMax" :aria-label="t.nameLabel">
          <UiButton type="submit" size="sm">{{ t.save }}</UiButton>
          <button type="button" class="forum-text-btn" @click="renaming = false">{{ t.cancel }}</button>
        </form>
        <p v-if="data?.total" class="forum__lead">{{ fmt(t.memberPosts, { n: data.total }) }}</p>
      </header>

      <p v-if="!cabinetEnabled" class="cab-note">{{ t.unavailable }}</p>
      <template v-else>
        <ForumBar />
        <p v-if="actionError" class="cab-note cab-note--error" role="alert">{{ actionError }}</p>
        <ForumStatus
          v-if="error || (pending && !data)"
          :error="error"
          @retry="refresh()"
        />
        <p v-else-if="data && !data.posts.length" class="forum-hint">{{ t.memberPostsEmpty }}</p>
        <ol v-else-if="data" class="forum__posts">
          <li v-for="post in data.posts" :key="post.id" class="forum-post panel" :class="{ 'is-hidden': post.hidden }">
            <div class="forum-post__side">
              <h2 class="forum-post__author">
                <NuxtLink :to="postTo(post)">{{ post.topicTitle }}</NuxtLink>
              </h2>
              <span class="forum-post__meta">
                <span class="forum-post__facts">
                  <NuxtLink class="forum-post__anchor" :to="localePath(`/forum/${post.slug}`)">{{ t.categories[post.slug].title }}</NuxtLink>
                  <span>{{ date(post.createdAt) }}</span>
                  <span v-if="post.editedAt" class="forum-post__mark">{{ t.edited }}</span>
                  <span v-if="post.hidden" class="forum-post__mark">{{ t.hidden }}</span>
                </span>
              </span>
            </div>
            <div class="forum-post__main">
              <ForumPostBody :body="post.body" :format="post.format" />
            </div>
          </li>
        </ol>
        <ForumPager v-if="data" :page="data.page" :pages="data.pages" />
      </template>
    </div>
  </div>
</template>
