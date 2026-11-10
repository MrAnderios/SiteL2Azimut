<script setup lang="ts">
const props = defineProps<{
  /** ISO-дата с часовым поясом, до которой идёт отсчёт */
  to: string
  /** Подписи единиц на текущем языке */
  labels: { days: string, hours: string, minutes: string, seconds: string }
}>()

const emit = defineEmits<{
  /** Отсчёт дошёл до нуля (или дата уже прошла на момент mount) */
  finish: []
}>()

const target = new Date(props.to).getTime()

// На сервере и при гидрации значение null — цифры показываем только после mount,
// чтобы не было hydration mismatch из-за разницы во времени.
const now = ref<number | null>(null)
let timer: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  now.value = Date.now()
  timer = setInterval(() => {
    now.value = Date.now()
    if (now.value >= target) clearInterval(timer)
  }, 1000)
})

onBeforeUnmount(() => clearInterval(timer))

const finished = computed(() => now.value !== null && now.value >= target)

watch(finished, (v) => {
  if (v) emit('finish')
})

const units = computed(() => {
  const diff = now.value === null ? null : Math.max(0, target - now.value)
  const part = (ms: number, mod?: number) => {
    if (diff === null) return '--'
    const v = Math.floor(diff / ms)
    return String(mod ? v % mod : v).padStart(2, '0')
  }
  return [
    { value: part(86_400_000), key: 'days', label: props.labels.days },
    { value: part(3_600_000, 24), key: 'hours', label: props.labels.hours },
    { value: part(60_000, 60), key: 'minutes', label: props.labels.minutes },
    { value: part(1000, 60), key: 'seconds', label: props.labels.seconds },
  ]
})
</script>

<template>
  <div class="countdown" role="timer" aria-live="off">
    <slot v-if="finished" name="finished" />
    <template v-else>
      <div v-for="(u, i) in units" :key="u.key" class="countdown__unit">
        <span class="countdown__value">{{ u.value }}</span>
        <span class="countdown__label">{{ u.label }}</span>
        <span v-if="i < units.length - 1" class="countdown__sep" aria-hidden="true">:</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.countdown {
  display: flex;
  justify-content: center;
  gap: clamp(14px, 3vw, 28px);
}

.countdown__unit {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: clamp(48px, 10vw, 72px);
}

.countdown__value {
  color: var(--gold-300);
  font-family: var(--font-heading);
  font-size: clamp(34px, 6vw, 52px);
  font-weight: 700;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 0 24px rgb(226 171 63 / 0.35);
}

.countdown__label {
  margin-top: 6px;
  color: var(--color-text-muted);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.25em;
  text-transform: uppercase;
}

.countdown__sep {
  position: absolute;
  top: 0;
  right: calc(clamp(14px, 3vw, 28px) / -2);
  transform: translateX(50%);
  color: var(--gold-700);
  font-family: var(--font-heading);
  font-size: clamp(28px, 5vw, 44px);
  line-height: 1;
}
</style>
