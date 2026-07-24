<template>
  <div class="pi-view">
    <div class="page-head">
      <div class="titles">
        <h1>{{ t('pi.title') }}<PageHelp topic="pi" /></h1>
      </div>
    </div>

    <div v-if="!dataReady" class="loading-text">{{ t('home.loading') }}</div>

    <template v-else>
      <!-- Search + runs -->
      <div class="card search-section">
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
                <img class="type-icon" :src="typeIcon(p.tid)" alt="" loading="lazy" @error="onTypeIconError">
                <span>{{ p.name }}</span>
                <span class="tier-badge" :class="'tier-' + p.tier">P{{ p.tier }}</span>
              </div>
            </div>
          </div>
          <div class="runs-wrap">
            <label>{{ t('pi.runs') }}</label>
            <input v-model.number="runs" type="number" min="1" class="runs-input num" />
          </div>
        </div>
      </div>

      <!-- Production chain -->
      <div v-if="chain.length" class="chain-section">
        <div class="levels-row">
          <div v-for="lvl in chain" :key="lvl.tier" class="card level-col">
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
                    <img class="type-icon" :src="typeIcon(m.tid)" alt="" loading="lazy" @error="onTypeIconError">
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
import PageHelp from '../components/layout/PageHelp.vue'
import { typeIcon, onTypeIconError } from '../services/typeIcon'

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
.loading-text { text-align: center; color: var(--text-dim); padding: 40px; }

/* ── Search ── */
.search-section { padding: 14px 16px; margin-bottom: 16px; }
.search-row { display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; }
.search-wrap { position: relative; flex: 1; min-width: 240px; }
.search-input {
  width: 100%; height: 34px; padding: 0 11px;
  background: var(--bg-input); border: 1px solid var(--border-default);
  border-radius: var(--radius-md); color: var(--text-primary); font-size: var(--text-base);
}
.search-input:focus { outline: none; border-color: var(--gold-line); }

.dropdown {
  position: absolute; top: calc(100% + 4px); left: 0; right: 0;
  background: var(--bg-panel); border: 1px solid var(--border-strong);
  border-radius: var(--radius-md); box-shadow: var(--shadow-pop);
  max-height: 300px; overflow-y: auto; z-index: 100; padding: 4px;
}
.dropdown-item { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: var(--radius-sm); cursor: pointer; }
.dropdown-item:hover, .dropdown-item.active { background: var(--bg-elevated); }
.type-icon { width: 24px; height: 24px; border-radius: 4px; flex: none; }

.tier-badge { margin-left: auto; font-size: 10px; font-weight: 700; padding: 1px 7px; border-radius: 4px; }
.tier-0 { color: var(--text-muted); background: rgba(144, 150, 160, 0.14); }
.tier-1 { color: var(--green); background: var(--green-bg); }
.tier-2 { color: var(--blue); background: var(--blue-bg); }
.tier-3 { color: var(--orange); background: var(--orange-bg); }
.tier-4 { color: var(--purple); background: var(--purple-bg); }

.runs-wrap { display: flex; flex-direction: column; gap: 4px; }
.runs-wrap label { font-size: var(--text-xs); text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-dim); }
.runs-input {
  width: 110px; height: 34px; text-align: center;
  background: var(--bg-input); border: 1px solid var(--border-default);
  border-radius: var(--radius-md); color: var(--text-primary);
}
.runs-input:focus { outline: none; border-color: var(--gold-line); }

/* ── Production chain ── */
.levels-row { display: flex; gap: 12px; align-items: flex-start; flex-wrap: wrap; }
.level-col { flex: 0 0 auto; min-width: 200px; }
.level-title { font-size: var(--text-base); font-weight: 650; padding: 11px 14px; border-bottom: 1px solid var(--border-default); margin: 0; }
.level-table { width: 100%; border-collapse: collapse; }
.level-table th {
  text-transform: uppercase; font-size: var(--text-xs); color: var(--text-dim); letter-spacing: 0.03em;
  background: var(--bg-panel-2); padding: 8px 14px; border-bottom: 1px solid var(--border-default); font-weight: 600;
}
.level-table td { padding: 7px 14px; border-bottom: 1px solid rgba(255, 255, 255, 0.035); font-size: var(--text-base); }
.level-table tbody tr:last-child td { border-bottom: none; }
.level-table tbody tr:hover { background: rgba(255, 255, 255, 0.025); }
.level-table th.num, .level-table td.num { text-align: right; font-family: var(--font-mono); font-variant-numeric: tabular-nums; white-space: nowrap; padding-left: 14px; }
.name-cell { white-space: nowrap; }
.name-cell .type-icon { width: 22px; height: 22px; border-radius: 4px; vertical-align: middle; margin-right: 8px; }
</style>
