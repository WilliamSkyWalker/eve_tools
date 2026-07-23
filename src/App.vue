<template>
  <div id="app">
    <AppHeader />
    <main class="main-content">
      <!-- Force remount on URL change so per-server data (industry.json) reloads
           when toggling between /gf/* and /of/*. -->
      <router-view :key="$route.fullPath" />
    </main>
  </div>
</template>

<script setup>
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from './components/layout/AppHeader.vue'
import { useI18n } from './i18n'

const { t, locale } = useI18n()
const route = useRoute()

// Per-route <title> and canonical so each tool page is a distinct, indexable
// document (a single static canonical in index.html made Google treat every
// route as a duplicate of the homepage).
const TITLE_KEY = {
  industry: 'nav.item.industry',
  t2rank: 'nav.item.t2rank',
  pi: 'nav.item.pi',
  market: 'nav.item.market',
  'market-reprocess': 'nav.item.reprocess',
  'market-ore': 'nav.item.orevalue',
  lpstore: 'nav.item.lpstore',
  navigation: 'nav.item.navigation',
  wormhole: 'nav.item.wormhole',
  sovmap: 'nav.item.sovmap',
  fitting: 'nav.item.fitting',
  dscan: 'nav.item.dscan',
  contracts: 'nav.item.contracts',
  links: 'nav.links',
  credits: 'credits.title',
}
const ORIGIN = 'https://eve-kit.com'

function applyMeta() {
  const key = TITLE_KEY[route.name]
  document.title = key ? `${t(key)} | EVE Kit` : t('app.title')
  document.documentElement.lang = locale.value === 'zh' ? 'zh-CN' : 'en'

  // Canonical = the actual current path (query/hash stripped)
  const url = ORIGIN + (route.path === '/' ? '/' : route.path)
  const link = document.querySelector('link[rel="canonical"]')
  if (link) link.setAttribute('href', url)
  const og = document.querySelector('meta[property="og:url"]')
  if (og) og.setAttribute('content', url)
}

watch(() => [route.fullPath, locale.value], applyMeta, { immediate: true })
</script>
