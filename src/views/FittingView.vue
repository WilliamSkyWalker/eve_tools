<template>
  <div class="fitting-sim">
    <h1 class="title">{{ t('fit.title') }}</h1>

    <!-- Ship Search -->
    <ShipSearch @select="onShipSelect" />

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
          <img class="ship-icon" :src="`https://images.evetech.net/types/${store.shipTypeId}/render?size=128`" alt="" loading="lazy">
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

        <!-- EFT Import/Export -->
        <EftPanel />
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
import { calculateFit } from '../services/dogmaEngine'
import { computeStats } from '../services/fittingStats'
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
  color: #c8aa6e;
  font-size: 1.8em;
  margin-bottom: 16px;
  text-align: center;
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
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 8px;
  padding: 12px 14px;
}

.ship-icon {
  width: 64px;
  height: 64px;
  border-radius: 6px;
  flex-shrink: 0;
  background: #0d0d0d;
}

.ship-info {
  flex: 1;
  min-width: 0;
}

.ship-name {
  color: #c8aa6e;
  font-size: 1.1em;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fit-name-input {
  background: transparent;
  border: none;
  border-bottom: 1px solid #2a2a2a;
  color: #8a8a8a;
  font-size: 0.82em;
  padding: 2px 0;
  width: 100%;
  outline: none;
}

.fit-name-input:focus {
  border-bottom-color: #c8aa6e;
  color: #d0d0d0;
}

.clear-btn {
  background: #2a2a2a;
  border: none;
  color: #8a8a8a;
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
  background: #2a2a2a;
  border: none;
  padding: 5px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85em;
  transition: background 0.15s;
}

.action-btn:hover {
  background: #3a3a3a;
}

.clear-btn:hover {
  background: #3a3a3a;
  color: #ef5350;
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
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 4px;
  padding: 3px 6px 3px 10px;
  font-size: 0.75em;
}

.saved-name {
  color: #8a8a8a;
  cursor: pointer;
  transition: color 0.15s;
}

.saved-name:hover {
  color: #c8aa6e;
}

.del-btn {
  background: none;
  border: none;
  color: #555;
  cursor: pointer;
  font-size: 1.1em;
  padding: 0 2px;
}

.del-btn:hover {
  color: #ef5350;
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
