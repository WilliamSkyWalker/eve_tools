<template>
  <div class="fitting-sim">
    <div class="page-head">
      <div class="titles">
        <h1>{{ t('fit.title') }} <span class="srv-chip gf beta-chip">{{ t('nav.beta') }}</span><PageHelp topic="fitting" /></h1>
      </div>
    </div>

    <!-- Ship search + game-fit import/export, side by side at the top -->
    <div class="top-bar">
      <ShipSearch class="top-bar-search" @select="onShipSelect" />
      <EftPanel class="top-bar-eft" />
    </div>

    <!-- Main Layout: 3 columns -->
    <div v-if="store.shipTypeId" class="main-layout">
      <!-- Left: Module Browser -->
      <div class="browser-col">
        <ModuleBrowser @auto-place="onAutoPlace" />
      </div>

      <!-- Center: Ship + Slots -->
      <div class="center-col">
        <!-- Ship Header -->
        <div class="ship-card">
          <img class="ship-icon" :src="typeIcon(store.shipTypeId, 128, 'render')" alt="" loading="lazy" @error="onTypeIconError">
          <div class="ship-info">
            <div class="ship-name">{{ shipDisplayName }}</div>
            <input v-model="store.fitName" class="fit-name-input" :placeholder="t('fit.fitName')">
          </div>
          <div class="ship-actions">
            <button class="action-btn" @click="doSave" :title="t('fit.saveFit')">💾</button>
            <button class="action-btn" @click="doShare" :title="t('fit.share')">🔗</button>
            <button class="clear-btn" @click="store.clearFit()">{{ t('fit.clearFit') }}</button>
          </div>
        </div>

        <!-- Saved fits -->
        <div v-if="savedFits.length" class="saved-fits">
          <div v-for="fit in savedFits" :key="fit.name" class="saved-fit-item">
            <span class="saved-name" @click="store.loadFit(fit)">{{ fit.name }}</span>
            <button class="del-btn" @click="doDeleteFit(fit.name)">&times;</button>
          </div>
        </div>

        <!-- Slot Layout -->
        <SlotLayout />

        <!-- Drone Bay -->
        <DroneBay />

        <!-- Implant Bay -->
        <ImplantBay />
      </div>

      <!-- Right: Stats -->
      <div class="stats-col">
        <StatsPanel :stats="fittingStats" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useFittingStore } from '../stores/fitting'
import { useI18n } from '../i18n'
import { loadDogmaData, getDogmaData } from '../data/loader'
import { locName } from '../services/locale'
import { typeIcon, onTypeIconError } from '../services/typeIcon'
import { calculateFit } from '../services/dogmaEngine'
import { computeStats } from '../services/fittingStats'
import PageHelp from '../components/layout/PageHelp.vue'
import ShipSearch from '../components/fitting/ShipSearch.vue'
import ModuleBrowser from '../components/fitting/ModuleBrowser.vue'
import SlotLayout from '../components/fitting/SlotLayout.vue'
import DroneBay from '../components/fitting/DroneBay.vue'
import ImplantBay from '../components/fitting/ImplantBay.vue'
import EftPanel from '../components/fitting/EftPanel.vue'
import StatsPanel from '../components/fitting/StatsPanel.vue'

const store = useFittingStore()
const { t } = useI18n()

const savedFits = ref([])

onMounted(async () => {
  await loadDogmaData()
  savedFits.value = store.getSavedFits()
  // Restore from URL hash if present
  const hash = window.location.hash.slice(1)
  if (hash) store.fromUrlHash(hash)
})

const shipDisplayName = computed(() => {
  const data = getDogmaData()
  if (!data || !store.shipTypeId) return ''
  const t = data.types[store.shipTypeId]
  return t ? locName(t) : ''
})

function onShipSelect(typeId) {
  store.setShip(typeId)
}

// Auto-place: double-click in module browser -> place in first empty matching slot
function onAutoPlace({ typeId, slotType, categoryId }) {
  if (categoryId === 18) {
    // Drone
    store.addDrone(typeId, 1)
    return
  }
  if (!slotType) return
  const arr = store.getSlotArray(slotType)
  if (!arr) return
  const idx = arr.value.findIndex(v => v === null)
  if (idx >= 0) {
    store.setModule(slotType, idx, typeId)
  }
}

