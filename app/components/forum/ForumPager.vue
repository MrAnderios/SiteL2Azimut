<script setup lang="ts">
// Пагинация форума: ссылки сохраняют текущий route и меняют только ?page=.
const props = defineProps<{ page: number, pages: number }>()
const route = useRoute()
const { t } = useForum()

const items = computed<(number | 'gap')[]>(() => {
  const { page, pages } = props
  if (pages <= 1) return []
  const nums = [...new Set([1, pages, page - 1, page, page + 1])]
    .filter(n => n >= 1 && n <= pages)
    .sort((a, b) => a - b)
  const out: (number | 'gap')[] = []
  let prev = 0
  for (const n of nums) {
    if (n - prev > 1) out.push('gap')
    out.push(n)
    prev = n
  }
  return out
})

function link(n: number) {
  return { path: route.path, query: { ...route.query, page: String(n) } }
}
</script>

<template>
  <nav v-if="pages > 1" class="forum-pager" :aria-label="t.pagerAria">
    <template v-for="(it, i) in items" :key="i">
      <span v-if="it === 'gap'" class="forum-pager__gap">…</span>
      <span v-else-if="it === page" class="forum-pager__current" aria-current="page">{{ it }}</span>
      <NuxtLink v-else class="forum-pager__link" :to="link(it)">{{ it }}</NuxtLink>
    </template>
  </nav>
</template>