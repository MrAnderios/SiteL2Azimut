<script setup lang="ts">
import { links, nav, navTarget } from '~/data/site'

const t = useContent()
const localePath = useLocalePath()
const route = useRoute()
// Лендинг рендерится без обращения к сессии; вошедшим кнопка «Войти» меняется на «Кабинет» уже в браузере
// Если новый кабинет выключен (статика без API), сессию не запрашиваем, кнопка ведёт в старую CMS
const cabinetEnabled = useCabinetEnabled()
const auth = useAuth()
const user = auth.user
const cabinetHref = computed(() => cabinetEnabled ? (user.value ? links.cabinet : links.login) : links.legacyCabinet)
onMounted(() => {
  if (cabinetEnabled) auth.ensure()
})

const scrolled = ref(false)
const menuOpen = ref(false)

function onScroll() {
  scrolled.value = window.scrollY > 24
}

function closeMenu() {
  menuOpen.value = false
}

onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
})
</script>

<template>
  <header class="header" :class="{ 'is-scrolled': scrolled || menuOpen, 'is-open': menuOpen }">
    <div class="container header__inner">
      <AppLogo @click="closeMenu" />

      <nav id="main-nav" class="header__nav" :aria-label="t.header.navAria">
        <NuxtLink
          v-for="item in nav"
          :key="item.href"
          :to="navTarget(item.href, localePath)"
          active-class=""
          exact-active-class=""
          :class="{ 'is-active': !item.href.startsWith('#') && route.path === localePath(item.href) }"
          @click="closeMenu"
        >
          {{ t.nav[item.key] }}
        </NuxtLink>
      </nav>

      <div class="header__actions">
        <AppLangSwitch @click="closeMenu" />
        <UiButton :href="cabinetHref" size="sm">{{ user ? t.header.cabinet : t.header.login }}</UiButton>
        <button
          type="button"
          class="header__burger"
          :aria-expanded="menuOpen"
          aria-controls="main-nav"
          :aria-label="menuOpen ? t.header.closeMenu : t.header.openMenu"
          @click="menuOpen = !menuOpen"
        >
          <UiIcon :name="menuOpen ? 'close' : 'menu'" />
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.header {
  position: fixed;
  inset: 0 0 auto;
  z-index: 50;
  border-bottom: 1px solid transparent;
  transition: background-color 0.3s, border-color 0.3s, backdrop-filter 0.3s;
}

.header.is-scrolled {
  background: rgb(10 8 6 / 0.82);
  backdrop-filter: blur(12px);
  border-bottom-color: var(--color-line);
}

.header__inner {
  display: flex;
  align-items: center;
  gap: 40px;
  height: var(--header-height);
}

.header__nav {
  display: flex;
  gap: 32px;
  margin-left: auto;
}

.header__nav a {
  position: relative;
  padding-block: 6px;
  color: var(--color-text-muted);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  transition: color 0.2s;
}

.header__nav a::after {
  content: '';
  position: absolute;
  left: 50%;
  right: 50%;
  bottom: 0;
  height: 1px;
  background: var(--gold-500);
  transition: left 0.3s var(--ease-out), right 0.3s var(--ease-out);
}

.header__nav a:hover,
.header__nav a.is-active {
  color: var(--gold-300);
}

.header__nav a:hover::after,
.header__nav a.is-active::after {
  left: 0;
  right: 0;
}

.header__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header__burger {
  display: none;
  padding: 6px;
  border: 0;
  background: none;
  color: var(--gold-300);
  cursor: pointer;
}

@media (max-width: 900px) {
  .header__actions {
    margin-left: auto;
  }

  .header__burger {
    display: inline-flex;
  }

  .header__nav {
    position: absolute;
    top: var(--header-height);
    left: 0;
    right: 0;
    flex-direction: column;
    gap: 0;
    margin: 0;
    padding: 8px var(--gutter) 24px;
    background: rgb(10 8 6 / 0.96);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--color-line);
    opacity: 0;
    visibility: hidden;
    transform: translateY(-8px);
    transition: opacity 0.25s, transform 0.25s var(--ease-out), visibility 0.25s;
  }

  .header.is-open .header__nav {
    opacity: 1;
    visibility: visible;
    transform: none;
  }

  .header__nav a {
    padding-block: 14px;
    border-bottom: 1px solid var(--color-line);
    font-size: 14px;
  }

  .header__nav a::after {
    display: none;
  }
}
</style>
