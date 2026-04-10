<template>
  <div>
    <!-- Drone Bay -->
    <div
      v-if="hasDroneBay"
      class="drone-bay"
      :class="{ 'drop-hover': dropHover }"
      @dragover.prevent="onDragOver"
      @dragleave="dropHover = false"
      @drop.prevent="onDrop"
    >
      <div class="bay-header">
        <span class="bay-label">{{ t('fit.droneBay') }}</span>
        <span class="bay-info">{{ droneBwUsed }}/{{ droneBwTotal }} Mbit/s</span>
        <button class="add-btn" @click="droneSearchOpen = true">+</button>
      </div>
      <div v-if="store.drones.length" class="drone-list">
        <div v-for="drone in store.drones" :key="drone.typeId" class="drone-item">
          <img class="type-icon" :src="`https://images.evetech.net/types/${drone.typeId}/icon?size=32`" alt="" loading="lazy">
          <span class="drone-name">{{ displayName(drone.typeId) }}</span>
          <div class="drone-controls">
            <button class="count-btn" @click="decrement(drone)">-</button>
            <span class="drone-count">{{ drone.count }}</span>
            <button class="count-btn" @click="increment(drone)">+</button>
            <button class="remove-btn" @click="store.removeDrone(drone.typeId)">&times;</button>
          </div>
        </div>
      </div>
      <div v-else class="empty-bay">{{ t('fit.emptySlot') }}</div>
    </div>

    <!-- Fighter Bay (supers/titans/carriers) -->
    <div v-if="hasFighterBay" class="drone-bay fighter-bay">
      <div class="bay-header">
        <span class="bay-label fighter-label">{{ t('fit.fighterBay') }}</span>
        <span class="bay-info">{{ fighterTubesUsed }}/{{ fighterTubes }}</span>
        <button class="add-btn" @click="fighterSearchOpen = true">+</button>
      </div>
      <div v-if="store.fighters.length" class="drone-list">
        <div v-for="fighter in store.fighters" :key="fighter.typeId" class="drone-item">
          <img class="type-icon" :src="`https://images.evetech.net/types/${fighter.typeId}/icon?size=32`" alt="" loading="lazy">
          <span class="drone-name">{{ displayName(fighter.typeId) }}</span>
          <div class="drone-controls">
            <button class="count-btn" @click="decrementFighter(fighter)">-</button>
            <span class="drone-count">{{ fighter.count }}</span>
            <button class="count-btn" @click="incrementFighter(fighter)">+</button>
            <button class="remove-btn" @click="store.removeFighter(fighter.typeId)">&times;</button>
          </div>
        </div>
      </div>
      <div v-else class="empty-bay">{{ t('fit.emptySlot') }}</div>
    </div>
  </div>

  <Teleport to="body">
    <ModuleSearch
      v-if="droneSearchOpen"
      slot-type="drone"
      @select="onDroneSelect"
      @close="droneSearchOpen = false"
    />
  </Teleport>

  <Teleport to="body">
    <ModuleSearch
      v-if="fighterSearchOpen"
      slot-type="fighter"
      @select="onFighterSelect"
      @close="fighterSearchOpen = false"
    />
  </Teleport>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useFittingStore } from '../../stores/fitting'
import { getDogmaData } from '../../data/loader'
import { useI18n } from '../../i18n'
import { locName } from '../../services/locale'
import ModuleSearch from './ModuleSearch.vue'

const store = useFittingStore()
const { t } = useI18n()
const droneSearchOpen = ref(false)
const fighterSearchOpen = ref(false)
const dropHover = ref(false)

function getShipAttr(attrId) {
  const data = getDogmaData()
  if (!data || !store.shipTypeId) return 0
  const ship = data.types[store.shipTypeId]
  return ship?.a?.find(([a]) => a === attrId)?.[1] ?? 0
}

const droneBwTotal = computed(() => getShipAttr(1271))  // Drone Bandwidth
const droneBayCapacity = computed(() => getShipAttr(283))  // Drone Capacity
const hasDroneBay = computed(() => droneBwTotal.value > 0 || droneBayCapacity.value > 0)

