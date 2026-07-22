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
          <img class="mod-icon" :src="typeIcon(typeId)" alt="" loading="lazy" @error="onTypeIconError">
          <span class="mod-name">{{ displayName(typeId) }}</span>
          <!-- Charge indicator for weapons -->
          <span v-if="getCharge(i)" class="charge-name" @click.stop="$emit('slotChargeClick', { slotType, index: i })">{{ chargeName(getCharge(i)) }}</span>
          <button v-else-if="isWeapon(typeId)" class="charge-btn" @click.stop="$emit('slotChargeClick', { slotType, index: i })">+{{ t('fit.charge') }}</button>
          <button class="info-btn" :title="t('fit.viewAttrs')" @click.stop="$emit('slotInfo', { slotType, index: i })">ⓘ</button>
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
import { typeIcon, onTypeIconError } from '../../services/typeIcon'
import { useFittingStore } from '../../stores/fitting'

const props = defineProps({
  label: String,
  slotType: String,
  slots: Array,
  color: { type: String, default: '#d8b978' },
  isOfflineFn: { type: Function, default: () => false },
})
const emit = defineEmits(['slotClick', 'slotRemove', 'slotDrop', 'slotToggleOffline', 'slotChargeClick', 'slotInfo'])

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
  color: var(--text-dim);
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
  background: var(--bg-panel-2);
  border: 1px solid var(--bg-elevated);
  border-radius: 4px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  min-height: 32px;
}

.slot-cell:hover {
  border-color: var(--accent, var(--gold));
  background: var(--gold-bg-light);
}

.slot-cell.filled {
  border-left: 2px solid var(--accent, var(--gold));
}

.slot-cell.offline {
  opacity: 0.4;
}

.slot-cell.drop-hover {
  border-color: var(--accent, var(--gold));
  background: var(--gold-bg-medium);
  box-shadow: inset 0 0 0 1px var(--accent, var(--gold));
}

.mod-icon {
  width: 24px;
  height: 24px;
  border-radius: 3px;
  flex-shrink: 0;
}

.mod-name {
  color: var(--text-primary);
  font-size: 0.82em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

.charge-name {
  color: var(--text-muted);
  font-size: 0.7em;
  white-space: nowrap;
  cursor: pointer;
  flex-shrink: 0;
}

.charge-name:hover {
  color: var(--gold);
}

.charge-btn {
  background: var(--gold-bg-medium);
  border: none;
  color: var(--text-dim);
  font-size: 0.65em;
  padding: 2px 6px;
  border-radius: 3px;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
}

.charge-btn:hover {
  color: var(--gold);
  background: var(--gold-line);
}

.info-btn {
  background: none;
  border: none;
  color: var(--text-dim);
  font-size: 0.95em;
  line-height: 1;
  padding: 0 2px;
  cursor: pointer;
  flex-shrink: 0;
}

.info-btn:hover {
  color: var(--gold);
}

.empty-label {
  color: var(--border-strong);
  font-size: 0.8em;
  font-style: italic;
}
</style>
