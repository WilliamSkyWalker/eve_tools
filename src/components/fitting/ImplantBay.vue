<template>
  <div class="implant-bay">
    <div class="bay-header">
      <span class="bay-label">{{ t('fit.implants') }}</span>
      <button v-if="hasAny" class="clear-all" @click="clearAll">{{ t('fit.clearAll') }}</button>
    </div>
    <div class="implant-slots">
      <div
        v-for="(tid, idx) in store.implants"
        :key="idx"
        class="implant-slot"
        @click="openSearch(idx)"
      >
        <span class="slot-num">{{ idx + 1 }}</span>
        <template v-if="tid">
          <img class="type-icon" :src="typeIcon(tid)" alt="" loading="lazy" @error="onTypeIconError">
          <span class="implant-name">{{ displayName(tid) }}</span>
          <button class="remove-btn" @click.stop="store.removeImplant(idx)">&times;</button>
        </template>
        <span v-else class="empty-label">{{ t('fit.emptySlot') }}</span>
      </div>
    </div>
  </div>

  <Teleport to="body">
    <div v-if="searchSlot != null" class="modal-overlay" @click.self="searchSlot = null">
      <div class="search-modal">
        <div class="search-header">
          <span class="search-title">{{ t('fit.implants') }} - Slot {{ searchSlot + 1 }}</span>
          <button class="modal-close" @click="searchSlot = null">&times;</button>
        </div>
        <input
          ref="searchInput"
          v-model="query"
          type="text"
          class="search-input"
          :placeholder="t('fit.searchModule')"
          @input="onSearch"
        />
        <div class="result-list">
          <div
            v-for="item in filteredResults"
            :key="item.typeId"
            class="result-item"
            @click="selectImplant(item.typeId)"
          >
            <img class="type-icon" :src="typeIcon(item.typeId)" alt="" loading="lazy" @error="onTypeIconError">
            <span class="result-name">{{ item.display }}</span>
          </div>
          <div v-if="query && !filteredResults.length" class="no-results">{{ t('fit.noResults') }}</div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, nextTick, watch } from 'vue'
import { useFittingStore } from '../../stores/fitting'
import { getDogmaData } from '../../data/loader'
import { useI18n } from '../../i18n'
import { locName } from '../../services/locale'
import { typeIcon, onTypeIconError } from '../../services/typeIcon'

const store = useFittingStore()
const { t } = useI18n()

const searchSlot = ref(null)
const query = ref('')
const searchInput = ref(null)

const hasAny = computed(() => store.implants.some(Boolean))

function displayName(typeId) {
  const data = getDogmaData()
  const td = data?.types[typeId]
  return td ? locName(td) : String(typeId)
}

function openSearch(idx) {
  searchSlot.value = idx
  query.value = ''
  nextTick(() => searchInput.value?.focus())
}

const filteredResults = computed(() => {
  if (searchSlot.value == null) return []
  const data = getDogmaData()
  if (!data) return []
  const slot = searchSlot.value + 1  // 1-based
  const q = query.value.toLowerCase().trim()
  const results = []
  for (const [tidStr, t] of Object.entries(data.types)) {
    if (t.cg !== 20) continue  // implants only
    const implantSlot = t.a?.find(([aid]) => aid === 331)?.[1]
    if (implantSlot !== slot) continue
    if (q) {
      const name = (t.n || '').toLowerCase()
      const nameZh = (t.nz || '').toLowerCase()
      if (!name.includes(q) && !nameZh.includes(q)) continue
    }
    results.push({ typeId: parseInt(tidStr), display: locName(t) })
  }
  results.sort((a, b) => a.display.localeCompare(b.display))
  return q ? results.slice(0, 50) : results.slice(0, 100)
})

function selectImplant(typeId) {
  if (searchSlot.value != null) {
    store.setImplant(searchSlot.value, typeId)
    searchSlot.value = null
  }
}

function clearAll() {
  for (let i = 0; i < 10; i++) store.removeImplant(i)
}

function onSearch() { /* reactivity via v-model */ }

watch(searchSlot, (v) => {
  if (v != null) nextTick(() => searchInput.value?.focus())
})
</script>

<style scoped>
.implant-bay {
  background: var(--bg-panel-2);
  border: 1px solid var(--bg-elevated);
  border-radius: 6px;
  padding: 8px;
}

.bay-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.bay-label {
  color: var(--gold);
  font-size: 0.75em;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.clear-all {
  background: none;
  border: none;
  color: var(--text-dim);
  font-size: 0.7em;
  cursor: pointer;
}

.clear-all:hover { color: var(--red); }

.implant-slots {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.implant-slot {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 6px;
  border-radius: 4px;
  cursor: pointer;
  min-height: 28px;
}

.implant-slot:hover { background: var(--gold-bg-light); }

.slot-num {
  color: var(--text-dim);
  font-size: 0.7em;
  width: 14px;
  text-align: center;
  flex-shrink: 0;
}

.type-icon { width: 22px; height: 22px; border-radius: 3px; flex-shrink: 0; }

.implant-name {
  color: var(--text-primary);
  font-size: 0.78em;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.empty-label {
  color: var(--border-default);
  font-size: 0.78em;
  font-style: italic;
}

.remove-btn {
  background: none;
  border: none;
  color: var(--text-dim);
  cursor: pointer;
  font-size: 1em;
  padding: 0 2px;
  flex-shrink: 0;
}

.remove-btn:hover { color: var(--red); }

/* Search Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.search-modal {
  background: var(--bg-panel);
  border: 1px solid var(--border-default);
  border-radius: 10px;
  width: 420px;
  max-height: 500px;
  display: flex;
  flex-direction: column;
}

.search-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px 8px;
}

.search-title {
  color: var(--gold);
  font-size: 0.9em;
  font-weight: 600;
}

.modal-close {
  background: none;
  border: none;
  color: var(--text-dim);
  font-size: 1.4em;
  cursor: pointer;
  line-height: 1;
}

.modal-close:hover { color: var(--gold); }

.search-input {
  margin: 0 12px 8px;
  padding: 8px 12px;
  background: var(--bg-input);
  border: 1px solid var(--border-default);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 0.9em;
  outline: none;
}

.search-input:focus { border-color: var(--gold); }

.result-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 6px 8px;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
}

.result-item:hover { background: var(--gold-bg); }

.result-name {
  color: var(--text-primary);
  font-size: 0.82em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.no-results {
  color: var(--text-dim);
  font-size: 0.82em;
  text-align: center;
  padding: 16px;
}
</style>
