<script setup lang="ts">
const props = defineProps<{
  name: string
  avatar: string | null
  registeredAt: number
  lastSeenAt: number
  total: number
  /** Логин мастер-аккаунта. Пусто — строку не показываем. */
  login?: string | null
  banned?: boolean
  /** Слот с действиями: смена имени, бан, аватар. */
  showActions?: boolean
}>()

const { t, dateFull } = useForum()

const registered = computed(() => dateFull(props.registeredAt) || t.value.profileUnknown)
const lastSeen = computed(() => dateFull(props.lastSeenAt) || t.value.profileUnknown)
</script>

<template>
  <section class="forum-profile panel">
    <div class="forum-profile__head">
      <div class="forum-profile__identity">
        <ForumAvatar :name="name" :src="avatar" size="lg" />
        <div class="forum-profile__who">
          <h1 class="forum-profile__name text-gold">{{ name }}</h1>
          <span v-if="banned" class="forum-post__mark forum-post__mark--ban">{{ t.banned }}</span>
        </div>
      </div>
      <div v-if="showActions" class="forum-profile__actions">
        <slot />
      </div>
    </div>
    <dl class="forum-profile__facts">
      <div>
        <dt>{{ t.registered }}</dt>
        <dd>{{ registered }}</dd>
      </div>
      <div>
        <dt>{{ t.lastSeen }}</dt>
        <dd>{{ lastSeen }}</dd>
      </div>
      <div>
        <dt>{{ t.postsTitle }}</dt>
        <dd>{{ total }}</dd>
      </div>
      <div v-if="login">
        <dt>{{ t.masterAccount }}</dt>
        <dd class="forum-profile__login">{{ login }}</dd>
      </div>
    </dl>
  </section>
</template>
