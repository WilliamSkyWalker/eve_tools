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
import { watchEffect } from 'vue'
import AppHeader from './components/layout/AppHeader.vue'
import { useI18n } from './i18n'

const { t, locale } = useI18n()

watchEffect(() => {
  document.title = t('app.title')
  document.documentElement.lang = locale.value === 'zh' ? 'zh-CN' : 'en'
})
</script>
