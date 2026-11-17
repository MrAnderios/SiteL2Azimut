<script setup lang="ts">
// Админ-панель: управление разделами форума.
import type { ForumIndexResponse, ForumSection } from '#shared/forum'

definePageMeta({ layout: 'cabinet', middleware: 'admin' })

const { t, notices, showError } = useForum()
const { t: cab } = useCabinet()
usePrivatePage(() => cab.value.titles.adminForum)

const { data, error, refresh } = await useCabinetFetch<ForumIndexResponse>('/api/forum')
const unavailable = computed(() => error.value?.statusCode === 503)

const showAdd = ref(false)
const editing = ref<ForumSection | null>(null)
const pending = ref(false)

async function onSaved() {
  showAdd.value = false
  editing.value = null
  await refresh()
}

async function remove(section: ForumSection) {
  if (!window.confirm(fmt(t.value.deleteSectionAsk, { name: section.name }))) return
  pending.value = true
  try {
    await $fetch(`/api/forum/sections/${section.id}`, { method: 'DELETE' })
    notices.success(t.value.sectionDeleted)
    await refresh()
  }
  catch (e) {
    showError(e)
  }
  finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="cab-page">
    <CabinetPageHead :title="t.adminTitle" :subtitle="t.adminIntro" />

    <div v-if="unavailable" class="cab-note cab-note--error">{{ t.unavailableText }}</div>
    <div v-else-if="error && error.statusCode !== 401" class="cab-note cab-note--error">
      {{ t.loadError }}
      <button type="button" class="cab-link cab-retry" @click="() => refresh()">{{ t.retry }}</button>
    </div>

    <template v-else-if="data">
      <div class="cab-actions">
        <UiButton v-if="!showAdd" @click="showAdd = true; editing = null">+ {{ t.addSection }}</UiButton>
      </div>

      <section v-if="showAdd" class="panel cab-panel">
        <h2 class="cab-panel__title">{{ t.addSection }}</h2>
        <ForumSectionForm @saved="onSaved" @cancel="showAdd = false" />
      </section>

      <section class="panel cab-panel">
        <div class="cab-table-wrap">
          <table class="cab-table cab-table--stack">
            <thead>
              <tr>
                <th>{{ t.sectionName }}</th>
                <th>{{ t.sectionDesc }}</th>
                <th class="cab-num">{{ t.sectionSort }}</th>
                <th class="cab-num">{{ t.topics }}</th>
                <th>{{ t.editSection }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in data.sections" :key="s.id">
                <td class="cab-nowrap" :data-label="t.sectionName">{{ s.name }}</td>
                <td :data-label="t.sectionDesc">{{ s.description || '—' }}</td>
                <td class="cab-num" :data-label="t.sectionSort">{{ s.sort }}</td>
                <td class="cab-num" :data-label="t.topics">{{ s.topicCount }}</td>
                <td :data-label="t.editSection">
                  <div class="cab-inline-form">
                    <UiButton variant="secondary" size="sm" @click="editing = s; showAdd = false">{{ t.editSection }}</UiButton>
                    <UiButton variant="ghost" size="sm" :disabled="pending" @click="remove(s)">{{ t.delete }}</UiButton>
                  </div>
                </td>
              </tr>
              <tr v-if="!data.sections.length">
                <td colspan="5" class="cab-empty-row">{{ t.sectionsEmpty }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section v-if="editing" class="panel cab-panel">
        <h2 class="cab-panel__title">{{ t.editSection }}: {{ editing.name }}</h2>
        <ForumSectionForm :section="editing" @saved="onSaved" @cancel="editing = null" />
      </section>
    </template>
  </div>
</template>

<style scoped>
.cab-retry {
  margin-left: 8px;
  padding: 0;
  border-width: 0 0 1px;
  background: none;
  font: inherit;
  cursor: pointer;
}
</style>