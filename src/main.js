import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useSettingsStore } from './stores/settings'
import './assets/main.css'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)

// Sync server from URL to store
const settings = useSettingsStore()

router.beforeEach((to) => {
  if (to.params.server && settings.server !== to.params.server) {
    settings.setServer(to.params.server)
  }
})

app.mount('#app')
