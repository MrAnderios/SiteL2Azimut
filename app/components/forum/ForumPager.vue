<script setup lang="ts">
const props = defineProps<{ page: number, pages: number }>()

const route = useRoute()
const { t } = useForum()

function to(page: number) {
  const query = { ...route.query }
  if (page > 1) query.page = String(page)
  else delete query.page
  return { path: route.path, query }
}

const items = computed(() => {
  const { page, pages } = props
  const near = pages <= 7
    ? Array.from({ length: pages }, (_, i) => i + 1)
    : [...new Set([1, pages, page - 1, page, page + 1].filter(n => n >= 1 && n <= pages))].sort((a, b) => a - b)
  return near.map((n, i) => ({ n, gap: i > 0 && n - near[i - 1]! > 1 }))
})
</script>

<template>
  <nav v-if="pages > 1" class="forum-pager" :aria-label="t.pager">
    <NuxtLink v-if="page > 1" :to="to(page - 1)" class="cab-link">{{ t.prev }}</NuxtLink>
    <template v-for="item in items" :key="item.n">
      <span v-if="item.gap" class="forum-pager__gap" aria-hidden="true">…</span>
      <span v-if="item.n === page" class="forum-pager__page is-current" aria-current="page">{{ item.n }}</span>
      <NuxtLink v-else :to="to(item.n)" class="forum-pager__page">{{ item.n }}</NuxtLink>
    </template>
    <NuxtLink v-if="page < pages" :to="to(page + 1)" class="cab-link">{{ t.next }}</NuxtLink>
  </nav>
</template>