const droneBwUsed = computed(() => {
  const data = getDogmaData()
  if (!data) return 0
  let bw = 0
  for (const d of store.drones) {
    const td = data.types[d.typeId]
    const need = td?.a?.find(([a]) => a === 1272)?.[1] ?? 0  // Bandwidth Needed
    bw += need * d.count
  }
  return bw
})

const fighterTubes = computed(() => getShipAttr(2216))  // Fighter Squadron Launch Tubes
const fighterHangar = computed(() => getShipAttr(2055))  // Fighter Hangar Capacity
const hasFighterBay = computed(() => fighterTubes.value > 0 || fighterHangar.value > 0)

const fighterTubesUsed = computed(() => store.fighters.reduce((s, f) => s + f.count, 0))

function displayName(typeId) {
  const data = getDogmaData()
  const td = data?.types[typeId]
  return td ? locName(td) : String(typeId)
}

function onDroneSelect(typeId) { store.addDrone(typeId, 1) }
function onFighterSelect(typeId) { store.addFighter(typeId, 1) }

function onDragOver(event) {
  if (event.dataTransfer.types.includes('application/eve-module')) {
    event.dataTransfer.dropEffect = 'copy'
    dropHover.value = true
  }
}

function onDrop(event) {
  dropHover.value = false
  const raw = event.dataTransfer.getData('application/eve-module')
  if (!raw) return
  try {
    const mod = JSON.parse(raw)
    if (mod.categoryId === 18) store.addDrone(mod.typeId, 1)
    else if (mod.categoryId === 87) store.addFighter(mod.typeId, 1)
  } catch { /* ignore */ }
}

function increment(drone) { store.setDroneCount(drone.typeId, drone.count + 1) }
function decrement(drone) {
  if (drone.count > 1) store.setDroneCount(drone.typeId, drone.count - 1)
  else store.removeDrone(drone.typeId)
}

function incrementFighter(f) { store.setFighterCount(f.typeId, f.count + 1) }
function decrementFighter(f) {
  if (f.count > 1) store.setFighterCount(f.typeId, f.count - 1)
  else store.removeFighter(f.typeId)
}
</script>

<style scoped>
.drone-bay {
  background: #141414;
  border: 1px solid #222;
  border-radius: 6px;
  padding: 8px;
  margin-bottom: 8px;
}

.fighter-bay {
  border-color: #333;
}

.bay-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.bay-label {
  color: #c8aa6e;
  font-size: 0.75em;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.fighter-label {
  color: #ef5350;
}

.bay-info {
  color: #555;
  font-size: 0.7em;
  flex: 1;
}

.add-btn {
  background: #2a2a2a;
  border: none;
  color: #c8aa6e;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1em;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.add-btn:hover { background: #3a3a3a; }

.drone-list { display: flex; flex-direction: column; gap: 3px; }

.drone-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  border-radius: 4px;
}

.drone-item:hover { background: rgba(200, 170, 110, 0.04); }

.type-icon { width: 22px; height: 22px; border-radius: 3px; flex-shrink: 0; }

.drone-name {
  color: #d0d0d0;
  font-size: 0.82em;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.drone-controls { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }

.count-btn {
  background: #2a2a2a;
  border: none;
  color: #d0d0d0;
  width: 20px;
  height: 20px;
  border-radius: 3px;
  cursor: pointer;
  font-size: 0.8em;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.count-btn:hover { background: #3a3a3a; }
.drone-count { color: #c8aa6e; font-size: 0.82em; min-width: 16px; text-align: center; }
.remove-btn { background: none; border: none; color: #666; cursor: pointer; font-size: 1em; padding: 0 2px; }
.remove-btn:hover { color: #ef5350; }

.drone-bay.drop-hover { border-color: #ab47bc; background: rgba(171, 71, 188, 0.08); }

.empty-bay { color: #444; font-size: 0.8em; font-style: italic; text-align: center; padding: 8px; }
</style>
