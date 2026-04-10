<template>
  <div class="slot-layout">
    <SlotRow
      v-for="slot in slotRows"
      :key="slot.type"
      :label="slot.label"
      :slot-type="slot.type"
      :slots="slot.arr"
      :color="slot.color"
      :is-offline-fn="store.isOffline"
      @slot-click="onSlotClick"
      @slot-remove="onSlotRemove"
      @slot-drop="onSlotDrop"
      @slot-toggle-offline="onToggleOffline"
      @slot-charge-click="onChargeClick"
    />
  </div>

  <Teleport to="body">
    <ModuleSearch
      v-if="searchOpen"
      :slot-type="searchSlotType"
      @select="onModuleSelect"
      @close="searchOpen = false"
    />
  </Teleport>

  <Teleport to="body">
    <ChargeSearch
      v-if="chargeOpen"
      :weapon-type-id="chargeWeaponTypeId"
      @select="onChargeSelect"
      @close="chargeOpen = false"
    />
  </Teleport>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useFittingStore } from '../../stores/fitting'
import { useI18n } from '../../i18n'
import SlotRow from './SlotRow.vue'
import ModuleSearch from './ModuleSearch.vue'
import ChargeSearch from './ChargeSearch.vue'

const store = useFittingStore()
const { t } = useI18n()

const searchOpen = ref(false)
const searchSlotType = ref(null)
const searchSlotIndex = ref(null)

const chargeOpen = ref(false)
const chargeSlotType = ref(null)
const chargeSlotIndex = ref(null)
const chargeWeaponTypeId = ref(null)

const slotRows = computed(() => [
  { type: 'hi', label: t('fit.highSlots'), arr: store.highSlots, color: '#c8aa6e' },
  { type: 'med', label: t('fit.midSlots'), arr: store.midSlots, color: '#42a5f5' },
  { type: 'lo', label: t('fit.lowSlots'), arr: store.lowSlots, color: '#4caf50' },
  { type: 'rig', label: t('fit.rigSlots'), arr: store.rigSlots, color: '#ff9800' },
  { type: 'sub', label: t('fit.subSlots'), arr: store.subSlots, color: '#ab47bc' },
].filter(s => s.arr.length > 0))

function onSlotClick({ slotType, index }) {
  searchSlotType.value = slotType
  searchSlotIndex.value = index
  searchOpen.value = true
}

function onSlotRemove({ slotType, index }) {
  store.removeModule(slotType, index)
}

function onToggleOffline({ slotType, index }) {
  store.toggleOffline(slotType, index)
}

function onSlotDrop({ slotType, index, typeId }) {
  store.setModule(slotType, index, typeId)
}

function onModuleSelect(typeId) {
  store.setModule(searchSlotType.value, searchSlotIndex.value, typeId)
}

function onChargeClick({ slotType, index }) {
  const arr = store.getSlotArray(slotType)
  const weaponId = arr?.value[index]
  if (!weaponId) return
  chargeSlotType.value = slotType
  chargeSlotIndex.value = index
  chargeWeaponTypeId.value = weaponId
  chargeOpen.value = true
}

function onChargeSelect(chargeTypeId) {
  store.setCharge(chargeSlotType.value, chargeSlotIndex.value, chargeTypeId)
  chargeOpen.value = false
}
</script>

<style scoped>
.slot-layout {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
