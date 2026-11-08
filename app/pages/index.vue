<script setup lang="ts">
const t = useContent()
useHead(() => ({ title: t.value.meta.pageTitle }))
</script>

<template>
  <SectionHero />
  <SectionRates />
  <SectionStreams />
  <SectionFeatures />
  <SectionBonuses />
  <SectionStore />
  <SectionStart />
  <SectionCommunity />
</template>
