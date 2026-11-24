<script setup lang="ts">
import type { AdminStreams } from '#shared/streams'

definePageMeta({ layout: 'cabinet', middleware: 'admin' })

const { t, notices, showError } = useCabinet()
usePrivatePage(() => t.value.titles.adminStreams)

const { data, refresh } = await useCabinetFetch<AdminStreams>('/api/admin/streams')

const text = ref('')
watch(() => data.value?.text, (v) => { text.value = v ?? '' }, { immediate: true })

const savePending = ref(false)

async function save() {
  savePending.value = true
  try {
    await $fetch('/api/admin/streams', { method: 'PUT', body: { text: text.value } })
    notices.success(t.value.adminStreams.saved)
    await refresh()
  }
  catch (e) {
    showError(e)
  }
  finally {
    savePending.value = false
  }
}
</script>

<template>
  <div class="cab-page">
    <CabinetPageHead :title="t.adminStreams.title" />

    <section class="panel cab-panel">
      <h2 class="cab-panel__title">{{ t.adminStreams.listTitle }}</h2>
      <p class="cab-hint">{{ t.adminStreams.hint }}</p>
      <form class="cab-form" autocomplete="off" @submit.prevent="save">
        <label class="cab-field">
          <span>{{ t.adminStreams.field }}</span>
          <textarea
            v-model="text"
            class="cab-input cab-streams-text"
            rows="12"
            :placeholder="t.adminStreams.placeholder"
            spellcheck="false"
          />
        </label>
        <div>
          <UiButton type="submit" :loading="savePending">{{ t.adminStreams.save }}</UiButton>
        </div>
      </form>
    </section>
  </div>
</template>

<style scoped>
.cab-streams-text {
  min-height: 220px;
  resize: vertical;
  line-height: 1.45;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
}
</style>