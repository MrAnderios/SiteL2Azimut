<script setup lang="ts">
// Модальное окно на нативном <dialog>: фокус, Esc и верхний слой браузер берёт на себя
const open = defineModel<boolean>('open', { default: false })

defineProps<{
  title?: string
  /** Подпись кнопки закрытия для скринридеров */
  closeLabel?: string
}>()

const dialog = ref<HTMLDialogElement>()

watch(open, (value) => {
  const el = dialog.value
  if (!el) return
  if (value && !el.open) el.showModal()
  else if (!value && el.open) el.close()
  document.documentElement.style.overflow = value ? 'hidden' : ''
})

onBeforeUnmount(() => {
  document.documentElement.style.overflow = ''
})

// Закрытие кликом по подложке (клик пришёл в сам <dialog>, а не в его содержимое)
function onClick(event: MouseEvent) {
  if (event.target === dialog.value) open.value = false
}
</script>

<template>
  <dialog
    ref="dialog"
    class="modal"
    :aria-label="title"
    @click="onClick"
    @close="open = false"
  >
    <div class="modal__box panel">
      <header class="modal__head">
        <h2 v-if="title" class="modal__title text-gold">{{ title }}</h2>
        <button type="button" class="modal__close" :aria-label="closeLabel" @click="open = false">
          <UiIcon name="close" :size="22" />
        </button>
      </header>
      <div class="modal__body">
        <slot />
      </div>
    </div>
  </dialog>
</template>

<style scoped>
.modal {
  width: min(720px, calc(100% - 32px));
  max-height: calc(100dvh - 48px);
  margin: auto;
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-text);
  overflow: visible;
}

.modal::backdrop {
  background: rgb(5 4 3 / 0.78);
  backdrop-filter: blur(4px);
}

.modal[open],
.modal[open]::backdrop {
  animation: modal-fade 0.25s var(--ease-out);
}

.modal[open] .modal__box {
  animation: modal-rise 0.35s var(--ease-out);
}

.modal__box {
  display: flex;
  flex-direction: column;
  max-height: calc(100dvh - 48px);
  background: var(--color-surface);
  border: 1px solid var(--color-line-strong);
  box-shadow: 0 30px 80px rgb(0 0 0 / 0.7), var(--shadow-glow);
}

.modal__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 28px 28px 16px;
  border-bottom: 1px solid var(--color-line);
}

.modal__title {
  font-size: clamp(28px, 4vw, 40px);
  line-height: 1.1;
}

.modal__close {
  flex: none;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  margin: -6px -8px 0 0;
  border: 1px solid transparent;
  background: none;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s;
}

.modal__close:hover,
.modal__close:focus-visible {
  color: var(--gold-300);
  border-color: var(--color-line-strong);
}

.modal__body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px 28px 28px;
  overflow-y: auto;
  overscroll-behavior: contain;
  color: var(--color-text-muted);
}

@media (max-width: 600px) {
  .modal__head {
    padding: 20px 20px 12px;
  }

  .modal__body {
    padding: 16px 20px 20px;
  }
}

@keyframes modal-fade {
  from { opacity: 0; }
}

@keyframes modal-rise {
  from { opacity: 0; transform: translateY(16px) scale(0.98); }
}

@media (prefers-reduced-motion: reduce) {
  .modal[open],
  .modal[open]::backdrop,
  .modal[open] .modal__box {
    animation: none;
  }
}
</style>
