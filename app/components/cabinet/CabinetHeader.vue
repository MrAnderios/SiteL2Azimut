<script setup lang="ts">
const { t } = useCabinet()
const content = useContent()
const auth = useAuth()
const localePath = useLocalePath()

const menuOpen = ref(false)
const route = useRoute()
watch(() => route.fullPath, () => { menuOpen.value = false })

const items = computed(() => {
  const user = auth.user.value
  if (!user) return []
  return [
    { to: '/cabinet', label: t.value.nav.cabinet },
    { to: '/cabinet/donate', label: t.value.nav.donate },
    { to: '/cabinet/referrals', label: t.value.nav.referrals },
    ...(user.isAdmin
      ? [
          { to: '/admin', label: t.value.nav.admin, admin: true },
          { to: '/admin/referrals', label: t.value.nav.adminReferrals, admin: true },
        ]
      : []),
  ]
})

async function logout() {
  await auth.logout()
  await navigateTo(localePath('/login'))
}
</script>

<template>
  <header class="cab-header" :class="{ 'is-open': menuOpen }">
    <div class="container cab-header__inner">
      <AppLogo class="cab-header__logo" />

      <nav v-if="items.length" id="cabinet-nav" class="cab-header__nav" :aria-label="t.nav.aria">
        <NuxtLink
          v-for="item in items"
          :key="item.to"
          :to="localePath(item.to)"
          :class="{ 'is-admin': item.admin }"
          exact-active-class="is-active"
        >
          {{ item.label }}
        </NuxtLink>
        <button type="button" class="cab-header__logout" @click="logout">{{ t.nav.logout }}</button>
      </nav>

      <div class="cab-header__actions">
        <AppLangSwitch />
        <NuxtLink v-if="!items.length" :to="localePath('/')" class="cab-header__site">{{ t.nav.toSite }}</NuxtLink>
        <button
          v-if="items.length"
          type="button"
          class="cab-header__burger"
          :aria-expanded="menuOpen"
          aria-controls="cabinet-nav"
          :aria-label="menuOpen ? content.header.closeMenu : content.header.openMenu"
          @click="menuOpen = !menuOpen"
        >
          <UiIcon :name="menuOpen ? 'close' : 'menu'" />
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.cab-header {
  position: fixed;
  inset: 0 0 auto;
  z-index: 50;
  background: rgb(10 8 6 / 0.88);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--color-line);
}

.cab-header__inner {
  display: flex;
  align-items: center;
  gap: 32px;
  height: var(--header-height);
}

.cab-header__logo {
  margin-right: auto;
}

.cab-header__nav {
  display: flex;
  align-items: center;
  gap: 24px;
}

.cab-header__nav a,
.cab-header__logout {
  padding: 6px 0;
  border: 0;
  background: none;
  color: var(--color-text-muted);
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  cursor: pointer;
  transition: color 0.2s;
}

.cab-header__nav a:hover,
.cab-header__nav a.is-active,
.cab-header__logout:hover {
  color: var(--gold-300);
}

.cab-header__nav a.is-admin {
  color: #d9a066;
}

.cab-header__nav a.is-admin.is-active,
.cab-header__nav a.is-admin:hover {
  color: var(--gold-100);
}

.cab-header__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.cab-header__site {
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.cab-header__site:hover {
  color: var(--gold-300);
}

.cab-header__burger {
  display: none;
  padding: 6px;
  border: 0;
  background: none;
  color: var(--gold-300);
  cursor: pointer;
}

@media (max-width: 1000px) {
  .cab-header__burger {
    display: inline-flex;
  }

  .cab-header__nav {
    position: absolute;
    top: var(--header-height);
    left: 0;
    right: 0;
    flex-direction: column;
    align-items: stretch;
    gap: 0;
    margin: 0;
    padding: 8px var(--gutter) 24px;
    background: rgb(10 8 6 / 0.97);
    border-bottom: 1px solid var(--color-line);
    opacity: 0;
    visibility: hidden;
    transform: translateY(-8px);
    transition: opacity 0.25s, transform 0.25s var(--ease-out), visibility 0.25s;
  }

  .cab-header.is-open .cab-header__nav {
    opacity: 1;
    visibility: visible;
    transform: none;
  }

  .cab-header__nav a,
  .cab-header__logout {
    padding-block: 14px;
    border-bottom: 1px solid var(--color-line);
    font-size: 14px;
    text-align: left;
  }
}
</style>
