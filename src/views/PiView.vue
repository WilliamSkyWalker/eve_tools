<template>
  <div class="pi-view">
    <h1 class="title">{{ t('pi.title') }}</h1>

    <div v-if="!dataReady" class="loading-text">Loading...</div>

    <template v-else>
      <!-- Search + runs -->
      <div class="search-section">
        <div class="search-row">
          <div class="search-wrap">
            <input
              v-model="query"
              class="search-input"
              :placeholder="t('pi.search')"
              @focus="dropdownOpen = true"
            />
            <div v-if="dropdownOpen && filteredProducts.length" class="dropdown">
              <div
                v-for="p in filteredProducts"
                :key="p.tid"
                class="dropdown-item"
                :class="{ active: p.tid === selectedTid }"
                @click="selectProduct(p.tid)"
              >
                <img class="type-icon" :src="`https://images.evetech.net/types/${p.tid}/icon?size=32`" alt="" loading="lazy">
                <span>{{ p.name }}</span>
                <span class="tier-badge" :class="'tier-' + p.tier">P{{ p.tier }}</span>
              </div>
            </div>
          </div>
          <div class="runs-wrap">
            <label>{{ t('pi.runs') }}</label>
            <input v-model.number="runs" type="number" min="1" class="runs-input" />
          </div>
        </div>
      </div>

      <!-- Production chain -->
      <div v-if="chain.length" class="chain-section">
        <div class="levels-row">
          <div v-for="lvl in chain" :key="lvl.tier" class="level-col">
            <h3 class="level-title">{{ tierLabel(lvl.tier) }}</h3>
            <table class="level-table">
              <thead>
                <tr>
                  <th>{{ t('pi.material') }}</th>
                  <th class="num">{{ t('pi.quantity') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="m in lvl.materials" :key="m.tid">
                  <td class="name-cell">
                    <img class="type-icon" :src="`https://images.evetech.net/types/${m.tid}/icon?size=32`" alt="" loading="lazy">
                    <span class="copyable" @click="copyName(piName(m.tid), $event)">{{ piName(m.tid) }}</span>
                  </td>
                  <td class="num">{{ formatNumber(m.qty) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from '../i18n'
import { loadPiData, getPiData } from '../data/loader'

const { t, locale } = useI18n()

const dataReady = ref(false)
const query = ref('')
const dropdownOpen = ref(false)
const selectedTid = ref(null)
const runs = ref(1)

onMounted(async () => {
  await loadPiData()
  dataReady.value = true
  document.addEventListener('click', onDocClick)
})

onUnmounted(() => document.removeEventListener('click', onDocClick))

function onDocClick(e) {
  if (!e.target.closest('.search-wrap')) dropdownOpen.value = false
  const prev = document.querySelector('.copyable.copied')
  if (prev) prev.classList.remove('copied')
}

// ── Tier classification ──
function getTier(tid, cache = {}) {
  if (cache[tid] !== undefined) return cache[tid]
  const pi = getPiData()
  if (!pi?.production[tid]) { cache[tid] = 0; return 0 }
  let max = 0
  for (const [mt] of pi.production[tid].m) {
    max = Math.max(max, getTier(mt, cache))
  }
  cache[tid] = max + 1
  return cache[tid]
}

// ── Product list ──
const tierCache = {}
const productList = computed(() => {
  const pi = getPiData()
  if (!pi) return []
  return Object.keys(pi.production).map(tid => {
    const numTid = parseInt(tid)
    const t = pi.types[numTid]
    const tier = getTier(numTid, tierCache)
    return {
      tid: numTid,
      name: (locale.value === 'zh' && t?.nz) ? t.nz : (t?.n || String(tid)),
      nameEn: t?.n || '',
      nameZh: t?.nz || '',
      tier,
    }
  }).sort((a, b) => b.tier - a.tier || a.name.localeCompare(b.name))
})

const filteredProducts = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return productList.value
  return productList.value.filter(p =>
    p.nameEn.toLowerCase().includes(q) || p.nameZh.includes(q)
  )
})

function selectProduct(tid) {
  selectedTid.value = tid
  const p = productList.value.find(x => x.tid === tid)
  query.value = p?.name || ''
  dropdownOpen.value = false
}

function piName(tid) {
  const pi = getPiData()
  const t = pi?.types?.[tid]
  if (t) return (locale.value === 'zh' && t.nz) ? t.nz : t.n
  return String(tid)
}

// ── Chain calculation ──
const chain = computed(() => {
  const pi = getPiData()
  if (!pi || !selectedTid.value) return []

  // BFS: expand production tree, aggregate by tier
  const tierMap = {}  // tier -> { tid -> totalQty }

  function expand(tid, qty) {
    const prod = pi.production[tid]
    if (!prod) {
      // P0 raw material
      const tier = 0
      if (!tierMap[tier]) tierMap[tier] = {}
      tierMap[tier][tid] = (tierMap[tier][tid] || 0) + qty
      return
    }

    const tier = getTier(tid, tierCache)
    if (tid !== selectedTid.value) {
      if (!tierMap[tier]) tierMap[tier] = {}
      tierMap[tier][tid] = (tierMap[tier][tid] || 0) + qty
    }

    // How many cycles needed to produce qty?
    const cycles = Math.ceil(qty / prod.q)
    for (const [matTid, matQty] of prod.m) {
      expand(matTid, cycles * matQty)
    }
  }

  const prod = pi.production[selectedTid.value]
  if (!prod) return []

  const totalQty = runs.value * prod.q
  // Add the product itself at its tier
  const productTier = getTier(selectedTid.value, tierCache)
  tierMap[productTier] = {}
  tierMap[productTier][selectedTid.value] = totalQty

  // Expand inputs
  const cycles = runs.value
  for (const [matTid, matQty] of prod.m) {
    expand(matTid, cycles * matQty)
  }

  // Convert to sorted array of levels
  const tiers = Object.keys(tierMap).map(Number).sort((a, b) => b - a)
  return tiers.map(tier => ({
    tier,
    materials: Object.entries(tierMap[tier])
      .map(([tid, qty]) => ({ tid: parseInt(tid), qty }))
      .sort((a, b) => piName(a.tid).localeCompare(piName(b.tid))),
  }))
})

function tierLabel(tier) {
  const key = `pi.p${tier}`
  return t(key)
}

function formatNumber(n) {
  return n != null ? n.toLocaleString() : '-'
}

function clearCopied() {
  const prev = document.querySelector('.copyable.copied')
  if (prev) prev.classList.remove('copied')
}

function copyName(name, e) {
  e.stopPropagation()
  navigator.clipboard.writeText(name)
  clearCopied()
  const el = e?.target
  if (el) {
    el.setAttribute('data-copied-tip', locale.value === 'zh' ? '已复制!' : 'Copied!')
    el.classList.add('copied')
  }
}
</script>

<style scoped>
.pi-view {
  padding-top: 20px;
}

.title {
  color: #c8aa6e;
  font-size: 1.8em;
  margin-bottom: 16px;
  text-align: center;
}

.loading-text {
  text-align: center;
  color: #555;
  padding: 40px;
}

/* ── Search ── */
.search-section {
  max-width: 600px;
  margin: 0 auto 20px;
}

.search-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.search-wrap {
  flex: 1;
  position: relative;
}

.search-input {
  width: 100%;
  padding: 10px 14px;
  background: #0d0d0d;
  border: 1px solid #2a2a2a;
  border-radius: 6px;
  color: #d0d0d0;
  font-size: 0.95em;
  outline: none;
  box-sizing: border-box;
}

.search-input:focus {
  border-color: #c8aa6e;
}

.dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  max-height: 300px;
  overflow-y: auto;
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-top: none;
  border-radius: 0 0 6px 6px;
  z-index: 100;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  cursor: pointer;
  font-size: 0.9em;
  color: #d0d0d0;
  transition: background 0.15s;
}

.dropdown-item:hover {
  background: rgba(200, 170, 110, 0.08);
  color: #c8aa6e;
}

.dropdown-item.active {
  color: #c8aa6e;
  background: rgba(200, 170, 110, 0.12);
}

.tier-badge {
  margin-left: auto;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 0.75em;
  font-weight: 700;
}

.tier-1 { color: #8a8a8a; background: rgba(138, 138, 138, 0.15); }
.tier-2 { color: #4caf50; background: rgba(76, 175, 80, 0.15); }
.tier-3 { color: #ff9800; background: rgba(255, 152, 0, 0.15); }
.tier-4 { color: #c8aa6e; background: rgba(200, 170, 110, 0.15); }

.runs-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
}

.runs-wrap label {
  color: #8a8a8a;
  font-size: 0.85em;
  white-space: nowrap;
}

.runs-input {
  width: 70px;
  padding: 10px 8px;
  background: #0d0d0d;
  border: 1px solid #2a2a2a;
  border-radius: 6px;
  color: #d0d0d0;
  text-align: center;
  font-size: 0.95em;
  outline: none;
}

.runs-input:focus {
  border-color: #c8aa6e;
}

/* ── Chain ── */
.chain-section {
  overflow-x: auto;
  padding-bottom: 8px;
}

.levels-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.level-col {
  min-width: 240px;
  flex-shrink: 0;
}

.level-title {
  color: #c8aa6e;
  font-size: 0.95em;
  margin-bottom: 8px;
  padding-left: 4px;
  border-left: 3px solid #c8aa6e;
}

.level-table {
  width: 100%;
  background: #1a1a1a;
  border-radius: 8px;
  overflow: hidden;
  border-collapse: collapse;
}

.level-table th {
  background: rgba(200, 170, 110, 0.08);
  color: #c8aa6e;
  padding: 8px 10px;
  font-size: 0.8em;
  font-weight: 500;
  border-bottom: 1px solid #2a2a2a;
}

.level-table td {
  padding: 6px 10px;
  border-bottom: 1px solid rgba(42, 42, 42, 0.5);
  font-size: 0.85em;
}

.name-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}

.type-icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  border-radius: 3px;
}

.num {
  text-align: right;
  white-space: nowrap;
}
</style>
