<script setup lang="ts">
import { forumLimits } from '#shared/forum'

const props = defineProps<{
  category?: string
}>()

const route = useRoute()
const localePath = useLocalePath()
const { t } = useForum()

const q = ref(typeof route.query.q === 'string' ? route.query.q : '')
const hint = ref('')

const active = computed(() => typeof route.query.q === 'string' && route.query.q.trim().length > 0)
const clearTo = computed(() => props.category ? localePath(`/forum/${props.category}`) : localePath('/forum'))

watch(() => route.query.q, (value) => {
  q.value = typeof value === 'string' ? value : ''
  hint.value = ''
})

function submit() {
  const value = q.value.trim()
  if (value.length > 0 && value.length < forumLimits.searchMin) {
    hint.value = fmt(t.value.searchShort, { min: forumLimits.searchMin })
    return
  }
  hint.value = ''
  const path = props.category ? localePath(`/forum/${props.category}`) : localePath('/forum')
  navigateTo({ path, query: value ? { q: value.slice(0, forumLimits.searchMax) } : {} })
}
</script>

<template>
  <form class="forum-search" role="search" @submit.prevent="submit">
    <label class="visually-hidden" for="forum-search">{{ t.searchPlaceholder }}</label>
    <input
      id="forum-search"
      v-model="q"
      class="cab-input forum-search__field"
      type="search"
      name="q"
      :placeholder="t.searchPlaceholder"
      :maxlength="forumLimits.searchMax"
    >
    <UiButton type="submit" size="sm">{{ t.search }}</UiButton>
    <NuxtLink v-if="active" :to="clearTo" class="cab-link">{{ t.clearSearch }}</NuxtLink>
    <p v-if="hint" class="forum-search__hint" role="status">{{ hint }}</p>
  </form>
</template>
