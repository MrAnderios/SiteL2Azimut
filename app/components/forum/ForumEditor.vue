<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'
import type { EditorCustomHandlers, EditorToolbarItem } from '@nuxt/ui'
import { forumLimits } from '#shared/forum'
import { isForumUrl, normalizeForumUrl, normalizedForumBody } from '~/utils/forum'

const model = defineModel<string>({ required: true })

defineProps<{
  label: string
  placeholder: string
}>()

const { t } = useForum()
const linkError = ref('')

const length = computed(() => normalizedForumBody(model.value).length)
const over = computed(() => length.value > forumLimits.bodyMax)

watch(model, () => {
  linkError.value = ''
})

const handlers = {
  link: {
    canExecute: (editor: Editor) => editor.can().setLink({ href: 'https://example.com' }) || editor.isActive('link'),
    execute: (editor: Editor) => {
      const previous = String(editor.getAttributes('link').href || '')
      const entered = window.prompt(t.value.editor.linkPrompt, previous || 'https://')
      const chain = editor.chain()
      if (entered === null) return chain
      const href = entered.trim()
      if (!href) {
        linkError.value = ''
        return chain.focus().extendMarkRange('link').unsetLink()
      }
      const next = normalizeForumUrl(href)
      if (!next || !isForumUrl(next)) {
        linkError.value = t.value.editor.linkInvalid
        return chain
      }
      linkError.value = ''
      const focused = chain.focus().extendMarkRange(editor.isActive('code') ? 'code' : 'link')
      return focused.setLink({ href: next })
    },
    isActive: (editor: Editor) => editor.isActive('link'),
    isDisabled: (editor: Editor) => editor.state.selection.empty && !editor.isActive('link'),
  },
} satisfies EditorCustomHandlers

const items = computed<EditorToolbarItem<typeof handlers>[][]>(() => {
  const label = t.value.editor
  return [[{
    kind: 'undo',
    icon: 'i-lucide-undo',
    'aria-label': label.undo,
    tooltip: { text: label.undo },
  }, {
    kind: 'redo',
    icon: 'i-lucide-redo',
    'aria-label': label.redo,
    tooltip: { text: label.redo },
  }], [{
    icon: 'i-lucide-heading',
    'aria-label': label.heading,
    tooltip: { text: label.heading },
    content: { align: 'start' },
    items: [{
      kind: 'heading',
      level: 2,
      icon: 'i-lucide-heading-2',
      label: label.heading2,
    }, {
      kind: 'heading',
      level: 3,
      icon: 'i-lucide-heading-3',
      label: label.heading3,
    }],
  }, {
    kind: 'bulletList',
    icon: 'i-lucide-list',
    'aria-label': label.bulletList,
    tooltip: { text: label.bulletList },
  }, {
    kind: 'orderedList',
    icon: 'i-lucide-list-ordered',
    'aria-label': label.orderedList,
    tooltip: { text: label.orderedList },
  }, {
    kind: 'blockquote',
    icon: 'i-lucide-text-quote',
    'aria-label': label.quote,
    tooltip: { text: label.quote },
  }, {
    kind: 'codeBlock',
    icon: 'i-lucide-square-code',
    'aria-label': label.codeBlock,
    tooltip: { text: label.codeBlock },
  }], [{
    kind: 'mark',
    mark: 'bold',
    icon: 'i-lucide-bold',
    'aria-label': label.bold,
    tooltip: { text: label.bold },
  }, {
    kind: 'mark',
    mark: 'italic',
    icon: 'i-lucide-italic',
    'aria-label': label.italic,
    tooltip: { text: label.italic },
  }, {
    kind: 'mark',
    mark: 'underline',
    icon: 'i-lucide-underline',
    'aria-label': label.underline,
    tooltip: { text: label.underline },
  }, {
    kind: 'mark',
    mark: 'strike',
    icon: 'i-lucide-strikethrough',
    'aria-label': label.strike,
    tooltip: { text: label.strike },
  }, {
    kind: 'mark',
    mark: 'code',
    icon: 'i-lucide-code',
    'aria-label': label.code,
    tooltip: { text: label.code },
  }], [{
    kind: 'link',
    icon: 'i-lucide-link',
    'aria-label': label.link,
    tooltip: { text: label.link },
  }, {
    kind: 'horizontalRule',
    icon: 'i-lucide-separator-horizontal',
    'aria-label': label.rule,
    tooltip: { text: label.rule },
  }]].map(group => group.map(item => ({ ...item, type: 'button' as const })))
})

const starterKit = {
  heading: { levels: [2, 3] as [2, 3] },
  link: {
    openOnClick: false,
    defaultProtocol: 'https',
    HTMLAttributes: {
      rel: 'nofollow noopener noreferrer ugc',
      target: '_blank',
    },
    isAllowedUri: (url: string, ctx: { defaultValidate: (value: string) => boolean }) => {
      return ctx.defaultValidate(url) && isForumUrl(url)
    },
  },
}
</script>

<template>
  <div class="forum-editor" :class="{ 'is-over': over }">
    <UEditor
      v-slot="{ editor }"
      v-model="model"
      content-type="markdown"
      :immediately-render="false"
      :image="false"
      :mention="false"
      :starter-kit="starterKit"
      :handlers="handlers"
      :placeholder="{ placeholder, mode: 'firstLine' }"
      :aria-label="label"
      :aria-invalid="over || undefined"
      class="forum-editor__field"
    >
      <UEditorToolbar :editor="editor" :items="items" class="forum-editor__bar" />
    </UEditor>
    <p class="forum-editor__count" :class="{ 'is-over': over }">{{ length }} / {{ forumLimits.bodyMax }}</p>
    <p v-if="over" class="forum-editor__error">{{ fmt(t.errors.invalid_post, { max: forumLimits.bodyMax }) }}</p>
    <p v-else-if="linkError" class="forum-editor__error">{{ linkError }}</p>
  </div>
</template>
