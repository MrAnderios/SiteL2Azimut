<script setup lang="ts">
import { links, nav } from '~/data/site'

const t = useContent()
const { locale, locales } = useI18n()
const localePath = useLocalePath()
const switchLocalePath = useSwitchLocalePath()
// Лендинг рендерится без обращения к сессии; вошедшим кнопка «Войти» меняется на «Кабинет» уже в браузере
const auth = useAuth()
const user = auth.user
onMounted(() => auth.ensure())

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
      <NuxtLink :to="localePath('/')" class="header__logo" :aria-label="t.header.homeAria" @click="closeMenu">
        <img src="/images/logo.png" alt="Azimut" width="148" height="40">
      </NuxtLink>

      <nav id="main-nav" class="header__nav" :aria-label="t.header.navAria">
        <a v-for="item in nav" :key="item.href" :href="item.href" @click="closeMenu">{{ t.nav[item.key] }}</a>
      </nav>

      <div class="header__actions">
        <div class="header__lang" role="group" :aria-label="t.header.langAria">
          <NuxtLink
            v-for="l in locales"
            :key="l.code"
            :to="switchLocalePath(l.code)"
            :hreflang="l.language"
            :lang="l.code"
            :title="l.name"
            :aria-current="l.code === locale ? 'true' : undefined"
            :class="{ 'is-active': l.code === locale }"
            @click="closeMenu"
          >
            {{ l.code }}
          </NuxtLink>
        </div>
        <UiButton :href="user ? links.cabinet : links.login" size="sm">{{ user ? t.header.cabinet : t.header.login }}</UiButton>
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

.header__logo img {
  height: 34px;
  width: auto;
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

.header__nav a:hover {
  color: var(--gold-300);
}

.header__nav a:hover::after {
  left: 0;
  right: 0;
}

.header__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header__lang {
  display: flex;
  align-items: center;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.header__lang a {
  padding: 6px;
  color: var(--color-text-muted);
  transition: color 0.2s;
}

.header__lang a + a {
  border-left: 1px solid var(--color-line-strong);
}

.header__lang a:hover,
.header__lang a.is-active {
  color: var(--gold-300);
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
