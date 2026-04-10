<template>
  <div class="module-browser">
    <div class="browser-header">
      <input
        v-model="query"
        type="text"
        class="search-input"
        :placeholder="t('fit.searchModule')"
        @input="onInput"
      >
    </div>

    <!-- Slot type filter tabs -->
    <div class="filter-tabs">
      <button
        v-for="tab in filterTabs"
        :key="tab.key"
        :class="['filter-tab', { active: activeFilter === tab.key }]"
        :style="{ '--accent': tab.color }"
        @click="activeFilter = tab.key"
      >{{ tab.label }}</button>
    </div>

    <!-- Grouped module list -->
    <div class="module-list">
      <template v-if="groupedResults.length">
        <div v-for="group in groupedResults" :key="group.groupId" class="group-section">
          <div class="group-header" @click="toggleGroup(group.groupId)">
            <span class="group-arrow">{{ expandedGroups.has(group.groupId) ? '▾' : '▸' }}</span>
            <span class="group-name">{{ group.name }}</span>
            <span class="group-count">{{ group.items.length }}</span>
          </div>
          <div v-if="expandedGroups.has(group.groupId)" class="group-items">
            <div
              v-for="mod in group.items"
              :key="mod.tid"
              class="module-item"
              draggable="true"
              @dragstart="onDragStart($event, mod)"
              @dragend="onDragEnd"
              @dblclick="onDoubleClick(mod)"
            >
              <img class="type-icon" :src="`https://images.evetech.net/types/${mod.tid}/icon?size=32`" alt="" loading="lazy">
              <div class="mod-info">
                <span class="mod-name">{{ mod.display }}</span>
                <span class="mod-meta">{{ mod.meta }}</span>
              </div>
              <span v-if="mod.slotType && activeFilter === 'all'" class="slot-badge" :style="{ background: slotColor(mod.slotType) }">{{ slotShort(mod.slotType) }}</span>
            </div>
          </div>
        </div>
      </template>
      <div v-else-if="query.trim()" class="no-results">{{ t('fit.noResult') }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { getDogmaData } from '../../data/loader'
import { useFittingStore } from '../../stores/fitting'
import { useI18n } from '../../i18n'
import { locName } from '../../services/locale'

const { t } = useI18n()
const store = useFittingStore()
const emit = defineEmits(['autoPlace'])

const query = ref('')
const activeFilter = ref('all')
const expandedGroups = ref(new Set())

let searchTimeout = null
// Cache the full grouped index (built once per data load)
let _groupIndex = null
let _groupIndexFilter = null

const filterTabs = computed(() => [
  { key: 'all', label: t('fit.item'), color: '#8a8a8a' },
  { key: 'hi', label: t('fit.highSlots'), color: '#c8aa6e' },
  { key: 'med', label: t('fit.midSlots'), color: '#42a5f5' },
  { key: 'lo', label: t('fit.lowSlots'), color: '#4caf50' },
  { key: 'rig', label: t('fit.rigSlots'), color: '#ff9800' },
  { key: 'drone', label: t('fit.drone'), color: '#ab47bc' },
])

function slotColor(sl) {
  const colors = { hi: '#c8aa6e', med: '#42a5f5', lo: '#4caf50', rig: '#ff9800', sub: '#ab47bc' }
  return colors[sl] || '#8a8a8a'
}

function slotShort(sl) {
  const labels = { hi: 'H', med: 'M', lo: 'L', rig: 'R', sub: 'S' }
  return labels[sl] || ''
}

/** Build a grouped index of all modules/drones, keyed by slot filter */
function buildGroupIndex(filterKey) {
  const data = getDogmaData()
  if (!data) return []

  const groupMap = {}  // groupId -> { name, items: [] }

  for (const [tidStr, tp] of Object.entries(data.types)) {
    // Modules (7), Drones (18), Fighters (87)
    if (tp.cg !== 7 && tp.cg !== 18 && tp.cg !== 87) continue

    const sl = tp.sl || (tp.cg === 18 ? 'drone' : tp.cg === 87 ? 'fighter' : null)

    // Apply slot filter
    if (filterKey !== 'all') {
      if (filterKey === 'drone') { if (tp.cg !== 18 && tp.cg !== 87) continue }
      else { if (sl !== filterKey) continue }  // drones/fighters won't match hi/med/lo/rig
    }

    // Filter by ship compatibility
    if (tp.cg === 7 && !store.canFitModule(parseInt(tidStr))) continue

    const gid = tp.g
    const grp = data.groups[gid]
    const groupName = grp ? locName(grp) : 'Other'

    if (!groupMap[gid]) {
      groupMap[gid] = { groupId: gid, name: groupName, items: [] }
    }

    const cpu = tp.a?.find(([aid]) => aid === 50)?.[1]
    const pg = tp.a?.find(([aid]) => aid === 30)?.[1]
    let meta = ''
    if (cpu != null || pg != null) {
      const parts = []
      if (cpu != null) parts.push(`CPU: ${Math.round(cpu)}`)
      if (pg != null) parts.push(`PG: ${Math.round(pg)}`)
      meta = parts.join(' / ')
    }

    groupMap[gid].items.push({
      tid: parseInt(tidStr),
      display: locName(tp),
      nameEn: tp.n?.toLowerCase() || '',
      nameZh: tp.nz?.toLowerCase() || '',
      meta,
      slotType: sl,
      categoryId: tp.cg,
    })
  }

  // Sort items within each group, then sort groups
  const groups = Object.values(groupMap)
  for (const g of groups) {
    g.items.sort((a, b) => a.display.localeCompare(b.display))
  }
  groups.sort((a, b) => a.name.localeCompare(b.name))

  return groups
}

function getGroupIndex(filterKey) {
  if (_groupIndexFilter !== filterKey) {
    _groupIndex = buildGroupIndex(filterKey)
    _groupIndexFilter = filterKey
  }
  return _groupIndex
}

// Reset index cache when filter or ship changes
watch([activeFilter, () => store.shipTypeId], () => {
  _groupIndex = null
  _groupIndexFilter = null
  expandedGroups.value = new Set()
})

const groupedResults = computed(() => {
  const allGroups = getGroupIndex(activeFilter.value)
  if (!allGroups) return []

  const q = query.value.trim().toLowerCase()
  if (!q) return allGroups

  // Filter: keep groups with matching items
  const filtered = []
  for (const g of allGroups) {
    // Check group name match
    const groupMatch = g.name.toLowerCase().includes(q)
    const matchingItems = groupMatch
      ? g.items  // show all items if group name matches
      : g.items.filter(m => m.nameEn.includes(q) || m.nameZh.includes(q))

    if (matchingItems.length) {
      filtered.push({ ...g, items: matchingItems })
    }
  }

  // Auto-expand all groups when searching
  if (q && filtered.length <= 20) {
    for (const g of filtered) expandedGroups.value.add(g.groupId)
  }

  return filtered
})

function onInput() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    // Invalidate index when data might not be ready yet
    if (!getDogmaData()) return
    if (!_groupIndex) getGroupIndex(activeFilter.value)
  }, 100)
}

