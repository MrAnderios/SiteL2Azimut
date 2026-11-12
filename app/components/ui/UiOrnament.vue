<!-- Орнаментальный разделитель: линия — ромб — линия -->
<script setup lang="ts">
// Орнамент встречается на странице несколько раз: id градиентов должны быть уникальны
const uid = useId()
const left = `orn-l-${uid}`
const right = `orn-r-${uid}`
</script>

<template>
  <svg class="ornament" viewBox="0 0 240 16" aria-hidden="true">
    <defs>
      <linearGradient :id="left" x1="0" x2="1">
        <stop offset="0" stop-color="#e2ab3f" stop-opacity="0" />
        <stop offset="1" stop-color="#e2ab3f" />
      </linearGradient>
      <linearGradient :id="right" x1="0" x2="1">
        <stop offset="0" stop-color="#e2ab3f" />
        <stop offset="1" stop-color="#e2ab3f" stop-opacity="0" />
      </linearGradient>
    </defs>
    <path d="M0 8h96" :stroke="`url(#${left})`" />
    <path d="M144 8h96" :stroke="`url(#${right})`" />
    <path d="M102 8l6-4 6 4-6 4z M126 8l6-4 6 4-6 4z" fill="none" stroke="#e2ab3f" />
    <path d="M120 1l7 7-7 7-7-7z" fill="#e2ab3f" />
  </svg>
</template>

<style scoped>
.ornament {
  display: block;
  width: 240px;
  max-width: 70%;
  height: 16px;
  margin-inline: auto;
}
</style>
