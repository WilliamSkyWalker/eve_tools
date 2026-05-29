<template>
  <div class="eft-panel">
    <button class="toggle-btn" :class="{ active: open }" @click="open = !open" :title="t('fit.gameImportExport')">
      <!-- Horizontal swap arrows: top arrow → (import), bottom arrow ← (export). -->
      <svg class="eft-icon" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M2 5h10m0 0-3-3m3 3-3 3M14 11H4m0 0 3-3m-3 3 3 3" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span class="eft-label">EFT</span>
    </button>
    <div v-if="open" class="eft-content">
      <div class="eft-hint">{{ t('fit.gameImportExport') }}</div>
      <textarea
        v-model="eftText"
        class="eft-input"
        :placeholder="t('fit.placeholder')"
        rows="10"
      ></textarea>
      <div class="eft-actions">
        <button class="btn btn-primary" @click="doImport">{{ t('fit.importEft') }}</button>
        <button class="btn btn-secondary" @click="doExport">{{ t('fit.exportEft') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useFittingStore } from '../../stores/fitting'
import { useI18n } from '../../i18n'
import { parseEft, exportEft } from '../../composables/useEftParser'

const store = useFittingStore()
const { t } = useI18n()

const open = ref(false)
const eftText = ref('')

function doImport() {
  if (!eftText.value.trim()) return
  const fit = parseEft(eftText.value)
  if (!fit || !fit.shipTypeId) return

  store.setShip(fit.shipTypeId)
  store.fitName = fit.fitName

  // Assign modules to slots
  const slotCounters = { hi: 0, med: 0, lo: 0, rig: 0, sub: 0 }
  for (const mod of fit.modules) {
    const st = mod.slotType
    if (!st || slotCounters[st] == null) continue
    const idx = slotCounters[st]
    const arr = store.getSlotArray(st)
    if (arr && idx < arr.value.length) {
      store.setModule(st, idx, mod.typeId)
      if (mod.chargeTypeId) store.setCharge(st, idx, mod.chargeTypeId)
      slotCounters[st]++
    }
  }

  // Add drones
  for (const drone of fit.drones) {
    store.addDrone(drone.typeId, drone.count)
  }
}

function doExport() {
  eftText.value = exportEft(store)
}
</script>

<style scoped>
.eft-panel {
  margin-top: 16px;
  position: relative;
}

/* Sized to match the .search-input next to it (10px*14px padding + 1px border).
   Compact icon + label so it reads as a small accessory next to the search. */
.toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #0d0d0d;
  border: 1px solid #2a2a2a;
  border-radius: 6px;
  color: #c8aa6e;
  padding: 9px 14px;
  font-size: 0.95em;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, color 0.15s;
  height: 100%;
  box-sizing: border-box;
}

.toggle-btn:hover,
.toggle-btn.active {
  border-color: #c8aa6e;
  background: #161616;
}

.eft-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: currentColor;
}

.eft-label {
  font-weight: 600;
  letter-spacing: 0.5px;
}

/* Float the panel below the toggle so it doesn't push the main layout down. */
.eft-content {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  width: 480px;
  max-width: 90vw;
  background: #0d0d0d;
  border: 1px solid #c8aa6e;
  border-radius: 6px;
  padding: 12px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.5);
  z-index: 20;
}

.eft-hint {
  color: #8a8a8a;
  font-size: 0.78em;
  margin-bottom: 8px;
}

.eft-input {
  width: 100%;
  background: #0d0d0d;
  border: 1px solid #2a2a2a;
  border-radius: 6px;
  color: #d0d0d0;
  padding: 10px 14px;
  font-size: 0.85em;
  font-family: 'Courier New', monospace;
  resize: vertical;
  box-sizing: border-box;
}

.eft-input::placeholder {
  color: #555;
}

.eft-input:focus {
  outline: none;
  border-color: #c8aa6e;
}

.eft-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.btn {
  border: none;
  border-radius: 6px;
  padding: 6px 18px;
  font-size: 0.85em;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary {
  background: #c8aa6e;
  color: #0d0d0d;
}

.btn-primary:hover {
  background: #e0c882;
}

.btn-secondary {
  background: #2a2a2a;
  color: #d0d0d0;
}

.btn-secondary:hover {
  background: #3a3a3a;
}
</style>