function toggleGroup(groupId) {
  const set = expandedGroups.value
  if (set.has(groupId)) set.delete(groupId)
  else set.add(groupId)
  // Trigger reactivity
  expandedGroups.value = new Set(set)
}

// ── Drag & Drop ──
function onDragStart(event, mod) {
  event.dataTransfer.setData('application/eve-module', JSON.stringify({
    typeId: mod.tid,
    slotType: mod.slotType,
    categoryId: mod.categoryId,
  }))
  event.dataTransfer.effectAllowed = 'copy'
  document.body.classList.add('dragging-module')
}

function onDragEnd() {
  document.body.classList.remove('dragging-module')
}

function onDoubleClick(mod) {
  emit('autoPlace', { typeId: mod.tid, slotType: mod.slotType, categoryId: mod.categoryId })
}
</script>

<style scoped>
.module-browser {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #141414;
  border: 1px solid #222;
  border-radius: 8px;
  overflow: hidden;
}

.browser-header {
  padding: 10px;
  border-bottom: 1px solid #222;
}

.search-input {
  width: 100%;
  background: #0d0d0d;
  border: 1px solid #2a2a2a;
  border-radius: 6px;
  color: #d0d0d0;
  padding: 8px 10px;
  font-size: 0.85em;
  box-sizing: border-box;
}

.search-input:focus {
  outline: none;
  border-color: #c8aa6e;
}

.filter-tabs {
  display: flex;
  padding: 4px 6px;
  gap: 2px;
  border-bottom: 1px solid #222;
  overflow-x: auto;
}

.filter-tab {
  background: none;
  border: none;
  color: #666;
  padding: 4px 8px;
  font-size: 0.7em;
  cursor: pointer;
  border-radius: 4px;
  white-space: nowrap;
  transition: color 0.15s, background 0.15s;
}

.filter-tab:hover {
  color: var(--accent, #8a8a8a);
  background: rgba(255, 255, 255, 0.03);
}

.filter-tab.active {
  color: var(--accent, #c8aa6e);
  background: rgba(255, 255, 255, 0.05);
}

.module-list {
  flex: 1;
  overflow-y: auto;
}

/* ── Group ── */
.group-section {
  border-bottom: 1px solid rgba(42, 42, 42, 0.4);
}

.group-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  cursor: pointer;
  user-select: none;
  transition: background 0.12s;
}

.group-header:hover {
  background: rgba(200, 170, 110, 0.04);
}

.group-arrow {
  color: #555;
  font-size: 0.7em;
  width: 10px;
  flex-shrink: 0;
}

.group-name {
  color: #999;
  font-size: 0.76em;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.group-count {
  color: #555;
  font-size: 0.65em;
  flex-shrink: 0;
}

.group-items {
  padding-bottom: 2px;
}

/* ── Module item ── */
.module-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px 4px 22px;
  cursor: grab;
  transition: background 0.12s;
  user-select: none;
}

.module-item:hover {
  background: rgba(200, 170, 110, 0.06);
}

.module-item:active {
  cursor: grabbing;
}

.type-icon {
  width: 24px;
  height: 24px;
  border-radius: 3px;
  flex-shrink: 0;
  pointer-events: none;
}

.mod-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
  pointer-events: none;
}

.mod-name {
  color: #d0d0d0;
  font-size: 0.78em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mod-meta {
  color: #555;
  font-size: 0.65em;
}

.slot-badge {
  flex-shrink: 0;
  color: #0d0d0d;
  font-size: 0.6em;
  font-weight: 700;
  width: 14px;
  height: 14px;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.no-results {
  color: #555;
  font-size: 0.8em;
  text-align: center;
  padding: 20px 10px;
}
</style>
