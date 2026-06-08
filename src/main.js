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

// Recover from stale chunk hashes after a redeploy. Vite emits preloadError /
// router emits onError when a code-split chunk referenced by the cached
// index.html no longer exists on the CDN; reload to fetch the new manifest.
// Guard with a 30s timestamp to avoid reload loops if a new deploy is also
// broken.
function reloadOnStaleChunk(err) {
  const msg = err?.message || String(err)
  if (!/Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/.test(msg)) return
  const last = Number(sessionStorage.getItem('eve_chunk_reload_at') || 0)
  if (Date.now() - last < 30000) return
  sessionStorage.setItem('eve_chunk_reload_at', String(Date.now()))
  window.location.reload()
}
window.addEventListener('vite:preloadError', (e) => reloadOnStaleChunk(e.payload))
router.onError(reloadOnStaleChunk)

app.mount('#app')
