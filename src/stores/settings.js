import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  const server = ref(localStorage.getItem('eve_server') || 'gf')
  const locale = ref(localStorage.getItem('eve_locale') || (navigator.language?.startsWith('zh') ? 'zh' : 'en'))
  const contractsUnlocked = ref(localStorage.getItem('eve_contracts') === '1')

  const datasource = computed(() => server.value === 'gf' ? 'serenity' : 'tranquility')
  const serverPrefix = computed(() => `/${server.value}`)

  function setServer(val) {
    server.value = val
    localStorage.setItem('eve_server', val)
  }

  function setLocale(val) {
    locale.value = val
    localStorage.setItem('eve_locale', val)
  }

  function toggleServer() {
    setServer(server.value === 'gf' ? 'of' : 'gf')
  }

  function toggleLocale() {
    setLocale(locale.value === 'zh' ? 'en' : 'zh')
  }

  function unlockContracts() {
    contractsUnlocked.value = true
    localStorage.setItem('eve_contracts', '1')
  }

  return {
    server, locale, datasource, serverPrefix, contractsUnlocked,
    setServer, setLocale, toggleServer, toggleLocale, unlockContracts,
  }
})
