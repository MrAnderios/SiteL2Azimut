<script setup lang="ts">
import type { ForumStats } from '#shared/forum'

defineProps<{
  stats: ForumStats
}>()

const { t, date } = useForum()
</script>

<template>
  <section class="forum-overview panel" :aria-label="t.statsTitle">
    <h2 class="forum-overview__title">{{ t.statsTitle }}</h2>
    <div class="forum-overview__nums">
      <p>
        <b>{{ stats.topics }}</b>
        <span>{{ t.topicsShort }}</span>
      </p>
      <p>
        <b>{{ stats.posts }}</b>
        <span>{{ t.postsShort }}</span>
      </p>
      <p>
        <b>{{ stats.members }}</b>
        <span>{{ t.membersShort }}</span>
      </p>
    </div>
    <dl v-if="stats.newest || stats.active" class="forum-overview__meta">
      <div v-if="stats.newest">
        <dt>{{ t.newestMember }}</dt>
        <dd>{{ stats.newest.name }}<template v-if="stats.newest.joinedAt"> · {{ date(stats.newest.joinedAt) }}</template></dd>
      </div>
      <div v-if="stats.active">
        <dt>{{ t.mostActive }}</dt>
        <dd>{{ stats.active.name }} · {{ fmt(t.memberPosts, { n: stats.active.posts }) }}</dd>
      </div>
    </dl>
    <div v-if="stats.names.length" class="forum-overview__people">
      <h3>{{ t.membersTitle }}</h3>
      <ul>
        <li v-for="name in stats.names" :key="name">{{ name }}</li>
      </ul>
    </div>
    <p v-else class="forum-overview__empty">{{ t.noMembers }}</p>
  </section>
</template>
