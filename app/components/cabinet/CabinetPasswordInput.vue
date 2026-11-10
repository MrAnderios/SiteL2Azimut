<script setup lang="ts">
// Поле пароля с кнопкой «показать/скрыть». Все атрибуты (name, autocomplete, minlength…) уходят на <input>
defineOptions({ inheritAttrs: false })

const model = defineModel<string>({ required: true })
const { t } = useCabinet()
const visible = ref(false)
</script>

<template>
  <span class="cab-password">
    <input v-model="model" v-bind="$attrs" class="cab-input" :type="visible ? 'text' : 'password'">
    <button
      type="button"
      class="cab-password__toggle"
      :aria-label="visible ? t.fields.hidePassword : t.fields.showPassword"
      :title="visible ? t.fields.hidePassword : t.fields.showPassword"
      :aria-pressed="visible"
      @click="visible = !visible"
    >
      <UiIcon :name="visible ? 'eyeOff' : 'eye'" :size="20" />
    </button>
  </span>
</template>

<style scoped>
.cab-password {
  position: relative;
  display: block;
}

.cab-password .cab-input {
  padding-right: 46px;
}

.cab-password__toggle {
  position: absolute;
  top: 50%;
  right: 6px;
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 0;
  border-radius: var(--radius);
  background: none;
  color: var(--color-text-muted);
  cursor: pointer;
  transform: translateY(-50%);
  transition: color 0.2s;
}

.cab-password__toggle:hover,
.cab-password__toggle:focus-visible {
  color: var(--gold-300);
}

.cab-password__toggle:focus-visible {
  outline: 2px solid var(--gold-500);
  outline-offset: 0;
}
</style>
