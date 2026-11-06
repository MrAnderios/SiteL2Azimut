<script setup lang="ts">
import type { IconName } from './UiIcon.vue'

const props = withDefaults(
  defineProps<{
    href?: string
    variant?: 'primary' | 'secondary' | 'ghost'
    size?: 'sm' | 'md' | 'lg'
    icon?: IconName
  }>(),
  { variant: 'primary', size: 'md' },
)

const isExternal = computed(() => !!props.href && /^https?:\/\//.test(props.href))
const classes = computed(() => ['btn', `btn--${props.variant}`, `btn--${props.size}`])
</script>

<template>
  <a
    v-if="href"
    :href="href"
    :target="isExternal ? '_blank' : undefined"
    :rel="isExternal ? 'noopener' : undefined"
    :class="classes"
  >
    <UiIcon v-if="icon" :name="icon" :size="size === 'lg' ? 20 : 18" />
    <span><slot /></span>
  </a>
  <button v-else type="button" :class="classes">
    <UiIcon v-if="icon" :name="icon" :size="size === 'lg' ? 20 : 18" />
    <span><slot /></span>
  </button>
</template>

<style scoped>
/* Кнопки со срезанными углами; рамка secondary рисуется двумя слоями clip-path */
.btn {
  --cut: 10px;
  --shape: polygon(var(--cut) 0, 100% 0, 100% calc(100% - var(--cut)), calc(100% - var(--cut)) 100%, 0 100%, 0 var(--cut));

  position: relative;
  isolation: isolate;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: 0;
  background: none;
  font: inherit;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  white-space: nowrap;
  cursor: pointer;
  clip-path: var(--shape);
  transition: color 0.25s, filter 0.25s, transform 0.25s var(--ease-out);
}

.btn::before,
.btn::after {
  content: '';
  position: absolute;
  z-index: -1;
  clip-path: var(--shape);
  transition: background 0.25s, opacity 0.25s;
}

.btn::before {
  inset: 0;
}

.btn::after {
  inset: 1px;
}

.btn:active {
  transform: translateY(1px);
}

.btn--sm { --cut: 7px; padding: 9px 18px; font-size: 11px; }
.btn--md { padding: 13px 26px; font-size: 12px; }
.btn--lg { --cut: 12px; padding: 18px 36px; font-size: 14px; }

/* primary: золотой слиток */
.btn--primary {
  color: #1a1206;
  text-shadow: 0 1px 0 rgb(255 255 255 / 0.35);
}

.btn--primary::before {
  background: linear-gradient(180deg, var(--gold-100), var(--gold-700));
}

.btn--primary::after {
  background: var(--gradient-gold-btn);
}

.btn--primary:hover {
  filter: brightness(1.12) drop-shadow(0 0 14px rgb(226 171 63 / 0.55));
}

/* secondary: золотая рамка */
.btn--secondary {
  color: var(--gold-300);
}

.btn--secondary::before {
  background: linear-gradient(180deg, var(--gold-300), var(--gold-700));
}

.btn--secondary::after {
  background: rgb(10 8 6 / 0.85);
}

.btn--secondary:hover {
  color: var(--gold-100);
  filter: drop-shadow(0 0 10px rgb(226 171 63 / 0.4));
}

.btn--secondary:hover::after {
  background: rgb(40 28 10 / 0.9);
}

/* ghost: без фона */
.btn--ghost {
  color: var(--color-text-muted);
}

.btn--ghost:hover {
  color: var(--gold-300);
}
</style>
