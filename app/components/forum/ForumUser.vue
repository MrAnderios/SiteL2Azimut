<script setup lang="ts">
const route = useRoute()
const localePath = useLocalePath()
const auth = useAuth()
const { t, me } = useForum()

const minePath = computed(() => localePath('/forum/me'))
const onMine = computed(() => route.path === minePath.value)
const loggingOut = ref(false)

async function logout() {
  if (loggingOut.value) return
  loggingOut.value = true
  try {
    await auth.logout()
  }
  finally {
    loggingOut.value = false
  }
}
</script>

<template>
  <div v-if="me?.name" class="forum-user">
    <span class="forum-user__label">{{ t.youAre }}</span>
    <NuxtLink :to="minePath" :aria-current="onMine ? 'page' : undefined">
      <ForumAvatar v-if="me.avatar" size="sm" :name="me.name" :src="me.avatar" />
      {{ me.name }}
    </NuxtLink>
    <button type="button" class="forum-user__logout" :disabled="loggingOut" @click="logout">{{ t.logout }}</button>
  </div>
</template>
