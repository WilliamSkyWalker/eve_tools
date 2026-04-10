<template>
  <div class="ship-search">
    <input
      ref="inputRef"
      v-model="query"
      type="text"
      class="search-input"
      :placeholder="t('fit.searchShip')"
      @input="onInput"
      @focus="showDropdown = true"
      @keydown.escape="showDropdown = false"
      @keydown.enter="selectFirst"
    >
    <ul v-if="showDropdown && results.length" class="dropdown" @mousedown.prevent>
      <li v-for="ship in results" :key="ship.tid" class="dropdown-item" @click="select(ship)">
        <img class="type-icon" :src="`https://images.evetech.net/types/${ship.tid}/icon?size=32`" alt="" loading="lazy">
        <span class="ship-name">{{ ship.display }}</span>
        <span class="ship-group">{{ ship.groupName }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { getDogmaData } from '../../data/loader'
import { useI18n } from '../../i18n'
import { locName } from '../../services/locale'

const emit = defineEmits(['select'])
const { t, locale } = useI18n()

const query = ref('')
const results = ref([])
const showDropdown = ref(false)
const inputRef = ref(null)

let searchTimeout = null

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
    if (t.cg !== 6) continue  // Ships only
    const nameEn = t.n?.toLowerCase() || ''
    const nameZh = t.nz?.toLowerCase() || ''
    if (nameEn.includes(q) || nameZh.includes(q)) {
      const grp = data.groups[t.g]
      matches.push({
        tid: parseInt(tidStr),
        display: locName(t),
        groupName: grp?.n || '',
        nameEn,
      })
    }
    if (matches.length >= 50) break
  }
  // Sort: exact prefix match first, then alphabetical
  matches.sort((a, b) => {
    const aPrefix = a.nameEn.startsWith(q) ? 0 : 1
    const bPrefix = b.nameEn.startsWith(q) ? 0 : 1
    if (aPrefix !== bPrefix) return aPrefix - bPrefix
    return a.display.localeCompare(b.display)
  })
  results.value = matches
  showDropdown.value = true
}

function select(ship) {
  emit('select', ship.tid)
  query.value = ship.display
  showDropdown.value = false
}

function selectFirst() {
  if (results.value.length) select(results.value[0])
}

function onClickOutside(e) {
  if (inputRef.value && !inputRef.value.closest('.ship-search')?.contains(e.target)) {
    showDropdown.value = false
  }
}

onMounted(() => document.addEventListener('click', onClickOutside))
onUnmounted(() => document.removeEventListener('click', onClickOutside))
</script>

<style scoped>
.ship-search {
  position: relative;
  max-width: 500px;
  margin: 0 auto;
}

.search-input {
  width: 100%;
  background: #0d0d0d;
  border: 1px solid #2a2a2a;
  border-radius: 6px;
  color: #d0d0d0;
  padding: 10px 14px;
  font-size: 0.95em;
  box-sizing: border-box;
}

.search-input:focus {
  outline: none;
  border-color: #c8aa6e;
}

.dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  max-height: 320px;
  overflow-y: auto;
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-top: none;
  border-radius: 0 0 6px 6px;
  list-style: none;
  margin: 0;
  padding: 0;
  z-index: 100;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background 0.15s;
}

.dropdown-item:hover {
  background: rgba(200, 170, 110, 0.08);
}

.type-icon {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  flex-shrink: 0;
}

.ship-name {
  color: #d0d0d0;
  flex: 1;
}

.ship-group {
  color: #666;
  font-size: 0.8em;
  white-space: nowrap;
}
</style>
