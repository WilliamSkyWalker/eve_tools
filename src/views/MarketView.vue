<template>
  <div class="market">
    <h1 class="title">{{ serverLabel }} {{ t('market.title') }}</h1>

    <!-- Tabs -->
    <div class="tabs">
      <button :class="['tab', { active: tab === 'price' }]" @click="tab = 'price'">{{ t('market.tabPrice') }}</button>
      <button :class="['tab', { active: tab === 'reprocess' }]" @click="tab = 'reprocess'">{{ t('market.tabReprocess') }}</button>
      <button :class="['tab', { active: tab === 'oreValue' }]" @click="tab = 'oreValue'; loadOreValues()">{{ t('market.tabOreValue') }}</button>
    </div>

    <!-- Price Query Tab -->
    <template v-if="tab === 'price'">
      <div class="input-section">
        <textarea
          v-model="inputText"
          class="material-input"
          :placeholder="t('market.placeholder')"
          rows="6"
          @keydown="handleTabKeydown"
        ></textarea>
        <button class="query-btn" :disabled="loading || !inputText.trim()" @click="queryPrices">
          {{ loading ? t('market.querying') : t('market.query') }}
        </button>
      </div>

      <div v-if="error" class="error-msg">{{ error }}</div>

      <div v-if="items.length" class="result-section">
        <!-- Price Summary -->
        <div class="price-summary">
          <div class="summary-card">
            <div class="summary-label">{{ t('market.totalBuy') }}</div>
            <div class="summary-value buy-total">{{ formatPrice(buyTotal) }}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">{{ t('market.totalSell') }}</div>
            <div class="summary-value sell-total">{{ formatPrice(sellTotal) }}</div>
          </div>
        </div>

        <table class="result-table">
          <thead>
            <tr>
              <th class="col-name">{{ t('market.colName') }}</th>
              <th class="col-qty sortable" @click="sortBy('quantity')">
                {{ t('market.colQty') }}
                <span class="sort-indicator" :class="getSortClass('quantity')"></span>
              </th>
              <th class="col-volume sortable" @click="sortBy('volume')">
                {{ t('market.colVolume') }}
                <span class="sort-indicator" :class="getSortClass('volume')"></span>
              </th>
              <th class="col-price sortable" @click="sortBy('buy_price')">
                {{ t('market.colBuy') }}
                <span class="sort-indicator" :class="getSortClass('buy_price')"></span>
              </th>
              <th class="col-price">{{ t('market.colBuyTotal') }}</th>
              <th class="col-price sortable" @click="sortBy('sell_price')">
                {{ t('market.colSell') }}
                <span class="sort-indicator" :class="getSortClass('sell_price')"></span>
              </th>
              <th class="col-price">{{ t('market.colSellTotal') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in sortedItems" :key="item.name" :class="{ unmatched: !item.matched }">
              <td class="col-name">
                <div class="name-cell">
                  <img v-if="item.matched" class="type-icon" :src="`https://images.evetech.net/types/${item.type_id}/icon?size=32`" alt="" loading="lazy">
                  <span v-if="item.matched" class="copyable" @click="copyName(item.type_name, $event)">
                    {{ item.type_name }}
                  </span>
                  <span v-else class="unmatched-name">{{ item.name }} <small>({{ t('market.unmatched') }})</small></span>
                </div>
              </td>
              <td class="col-qty">{{ formatNumber(item.quantity) }}</td>
              <td class="col-volume">{{ item.matched ? formatVolume(item.volume, item.quantity) : '-' }}</td>
              <td class="col-price">{{ formatPrice(item.buy_price) }}</td>
              <td class="col-price">{{ formatSubtotal(item.buy_price, item.quantity) }}</td>
              <td class="col-price">{{ formatPrice(item.sell_price) }}</td>
              <td class="col-price">{{ formatSubtotal(item.sell_price, item.quantity) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td>{{ t('market.total') }}</td>
              <td></td>
              <td></td>
              <td class="col-price total-val">{{ formatPrice(buyTotal) }}</td>
              <td></td>
              <td class="col-price total-val">{{ formatPrice(sellTotal) }}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </template>

    <!-- Reprocessing Tab -->
    <template v-if="tab === 'reprocess'">
      <div class="input-section">
        <textarea
          v-model="reprocessText"
          class="material-input"
          :placeholder="t('market.reprocessPlaceholder')"
          rows="6"
          @keydown="handleTabKeydown"
        ></textarea>
        <div class="reprocess-controls">
          <label class="reprocess-label">{{ t('market.reprocessRateOre') }}</label>
          <input type="number" v-model.number="reprocessRateOre" min="0" max="100" step="0.1" class="reprocess-rate-input" />
          <span class="reprocess-pct">%</span>
          <label class="reprocess-label reprocess-label-gap">{{ t('market.reprocessRateScrap') }}</label>
          <input type="number" v-model.number="reprocessRateScrap" min="0" max="100" step="0.1" class="reprocess-rate-input" />
          <span class="reprocess-pct">%</span>
          <button class="query-btn" :disabled="reprocessLoading || !reprocessText.trim()" @click="calcReprocess">
            {{ reprocessLoading ? t('market.querying') : t('market.reprocessCalc') }}
          </button>
        </div>
      </div>

      <div v-if="reprocessError" class="error-msg">{{ reprocessError }}</div>

      <!-- Input items -->
      <div v-if="reprocessInputItems.length" class="result-section">
        <h3 class="section-title">{{ t('market.reprocessInput') }}</h3>
        <table class="result-table">
          <thead>
            <tr>
              <th class="col-name">{{ t('market.colName') }}</th>
              <th class="col-qty">{{ t('market.colQty') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in reprocessInputItems" :key="item.type_id || item.name" :class="{ unmatched: !item.matched }">
              <td class="col-name">
                <div class="name-cell">
                  <img v-if="item.matched" class="type-icon" :src="`https://images.evetech.net/types/${item.type_id}/icon?size=32`" alt="" loading="lazy">
                  <span v-if="item.matched">{{ item.type_name }}</span>
                  <span v-else class="unmatched-name">{{ item.name }} <small>({{ t('market.unmatched') }})</small></span>
                </div>
              </td>
              <td class="col-qty">{{ formatNumber(item.quantity) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Reprocessing output -->
      <div v-if="reprocessResults.length" class="result-section">
        <h3 class="section-title">{{ t('market.reprocessOutput') }}</h3>
        <div class="reprocess-total">{{ t('market.total') }}：<span class="total-val">{{ formatPrice(reprocessTotal) }}</span> ISK</div>
        <table class="result-table">
          <thead>
            <tr>
              <th class="col-name">{{ t('market.colName') }}</th>
              <th class="col-qty">{{ t('market.colQty') }}</th>
              <th class="col-price">{{ t('market.colBuy') }}</th>
              <th class="col-price">{{ t('market.colBuyTotal') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="mat in reprocessResults" :key="mat.type_id">
              <td class="col-name">
                <div class="name-cell">
                  <img class="type-icon" :src="`https://images.evetech.net/types/${mat.type_id}/icon?size=32`" alt="" loading="lazy">
                  <span class="copyable" @click="copyName(mat.type_name, $event)">{{ mat.type_name }}</span>
                </div>
              </td>
              <td class="col-qty">{{ formatNumber(mat.quantity) }}</td>
              <td class="col-price">{{ formatPrice(mat.buy_price) }}</td>
              <td class="col-price">{{ formatSubtotal(mat.buy_price, mat.quantity) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- Ore Value Tab -->
    <template v-if="tab === 'oreValue'">
      <div v-if="oreValueLoading" class="loading-msg">{{ t('market.oreLoading') }}</div>
      <div v-if="oreValueError" class="error-msg">{{ oreValueError }}</div>
      <div v-if="oreValues.length" class="result-section">
        <h3 class="section-title">{{ t('market.oreValueTitle') }}</h3>
        <table class="result-table">
          <thead>
            <tr>
              <th class="col-name">{{ t('market.colOre') }}</th>
              <th class="col-price">{{ t('market.colIskM3') }}</th>
              <th class="col-qty">{{ t('market.colVolume') }}</th>
              <th class="col-price">{{ t('market.colPortionValue') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="ore in oreValues" :key="ore.type_id">
              <td class="col-name">
                <div class="name-cell">
                  <img class="type-icon" :src="`https://images.evetech.net/types/${ore.type_id}/icon?size=32`" alt="" loading="lazy">
                  <span>{{ ore.type_name }}</span>
                </div>
              </td>
              <td class="col-price">{{ formatPrice(ore.isk_per_m3) }}</td>
              <td class="col-qty">{{ ore.volume }} m³</td>
              <td class="col-price">{{ formatPrice(ore.portion_value) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { marketCompare } from '../api/prices'
import { useSettingsStore } from '../stores/settings'
import { useI18n } from '../i18n'
import { loadIndustryData, getIndustryData } from '../data/loader'
import { parseMaterialText, resolveItemNames } from '../services/market'
import { getOrderPricesForTypes } from '../services/esiClient'
import { locName } from '../services/locale'
import { useTabInput } from '../composables/useTabInput'

const settings = useSettingsStore()
const { t, serverLabel } = useI18n()
const { handleTabKeydown } = useTabInput()

const tab = ref('price')

// ── Price Query ──
const inputText = ref('')
const items = ref([])
const loading = ref(false)
const error = ref('')

// ── Sorting ──
const sortField = ref('')
const sortDirection = ref('asc') // 'asc' or 'desc'

const sortedItems = computed(() => {
  if (!sortField.value) return items.value
  
  return [...items.value].sort((a, b) => {
    let valueA, valueB
    
    switch (sortField.value) {
      case 'quantity':
        valueA = a.quantity || 0
        valueB = b.quantity || 0
        break
      case 'volume':
        valueA = a.matched ? (a.volume || 0) : 0
        valueB = b.matched ? (b.volume || 0) : 0
        break
      case 'buy_price':
        valueA = a.buy_price || 0
        valueB = b.buy_price || 0
        break
      case 'sell_price':
        valueA = a.sell_price || 0
        valueB = b.sell_price || 0
        break
      default:
        return 0
    }
    
    if (valueA === valueB) return 0
    if (sortDirection.value === 'asc') {
      return valueA > valueB ? 1 : -1
    } else {
      return valueA < valueB ? 1 : -1
    }
  })
})

function sortBy(field) {
  if (sortField.value === field) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortDirection.value = 'asc'
  }
}

function getSortClass(field) {
  if (sortField.value !== field) return ''
  return sortDirection.value === 'asc' ? 'sort-asc' : 'sort-desc'
}

onMounted(() => loadIndustryData())

async function queryPrices() {
  if (!inputText.value.trim()) return
  loading.value = true
  error.value = ''
  items.value = []

  try {
    const { data } = await marketCompare(inputText.value, settings.datasource)
    items.value = data.items
  } catch (e) {
    error.value = t('market.error')
  } finally {
    loading.value = false
  }
}

const buyTotal = computed(() => {
  return items.value.reduce((sum, item) => {
    if (item.matched && item.buy_price && item.quantity) {
      return sum + item.buy_price * item.quantity
    }
    return sum
  }, 0)
})

const sellTotal = computed(() => {
  return items.value.reduce((sum, item) => {
    if (item.matched && item.sell_price && item.quantity) {
      return sum + item.sell_price * item.quantity
    }
    return sum
  }, 0)
})

// ── Reprocessing ──
// Ore/ice/moon ore group IDs
const ORE_GROUPS = new Set([
  450,451,452,453,454,455,456,457,458,459,460,461,462,465,467,468,469, // standard ores + ice
  1884,1920,1921,1922,1923, // moon ores
  4029,4030,4031, // abyssal ores
  4513,4514,4515,4516, // new ores
  4755,4756,4757,4758,4759, // newer ores
])

const reprocessText = ref('')
const reprocessRateOre = ref(80)
const reprocessRateScrap = ref(50)
const reprocessInputItems = ref([])
const reprocessResults = ref([])
const reprocessLoading = ref(false)
const reprocessError = ref('')

async function calcReprocess() {
  if (!reprocessText.value.trim()) return
  reprocessLoading.value = true
  reprocessError.value = ''
  reprocessInputItems.value = []
  reprocessResults.value = []

  try {
    const indData = getIndustryData()
    if (!indData) throw new Error('Data not loaded')

    const parsed = parseMaterialText(reprocessText.value)
    if (!parsed.length) { reprocessError.value = t('market.error'); return }

    const resolved = resolveItemNames(parsed.map(p => p.name))
    const oreRate = reprocessRateOre.value / 100
    const scrapRate = reprocessRateScrap.value / 100

    // Build input items list
    reprocessInputItems.value = resolved.map((r, i) => ({
      ...r,
      quantity: parsed[i].quantity || 1,
    }))

    // Calculate reprocessing output
    const outputMap = {} // matTypeId -> total qty
    for (let i = 0; i < resolved.length; i++) {
      const r = resolved[i]
      if (!r.matched) continue
      const qty = parsed[i].quantity || 1
      const mats = indData.reprocess?.[r.type_id]
      if (!mats) continue
      const itemGroup = indData.types[r.type_id]?.g
      const rate = ORE_GROUPS.has(itemGroup) ? oreRate : scrapRate
      const portionSize = indData.types[r.type_id]?.ps || 1
      for (const [matTid, matQty] of mats) {
        const output = Math.floor(matQty * (qty / portionSize) * rate)
        if (output > 0) {
          outputMap[matTid] = (outputMap[matTid] || 0) + output
        }
      }
    }

    // Resolve output names and fetch Jita sell prices
    const matTypeIds = Object.keys(outputMap).map(Number)
    let orderPrices = {}
    if (matTypeIds.length) {
      try {
        orderPrices = await getOrderPricesForTypes(matTypeIds, settings.datasource)
      } catch { /* prices optional */ }
    }

    reprocessResults.value = matTypeIds
      .map(tid => {
        const t = indData.types[tid]
        return {
          type_id: tid,
          type_name: t ? locName(t) : String(tid),
          quantity: outputMap[tid],
          buy_price: orderPrices[tid]?.buy_price ?? null,
        }
      })
      .sort((a, b) => {
        const aVal = (a.buy_price || 0) * a.quantity
        const bVal = (b.buy_price || 0) * b.quantity
        return bVal - aVal
      })
  } catch (e) {
    reprocessError.value = t('market.error')
  } finally {
    reprocessLoading.value = false
  }
}

const reprocessTotal = computed(() => {
  return reprocessResults.value.reduce((sum, mat) => {
    if (mat.buy_price && mat.quantity) return sum + mat.buy_price * mat.quantity
    return sum
  }, 0)
})

// ── Ore Value ──
// All ore group IDs (standard + moon + abyssal + new + newest), excluding ice (465) and non-ore (463, 464, 466)
const ORE_VALUE_GROUPS = new Set([
  450,451,452,453,454,455,456,457,458,459,460,461,462,465,467,468,469, // standard ores + ice
  1884,1920,1921,1922,1923, // moon ores
  4029,4030,4031, // abyssal ores
  4513,4514,4515,4516, // new ores
  4755,4756,4757,4758,4759, // newer ores
])
// Special ores with portionSize=1 that should be excluded (survey-scannable asteroids)
const SPECIAL_ORE_IDS = new Set([28617,28618,28619,28620,28621,28622,28623,28624,28625,28626])

const oreValues = ref([])
const oreValueLoading = ref(false)
const oreValueError = ref('')
let oreValueLoaded = false

function findBaseOres(indData) {
  // Collect all non-compressed ore types with reprocess data grouped by groupId
  const byGroup = {}
  for (const [tid, t] of Object.entries(indData.types)) {
    if (!ORE_VALUE_GROUPS.has(t.g)) continue
    if (!indData.reprocess?.[tid]) continue
    const name = t.n
    if (name.includes('Compressed') || name.includes('Batch')) continue
    if (SPECIAL_ORE_IDS.has(Number(tid))) continue
    if (!byGroup[t.g]) byGroup[t.g] = []
    byGroup[t.g].push({ type_id: Number(tid), name, t })
  }

  const baseOres = []
  const groupNames = indData.groups

  for (const [gid, types] of Object.entries(byGroup)) {
    const groupName = groupNames[gid]?.n
    // For standard ores: find the type whose name matches the group name
    const exactMatch = types.find(o => o.name === groupName)
    if (exactMatch) {
      baseOres.push(exactMatch)
      continue
    }
    // For moon ores and others: a type is a base if another type's name ends with this type's name
    const nameSet = new Set(types.map(o => o.name))
    for (const ore of types) {
      const isVariant = types.some(other =>
        other.name !== ore.name && ore.name.endsWith(other.name)
      )
      if (!isVariant) baseOres.push(ore)
    }
  }

  return baseOres
}

async function loadOreValues() {
  if (oreValueLoaded) return
  oreValueLoading.value = true
  oreValueError.value = ''

  try {
    const indData = getIndustryData()
    if (!indData) throw new Error('Data not loaded')

    const baseOres = findBaseOres(indData)
    const RATE = 0.8

    // Collect all mineral type IDs from reprocess data
    const mineralIds = new Set()
    for (const ore of baseOres) {
      const mats = indData.reprocess[ore.type_id]
      if (mats) for (const [matTid] of mats) mineralIds.add(matTid)
    }

    // Fetch Jita buy prices for all minerals
    let orderPrices = {}
    if (mineralIds.size) {
      try {
        orderPrices = await getOrderPricesForTypes([...mineralIds], settings.datasource)
      } catch { /* prices optional */ }
    }

    // Calculate ISK/m³ for each base ore
    const results = []
    for (const ore of baseOres) {
      const mats = indData.reprocess[ore.type_id]
      if (!mats) continue
      const portionSize = ore.t.ps || 1
      const volume = ore.t.v || 0.1

      // Calculate total mineral value per portion
      let portionValue = 0
      for (const [matTid, matQty] of mats) {
        const output = Math.floor(matQty * RATE)
        const buyPrice = orderPrices[matTid]?.buy_price || 0
        portionValue += output * buyPrice
      }

      const totalVolume = volume * portionSize
      const iskPerM3 = totalVolume > 0 ? portionValue / totalVolume : 0

      results.push({
        type_id: ore.type_id,
        type_name: locName(ore.t),
        isk_per_m3: iskPerM3,
        volume,
        portion_value: portionValue,
      })
    }

    // Sort by ISK/m³ descending
    results.sort((a, b) => b.isk_per_m3 - a.isk_per_m3)
    oreValues.value = results
    oreValueLoaded = true
  } catch (e) {
    oreValueError.value = t('market.error')
  } finally {
    oreValueLoading.value = false
  }
}

// ── Shared ──
function formatNumber(n) {
  return n != null ? n.toLocaleString() : '-'
}

function formatPrice(p) {
  if (p == null) return '-'
  return Number(p).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatVolume(volume, quantity = 1) {
  if (volume == null || quantity == null) return '-'
  const total = volume * quantity
  if (total < 1000) {
    return `${total.toLocaleString()} m³`
  } else {
    return `${(total / 1000).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km³`
  }
}

function formatSubtotal(price, quantity) {
  if (price == null || quantity == null) return '-'
  return (price * quantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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
    el.setAttribute('data-copied-tip', t('industry.copied'))
    el.classList.add('copied')
  }
}

onMounted(() => document.addEventListener('click', clearCopied))
onUnmounted(() => document.removeEventListener('click', clearCopied))
</script>

<style scoped>
.market {
  padding-top: 20px;
}

.title {
  color: #c8aa6e;
  font-size: 1.8em;
  margin-bottom: 4px;
  text-align: center;
}

.tabs {
  display: flex;
  justify-content: center;
  gap: 4px;
  margin-bottom: 20px;
}

.tab {
  padding: 8px 24px;
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 6px 6px 0 0;
  color: #8a8a8a;
  font-size: 0.9em;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s;
}

.tab:hover {
  color: #c8aa6e;
}

.tab.active {
  color: #c8aa6e;
  border-color: #c8aa6e;
  border-bottom-color: #0d0d0d;
  background: #0d0d0d;
  font-weight: 600;
}

.input-section {
  max-width: 700px;
  margin: 0 auto 24px;
}

.material-input {
  width: 100%;
  background: #0d0d0d;
  border: 1px solid #2a2a2a;
  border-radius: 6px;
  color: #d0d0d0;
  padding: 10px 14px;
  font-size: 0.95em;
  font-family: inherit;
  resize: vertical;
  box-sizing: border-box;
}

.material-input::placeholder {
  color: #555555;
}

.material-input:focus {
  outline: none;
  border-color: #c8aa6e;
}

.reprocess-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 12px;
}

.reprocess-label {
  color: #8a8a8a;
  font-size: 0.85em;
  white-space: nowrap;
}

.reprocess-rate-input {
  width: 70px;
  padding: 6px 8px;
  background: #0d0d0d;
  border: 1px solid #2a2a2a;
  border-radius: 6px;
  color: #d0d0d0;
  text-align: center;
  font-size: 0.9em;
  outline: none;
}

.reprocess-rate-input:focus {
  border-color: #c8aa6e;
}

.reprocess-pct {
  color: #8a8a8a;
  font-size: 0.85em;
}

.reprocess-label-gap {
  margin-left: 12px;
}

.query-btn {
  background: #c8aa6e;
  color: #0d0d0d;
  border: none;
  border-radius: 6px;
  padding: 8px 24px;
  font-size: 0.95em;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.query-btn:hover:not(:disabled) {
  background: #e0c882;
}

.query-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-msg {
  text-align: center;
  color: #ef5350;
  margin-bottom: 16px;
}

.reprocess-total {
  text-align: center;
  font-size: 1.2em;
  font-weight: 600;
  color: #d0d0d0;
  margin-bottom: 12px;
}

.reprocess-total .total-val {
  color: #c8aa6e;
  font-size: 1.1em;
}

.loading-msg {
  text-align: center;
  color: #8a8a8a;
  margin-bottom: 16px;
}

.section-title {
  color: #c8aa6e;
  margin-bottom: 8px;
  font-size: 1em;
}

.result-section {
  overflow-x: auto;
  margin-bottom: 20px;
}

.price-summary {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  justify-content: flex-start;
}

.summary-card {
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 8px;
  padding: 16px 20px;
  min-width: 140px;
  text-align: center;
}

.summary-label {
  color: #8a8a8a;
  font-size: 0.85em;
  margin-bottom: 4px;
  font-weight: 500;
}

.summary-value {
  font-size: 1.2em;
  font-weight: 600;
}

.buy-total {
  color: #4caf50;
}

.sell-total {
  color: #ff9800;
}

.result-table {
  width: 100%;
  background: #1a1a1a;
  border-radius: 8px;
  overflow: hidden;
  border-collapse: collapse;
}

.result-table th {
  background: rgba(200, 170, 110, 0.08);
  color: #c8aa6e;
  padding: 10px 12px;
  font-size: 0.9em;
  font-weight: 500;
  border-bottom: 1px solid #2a2a2a;
  position: relative;
}

.result-table th.sortable {
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s;
}

.result-table th.sortable:hover {
  background: rgba(200, 170, 110, 0.12);
}

.sort-indicator {
  margin-left: 4px;
  opacity: 0.6;
}

.sort-indicator.sort-asc::after {
  content: '↑';
}

.sort-indicator.sort-desc::after {
  content: '↓';
}

.result-table td {
  padding: 8px 12px;
  border-bottom: 1px solid rgba(42, 42, 42, 0.5);
}

.col-name {
  text-align: left;
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

.col-qty,
.col-volume,
.col-price {
  text-align: right;
  white-space: nowrap;
}

.unmatched td {
  opacity: 0.6;
}

.unmatched-name {
  color: #ef5350;
}

.unmatched-name small {
  font-size: 0.8em;
}

.total-row {
  font-weight: bold;
}

.total-row td {
  border-top: 2px solid #2a2a2a;
  border-bottom: none;
  padding: 10px 12px;
  color: #c8aa6e;
}

.total-val {
  color: #c8aa6e;
}
</style>
