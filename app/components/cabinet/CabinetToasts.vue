<script setup lang="ts">
const { t } = useCabinet()
const notices = useNotices()
</script>

<template>
  <div class="cab-toasts" aria-live="polite">
    <TransitionGroup name="cab-toast">
      <div
        v-for="n in notices.list.value"
        :key="n.id"
        class="cab-toast"
        :class="`cab-toast--${n.type}`"
        :role="n.type === 'error' ? 'alert' : 'status'"
      >
        <p>{{ n.text }}</p>
        <button type="button" :aria-label="t.common.close" @click="notices.remove(n.id)">
          <UiIcon name="close" :size="16" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.cab-toasts {
  position: fixed;
  top: calc(var(--header-height) + 16px);
  right: var(--gutter);
  z-index: 60;
  display: grid;
  gap: 10px;
  width: min(420px, calc(100vw - var(--gutter) * 2));
  pointer-events: none;
}

.cab-toast {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid var(--color-line-strong);
  border-left: 3px solid var(--gold-500);
  border-radius: var(--radius);
  background: rgb(22 17 12 / 0.97);
  box-shadow: 0 10px 30px rgb(0 0 0 / 0.5);
  font-size: 14px;
  pointer-events: auto;
}

.cab-toast--success {
  border-left-color: #6fcf8e;
}

.cab-toast--error {
  border-color: rgb(214 92 92 / 0.5);
  border-left-color: #d65c5c;
}

.cab-toast p {
  flex: 1;
}

.cab-toast button {
  flex: none;
  padding: 2px;
  border: 0;
  background: none;
  color: var(--color-text-muted);
  cursor: pointer;
}

.cab-toast button:hover {
  color: var(--gold-300);
}

.cab-toast-enter-active,
.cab-toast-leave-active {
  transition: opacity 0.3s, transform 0.3s var(--ease-out);
}

.cab-toast-enter-from,
.cab-toast-leave-to {
  opacity: 0;
  transform: translateX(24px);
}
</style>
