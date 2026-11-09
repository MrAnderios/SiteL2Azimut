<script setup lang="ts">
import { nav, navTarget, site, socials } from '~/data/site'

const t = useContent()
const localePath = useLocalePath()
const year = new Date().getFullYear()
</script>

<template>
  <footer class="footer">
    <UiOrnament class="footer__ornament" />
    <div class="container footer__inner">
      <div class="footer__about">
        <img src="/images/logo.png" alt="Azimut" width="148" height="40" class="footer__logo" loading="lazy">
        <p>{{ t.site.footerText }}</p>
      </div>

      <nav class="footer__col" :aria-label="t.footer.navAria">
        <h4 class="footer__heading">{{ t.footer.nav }}</h4>
        <NuxtLink
          v-for="item in nav"
          :key="item.href"
          :to="navTarget(item.href, localePath)"
          active-class=""
          exact-active-class=""
        >
          {{ t.nav[item.key] }}
        </NuxtLink>
      </nav>

      <div class="footer__col">
        <h4 class="footer__heading">{{ t.footer.contacts }}</h4>
        <a v-for="item in socials" :key="item.href" :href="item.href" target="_blank" rel="noopener">{{ item.label }}</a>
        <a :href="`mailto:${site.email}`">{{ site.email }}</a>
      </div>
    </div>
    <div class="footer__bottom">
      <div class="container">© {{ year }} {{ site.name }}. {{ t.footer.copyright }}</div>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  position: relative;
  margin-top: calc(var(--section-gap) / 2);
  background: linear-gradient(180deg, var(--color-bg), #060504);
  color: var(--color-text-muted);
  font-size: 14px;
}

.footer__ornament {
  position: absolute;
  top: -8px;
  left: 0;
  right: 0;
}

.footer__inner {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 40px;
  padding-block: 56px 40px;
  border-top: 1px solid var(--color-line);
}

.footer__about {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 380px;
}

.footer__col {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
}

.footer__heading {
  margin-bottom: 6px;
  color: var(--gold-300);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.24em;
  text-transform: uppercase;
}

.footer a {
  transition: color 0.2s;
}

.footer a:hover {
  color: var(--gold-300);
}

.footer__bottom {
  padding-block: 20px;
  border-top: 1px solid rgb(255 255 255 / 0.05);
  font-size: 12px;
  opacity: 0.7;
}

@media (max-width: 768px) {
  .footer__inner {
    grid-template-columns: 1fr 1fr;
  }

  .footer__about {
    grid-column: 1 / -1;
  }
}
</style>
