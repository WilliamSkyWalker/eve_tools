<template>
  <div class="eft-panel">
    <button class="toggle-btn" @click="open = !open">
      {{ open ? '▾' : '▸' }} EFT {{ t('fit.importEft') }} / {{ t('fit.exportEft') }}
    </button>
    <div v-if="open" class="eft-content">
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
}

.toggle-btn {
  background: none;
  border: 1px solid #2a2a2a;
  border-radius: 6px;
  color: #8a8a8a;
  padding: 6px 14px;
  font-size: 0.82em;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
  width: 100%;
  text-align: left;
}

.toggle-btn:hover {
  color: #c8aa6e;
  border-color: #3a3a3a;
}

.eft-content {
  margin-top: 8px;
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
