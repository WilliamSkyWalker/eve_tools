<template>
  <div class="module-search-overlay" @click.self="$emit('close')">
    <div class="module-search-panel">
      <div class="panel-header">
        <h3>{{ slotLabel }}</h3>
        <button class="close-btn" @click="$emit('close')">&times;</button>
      </div>
      <input
        ref="inputRef"
        v-model="query"
        type="text"
        class="search-input"
        :placeholder="isDrone ? t('fit.searchDrone') : t('fit.searchModule')"
        @input="onInput"
        @keydown.escape="$emit('close')"
        @keydown.enter="selectFirst"
      >
      <ul v-if="results.length" class="results">
        <li v-for="mod in results" :key="mod.tid" class="result-item" @click="select(mod)">
          <img class="type-icon" :src="`https://images.evetech.net/types/${mod.tid}/icon?size=32`" alt="" loading="lazy">
          <div class="mod-info">
            <span class="mod-name">{{ mod.display }}</span>
            <span class="mod-meta">{{ mod.meta }}</span>
          </div>
        </li>
      </ul>
      <div v-else-if="query.trim()" class="no-results">{{ t('fit.noResult') }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { getDogmaData } from '../../data/loader'
import { useI18n } from '../../i18n'
import { locName } from '../../services/locale'

const props = defineProps({
  slotType: { type: String, default: null },  // hi, med, lo, rig, sub, or null for drone
})
const emit = defineEmits(['select', 'close'])
const { t } = useI18n()

const query = ref('')
const results = ref([])
const inputRef = ref(null)
let searchTimeout = null

const isDrone = computed(() => props.slotType === 'drone')
const isFighter = computed(() => props.slotType === 'fighter')

const slotLabel = computed(() => {
  const labels = { hi: t('fit.highSlots'), med: t('fit.midSlots'), lo: t('fit.lowSlots'), rig: t('fit.rigSlots'), sub: t('fit.subSlots'), drone: t('fit.droneBay') }
  return labels[props.slotType] || t('fit.searchModule')
})

onMounted(() => inputRef.value?.focus())

function onInput() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(search, 150)
}

function search() {
  const data = getDogmaData()
  if (!data || !query.value.trim()) {
    results.value = []
    return
  }
  const q = query.value.trim().toLowerCase()
  const matches = []

  for (const [tidStr, t] of Object.entries(data.types)) {
    // Filter by slot type or drone/fighter category
    if (isFighter.value) {
      if (t.cg !== 87) continue
    } else if (isDrone.value) {
      if (t.cg !== 18) continue
    } else if (props.slotType) {
      if (t.sl !== props.slotType) continue
    } else {
      if (t.cg !== 7) continue
    }

    const nameEn = t.n?.toLowerCase() || ''
    const nameZh = t.nz?.toLowerCase() || ''
    if (nameEn.includes(q) || nameZh.includes(q)) {
      const grp = data.groups[t.g]
      // Get CPU/PG from attributes
      const cpu = t.a?.find(([aid]) => aid === 50)?.[1]  // 50 = cpu
      const pg = t.a?.find(([aid]) => aid === 30)?.[1]   // 30 = power
      let meta = grp?.n || ''
      if (cpu != null || pg != null) {
        const parts = []
        if (cpu != null) parts.push(`CPU: ${Math.round(cpu)}`)
        if (pg != null) parts.push(`PG: ${Math.round(pg)}`)
        meta = parts.join(' / ')
      }
      matches.push({
        tid: parseInt(tidStr),
        display: locName(t),
        meta,
        nameEn,
      })
    }
    if (matches.length >= 80) break
  }

  matches.sort((a, b) => {
    const aPrefix = a.nameEn.startsWith(q) ? 0 : 1
    const bPrefix = b.nameEn.startsWith(q) ? 0 : 1
    if (aPrefix !== bPrefix) return aPrefix - bPrefix
    return a.display.localeCompare(b.display)
  })
  results.value = matches
}

function select(mod) {
  emit('select', mod.tid)
  emit('close')
}

function selectFirst() {
  if (results.value.length) select(results.value[0])
}
</script>

<style scoped>
.module-search-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 1000;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 10vh;
}

.module-search-panel {
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 8px;
  width: 480px;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #2a2a2a;
}

.panel-header h3 {
  color: #c8aa6e;
  font-size: 1em;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  color: #8a8a8a;
  font-size: 1.4em;
  cursor: pointer;
  padding: 0 4px;
}

.close-btn:hover {
  color: #d0d0d0;
}

.search-input {
  margin: 12px 16px;
  background: #0d0d0d;
  border: 1px solid #2a2a2a;
  border-radius: 6px;
  color: #d0d0d0;
  padding: 8px 12px;
  font-size: 0.9em;
}

.search-input:focus {
  outline: none;
  border-color: #c8aa6e;
}

.results {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  flex: 1;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  cursor: pointer;
  transition: background 0.15s;
}

.result-item:hover {
  background: rgba(200, 170, 110, 0.08);
}

.type-icon {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  flex-shrink: 0;
}

.mod-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.mod-name {
  color: #d0d0d0;
  font-size: 0.9em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mod-meta {
  color: #666;
  font-size: 0.75em;
}

.no-results {
  color: #555;
  text-align: center;
  padding: 20px;
}
</style>