function doSave() {
  const name = store.fitName || shipDisplayName.value || 'Unnamed'
  store.saveFit(name)
  savedFits.value = store.getSavedFits()
}

function doDeleteFit(name) {
  savedFits.value = store.deleteSavedFit(name)
}

function doShare() {
  const hash = store.toUrlHash()
  const url = `${window.location.origin}${window.location.pathname}#${hash}`
  navigator.clipboard.writeText(url)
  window.location.hash = hash
}

// Calculate fitting stats reactively
const fittingStats = computed(() => {
  const data = getDogmaData()
  if (!data || !store.shipTypeId) return {}
  const calculated = calculateFit(store, data)
  return computeStats(calculated, data)
})
</script>

<style scoped>
.fitting-sim {
  padding-top: 20px;
}

.title {
  color: var(--gold);
  font-size: 1.8em;
  margin-bottom: 16px;
  text-align: center;
}

/* Top bar: ship search + game-fit import/export, centered as a pair so they
   read as one tool row rather than two disconnected widgets. */
.top-bar {
  display: flex;
  gap: 8px;
  align-items: stretch;
  justify-content: center;
  max-width: 760px;
  margin: 0 auto;
  position: relative;
}

.top-bar-search {
  flex: 1 1 500px;
  min-width: 0;
  margin: 0 !important;
  max-width: none !important;
}

.top-bar-eft {
  flex: 0 0 auto;
  margin-top: 0 !important;
}

.main-layout {
  display: flex;
  gap: 16px;
  margin-top: 20px;
  max-width: 1300px;
  margin-left: auto;
  margin-right: auto;
}

.browser-col {
  flex: 0 0 260px;
  height: calc(100vh - 200px);
  position: sticky;
  top: 80px;
}

.center-col {
  flex: 0 0 380px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stats-col {
  flex: 1;
  min-width: 200px;
}

/* Ship Card */
.ship-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--bg-panel);
  border: 1px solid var(--border-default);
  border-radius: 8px;
  padding: 12px 14px;
}

.ship-icon {
  width: 64px;
  height: 64px;
  border-radius: 6px;
  flex-shrink: 0;
  background: var(--bg-input);
}

.ship-info {
  flex: 1;
  min-width: 0;
}

.ship-name {
  color: var(--gold);
  font-size: 1.1em;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fit-name-input {
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--border-default);
  color: var(--text-muted);
  font-size: 0.82em;
  padding: 2px 0;
  width: 100%;
  outline: none;
}

.fit-name-input:focus {
  border-bottom-color: var(--gold);
  color: var(--text-primary);
}

.clear-btn {
  background: var(--border-default);
  border: none;
  color: var(--text-muted);
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 0.75em;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
}

.ship-actions {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-shrink: 0;
}

.action-btn {
  background: var(--border-default);
  border: none;
  padding: 5px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85em;
  transition: background 0.15s;
}

.action-btn:hover {
  background: var(--border-strong);
}

.clear-btn:hover {
  background: var(--border-strong);
  color: var(--red);
}

.saved-fits {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.saved-fit-item {
  display: flex;
  align-items: center;
  gap: 4px;
  background: var(--bg-panel);
  border: 1px solid var(--border-default);
  border-radius: 4px;
  padding: 3px 6px 3px 10px;
  font-size: 0.75em;
}

.saved-name {
  color: var(--text-muted);
  cursor: pointer;
  transition: color 0.15s;
}

.saved-name:hover {
  color: var(--gold);
}

.del-btn {
  background: none;
  border: none;
  color: var(--text-dim);
  cursor: pointer;
  font-size: 1.1em;
  padding: 0 2px;
}

.del-btn:hover {
  color: var(--red);
}

/* Responsive */
@media (max-width: 1000px) {
  .main-layout {
    flex-wrap: wrap;
  }

  .browser-col {
    flex: 1 1 100%;
    height: 300px;
    position: static;
  }

  .center-col {
    flex: 1 1 auto;
  }

  .stats-col {
    flex: 1 1 100%;
  }
}
</style>
