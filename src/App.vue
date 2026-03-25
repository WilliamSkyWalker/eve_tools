<template>
  <div id="app">
    <AppHeader />
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { watchEffect } from 'vue'
import AppHeader from './components/layout/AppHeader.vue'
import { useI18n } from './i18n'

const { t } = useI18n()

watchEffect(() => {
  document.title = t('app.title')
})
</script>
