<template>
  <div class="slot-row">
    <div class="slot-label" :style="{ color }">
      {{ label }}
      <span v-if="slotType === 'hi' && hardpointInfo" class="hp-info">{{ hardpointInfo }}</span>
    </div>
    <div class="slot-cells">
      <div
        v-for="(typeId, i) in slots"
        :key="i"
        class="slot-cell"
        :class="{ filled: typeId, empty: !typeId, 'drop-hover': dropTarget === i, offline: typeId && isOfflineFn(slotType, i) }"
        :style="{ '--accent': color }"
        @click="onLeftClick(typeId, i)"
        @contextmenu.prevent="typeId && $emit('slotRemove', { slotType, index: i })"
        @dragover.prevent="onDragOver($event, i)"
        @dragleave="onDragLeave(i)"
        @drop.prevent="onDrop($event, i)"
      >
        <template v-if="typeId && typeData(typeId)">
          <img class="mod-icon" :src="`https://images.evetech.net/types/${typeId}/icon?size=32`" alt="" loading="lazy">
          <span class="mod-name">{{ displayName(typeId) }}</span>
          <!-- Charge indicator for weapons -->
          <span v-if="getCharge(i)" class="charge-name" @click.stop="$emit('slotChargeClick', { slotType, index: i })">{{ chargeName(getCharge(i)) }}</span>
          <button v-else-if="isWeapon(typeId)" class="charge-btn" @click.stop="$emit('slotChargeClick', { slotType, index: i })">+{{ t('fit.charge') }}</button>
        </template>
        <span v-else-if="!typeId" class="empty-label">{{ emptyLabel }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { getDogmaData } from '../../data/loader'
import { useI18n } from '../../i18n'
import { locName } from '../../services/locale'
import { useFittingStore } from '../../stores/fitting'

const props = defineProps({
  label: String,
  slotType: String,
  slots: Array,
  color: { type: String, default: '#c8aa6e' },
  isOfflineFn: { type: Function, default: () => false },
})
const emit = defineEmits(['slotClick', 'slotRemove', 'slotDrop', 'slotToggleOffline', 'slotChargeClick'])

const { t } = useI18n()
const store = useFittingStore()
const emptyLabel = t('fit.emptySlot')
const dropTarget = ref(-1)

const hardpointInfo = computed(() => {
  if (props.slotType !== 'hi') return null
  const tHP = store.turretHardpoints
  const lHP = store.launcherHardpoints
  const parts = []
  if (tHP > 0) parts.push(`${store.fittedTurrets}/${tHP}T`)
  if (lHP > 0) parts.push(`${store.fittedLaunchers}/${lHP}L`)
  return parts.length ? parts.join(' ') : null
})

function typeData(typeId) {
  return getDogmaData()?.types[typeId] || null
}

function displayName(typeId) {
  const td = typeData(typeId)
  return td ? locName(td) : String(typeId)
}

function isWeapon(typeId) {
  const td = typeData(typeId)
  if (!td?.e) return false
  return td.e.includes(42) || td.e.includes(40)  // turret or launcher
}

function getCharge(index) {
  return store.charges[`${props.slotType}-${index}`] || null
}

function chargeName(chargeTypeId) {
  const td = typeData(chargeTypeId)
  return td ? locName(td) : ''
}

function onLeftClick(typeId, index) {
  if (typeId) {
    // Filled slot: toggle offline
    emit('slotToggleOffline', { slotType: props.slotType, index })
  } else {
    // Empty slot: open search
    emit('slotClick', { slotType: props.slotType, index })
  }
}

function onDragOver(event, index) {
  if (!event.dataTransfer.types.includes('application/eve-module')) return
  event.dataTransfer.dropEffect = 'copy'
  dropTarget.value = index
}

function onDragLeave(index) {
  if (dropTarget.value === index) dropTarget.value = -1
}

function onDrop(event, index) {
  dropTarget.value = -1
  const raw = event.dataTransfer.getData('application/eve-module')
  if (!raw) return
  try {
    const mod = JSON.parse(raw)
    if (mod.slotType === props.slotType || mod.slotType === 'drone') {
      emit('slotDrop', { slotType: props.slotType, index, typeId: mod.typeId })
    }
  } catch { /* ignore */ }
}
</script>

<style scoped>
.slot-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.slot-label {
  font-size: 0.75em;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding-left: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.hp-info {
  font-weight: 400;
  font-size: 0.9em;
  color: #666;
  text-transform: none;
  letter-spacing: 0;
}

.slot-cells {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.slot-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  background: #141414;
  border: 1px solid #222;
  border-radius: 4px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  min-height: 32px;
}

.slot-cell:hover {
  border-color: var(--accent, #c8aa6e);
  background: rgba(200, 170, 110, 0.04);
}

.slot-cell.filled {
  border-left: 2px solid var(--accent, #c8aa6e);
}

.slot-cell.offline {
  opacity: 0.4;
}

.slot-cell.drop-hover {
  border-color: var(--accent, #c8aa6e);
  background: rgba(200, 170, 110, 0.12);
  box-shadow: inset 0 0 0 1px var(--accent, #c8aa6e);
}

.mod-icon {
  width: 24px;
  height: 24px;
  border-radius: 3px;
  flex-shrink: 0;
}

.mod-name {
  color: #d0d0d0;
  font-size: 0.82em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

.charge-name {
  color: #8a8a8a;
  font-size: 0.7em;
  white-space: nowrap;
  cursor: pointer;
  flex-shrink: 0;
}

.charge-name:hover {
  color: #c8aa6e;
}

.charge-btn {
  background: rgba(200, 170, 110, 0.1);
  border: none;
  color: #666;
  font-size: 0.65em;
  padding: 2px 6px;
  border-radius: 3px;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
}

.charge-btn:hover {
  color: #c8aa6e;
  background: rgba(200, 170, 110, 0.2);
}

.empty-label {
  color: #444;
  font-size: 0.8em;
  font-style: italic;
}
</style>
