<script setup lang="ts">
import type { ForumPost, ForumReaction, ForumReactionKind } from '#shared/forum'
import { forumCanReact } from '~/utils/forum'

const props = defineProps<{
  post: ForumPost
}>()

const emit = defineEmits<{
  changed: []
  error: [message: string]
}>()

const { t, me, errorText } = useForum()
const pending = ref<ForumReactionKind | null>(null)

const canReact = computed(() => forumCanReact(me.value, props.post))
const shown = computed(() => props.post.reactions.filter(reaction => reaction.count > 0 || canReact.value))

function label(reaction: ForumReaction) {
  const name = t.value.reactions[reaction.kind]
  return reaction.count > 0 ? fmt(t.value.reactions.count, { name, n: reaction.count }) : name
}

async function toggle(kind: ForumReactionKind) {
  if (!canReact.value || pending.value) return
  pending.value = kind
  emit('error', '')
  try {
    await $fetch(`/api/forum/posts/${props.post.id}/reactions`, { method: 'POST', body: { kind } })
    emit('changed')
  }
  catch (e) {
    emit('error', errorText(e))
  }
  finally {
    pending.value = null
  }
}
</script>

<template>
  <div v-if="shown.length" class="forum-react" role="group" :aria-label="t.reactions.group">
    <span v-for="reaction in shown" :key="reaction.kind" class="forum-react__item">
      <button
        v-if="canReact"
        type="button"
        class="forum-react__btn"
        :class="{ 'is-mine': reaction.mine }"
        :aria-pressed="reaction.mine"
        :aria-label="label(reaction)"
        :disabled="pending === reaction.kind"
        @click="toggle(reaction.kind)"
      >
        <UIcon v-if="reaction.kind === 'like'" name="i-lucide-thumbs-up" class="forum-react__icon" aria-hidden="true" />
        <span
          v-else
          class="forum-react__emoji"
          :class="{ 'is-idle': !reaction.count }"
          aria-hidden="true"
        >🤡</span>
        <span v-if="reaction.count" class="forum-react__count">{{ reaction.count }}</span>
      </button>
      <span
        v-else
        class="forum-react__btn"
        tabindex="0"
        :aria-label="label(reaction)"
      >
        <UIcon v-if="reaction.kind === 'like'" name="i-lucide-thumbs-up" class="forum-react__icon" aria-hidden="true" />
        <span
          v-else
          class="forum-react__emoji"
          :class="{ 'is-idle': !reaction.count }"
          aria-hidden="true"
        >🤡</span>
        <span v-if="reaction.count" class="forum-react__count">{{ reaction.count }}</span>
      </span>
      <span v-if="reaction.names.length" class="forum-react__who" role="tooltip">{{ reaction.names.join(', ') }}</span>
    </span>
  </div>
</template>
