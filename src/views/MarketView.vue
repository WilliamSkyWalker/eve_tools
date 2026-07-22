<template>
  <div class="market">
    <div class="page-head">
      <div class="titles">
        <h1>{{ pageTitle }} <span class="srv-chip" :class="settings.server">{{ serverLabel }}</span><PageHelp topic="market" /></h1>
      </div>
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
      <div v-if="esiDown" class="esi-down-msg">{{ t('market.esiDown') }}</div>

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
              <th class="col-volume sortable" @click="sortBy('totalVolume')">
                {{ t('market.colTotalVolume') }}
                <span class="sort-indicator" :class="getSortClass('totalVolume')"></span>
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
            <tr class="total-row">
              <td>{{ t('market.total') }}</td>
              <td></td>
              <td></td>
              <td class="col-volume total-val">{{ volumeTotal ? `${volumeTotal.toLocaleString()} m³` : '-' }}</td>
              <td class="col-price total-val">{{ formatPrice(buyTotal) }}</td>
              <td></td>
              <td class="col-price total-val">{{ formatPrice(sellTotal) }}</td>
              <td></td>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in sortedItems" :key="item.name" :class="{ unmatched: !item.matched }">
              <td class="col-name">
                <div class="name-cell">
                  <img v-if="item.matched" class="type-icon" :src="typeIcon(item.type_id)" alt="" loading="lazy" @error="onTypeIconError">
                  <span v-if="item.matched" class="copyable" @click="copyName(item.type_name, $event)">
                    {{ item.type_name }}
                  </span>
                  <span v-else class="unmatched-name">{{ item.name }} <small>({{ t('market.unmatched') }})</small></span>
                </div>
              </td>
              <td class="col-qty">{{ formatNumber(item.quantity) }}</td>
              <td class="col-volume">{{ item.matched ? formatVolume(item.volume, 1) : '-' }}</td>
              <td class="col-volume">{{ item.matched ? formatVolume(item.volume, item.quantity) : '-' }}</td>
              <td class="col-price">{{ formatPrice(item.buy_price) }}</td>
              <td class="col-price">{{ formatSubtotal(item.buy_price, item.quantity) }}</td>
              <td class="col-price">{{ formatPrice(item.sell_price) }}</td>
              <td class="col-price">{{ formatSubtotal(item.sell_price, item.quantity) }}</td>
            </tr>
          </tbody>
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
          <label class="reprocess-label reprocess-label-gap">{{ t('market.reprocessDiscount') }}</label>
          <input type="number" v-model.number="reprocessDiscount" min="0" step="0.1" class="reprocess-rate-input" />
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
              <th class="col-volume">{{ t('market.colVolume') }}</th>
              <th class="col-volume">{{ t('market.colTotalVolume') }}</th>
            </tr>
            <tr class="total-row">
              <td>{{ t('market.total') }}</td>
              <td></td>
              <td></td>
              <td class="col-volume total-val">{{ reprocessInputVolume ? `${reprocessInputVolume.toLocaleString()} m³` : '-' }}</td>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in reprocessInputItems" :key="item.type_id || item.name" :class="{ unmatched: !item.matched }">
              <td class="col-name">
                <div class="name-cell">
                  <img v-if="item.matched" class="type-icon" :src="typeIcon(item.type_id)" alt="" loading="lazy" @error="onTypeIconError">
                  <span v-if="item.matched">{{ item.type_name }}</span>
                  <span v-else class="unmatched-name">{{ item.name }} <small>({{ t('market.unmatched') }})</small></span>
                </div>
              </td>
              <td class="col-qty">{{ formatNumber(item.quantity) }}</td>
              <td class="col-volume">{{ item.matched ? formatVolume(item.volume, 1) : '-' }}</td>
              <td class="col-volume">{{ item.matched ? formatVolume(item.volume, item.quantity) : '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Reprocessing output -->
      <div v-if="reprocessResults.length" class="result-section">
        <h3 class="section-title">{{ t('market.reprocessOutput') }}</h3>
        <table class="result-table">
          <thead>
            <tr>
              <th class="col-name">{{ t('market.colName') }}</th>
              <th class="col-qty">{{ t('market.colQty') }}</th>
              <th class="col-volume">{{ t('market.colVolume') }}</th>
              <th class="col-volume">{{ t('market.colTotalVolume') }}</th>
              <th class="col-price">{{ t('market.colBuy') }}</th>
              <th class="col-discount">{{ t('market.colDiscount') }}</th>
              <th class="col-price">{{ t('market.colBuyTotal') }}</th>
            </tr>
            <tr class="total-row">
              <td>{{ t('market.total') }}</td>
              <td></td>
              <td></td>
              <td class="col-volume total-val">{{ reprocessOutputVolume ? `${reprocessOutputVolume.toLocaleString()} m³` : '-' }}</td>
              <td></td>
              <td></td>
              <td class="col-price total-val">{{ formatPrice(reprocessTotal) }}</td>
            </tr>
          </thead>
          <tbody>
            <template v-for="(mat, idx) in reprocessResults" :key="mat.type_id">
              <tr v-if="mat.group_name && (idx === 0 || mat.group_name !== reprocessResults[idx - 1].group_name)" class="group-row">
                <td colspan="7" class="group-label">{{ mat.group_name }}</td>
              </tr>
              <tr>
                <td class="col-name">
                  <div class="name-cell">
                    <img class="type-icon" :src="typeIcon(mat.type_id)" alt="" loading="lazy" @error="onTypeIconError">
                    <span class="copyable" @click="copyName(mat.type_name, $event)">{{ mat.type_name }}</span>
                  </div>
                </td>
                <td class="col-qty">{{ formatNumber(mat.quantity) }}</td>
                <td class="col-volume">{{ formatVolume(mat.volume, 1) }}</td>
                <td class="col-volume">{{ formatVolume(mat.volume, mat.quantity) }}</td>
                <td class="col-price">{{ formatPrice(mat.buy_price) }}</td>
                <td class="col-discount">
                  <input type="number" v-model.number="mat.discount" min="0" step="0.1" class="discount-input" />
                  <span class="reprocess-pct">%</span>
                </td>
                <td class="col-price">{{ formatSubtotal(discountedPrice(mat), mat.quantity) }}</td>
              </tr>
            </template>
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
                  <img class="type-icon" :src="typeIcon(ore.type_id)" alt="" loading="lazy" @error="onTypeIconError">
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
import { useRoute } from 'vue-router'
import { marketCompare } from '../api/prices'
import { useSettingsStore } from '../stores/settings'
import { useI18n } from '../i18n'
import { loadIndustryData, getIndustryData } from '../data/loader'
import { parseMaterialText, resolveItemNames } from '../services/market'
import { getOrderPricesForTypes } from '../services/esiClient'
import { locName } from '../services/locale'
import { typeIcon, onTypeIconError } from '../services/typeIcon'
import { useTabInput } from '../composables/useTabInput'
import PageHelp from '../components/layout/PageHelp.vue'

const settings = useSettingsStore()
const { t, serverLabel } = useI18n()
const { handleTabKeydown } = useTabInput()

const route = useRoute()
// Each of the three market tools is its own route (meta.mtab drives which one).
const tab = ref(route.meta.mtab || 'price')
const pageTitle = computed(() =>
  tab.value === 'reprocess' ? t('market.tabReprocess')
  : tab.value === 'oreValue' ? t('market.tabOreValue')
  : t('market.title'))

// ── Price Query ──
const inputText = ref('')
const items = ref([])
const loading = ref(false)
const error = ref('')
const esiDown = ref(false)

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
      case 'totalVolume':
        valueA = a.matched ? (a.volume || 0) * (a.quantity || 0) : 0
        valueB = b.matched ? (b.volume || 0) * (b.quantity || 0) : 0
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

onMounted(() => {
  loadIndustryData()
  if (tab.value === 'oreValue') loadOreValues()
})

async function queryPrices() {
  if (!inputText.value.trim()) return
  loading.value = true
  error.value = ''
  esiDown.value = false
  items.value = []

  try {
    const { data } = await marketCompare(inputText.value, settings.datasource)
    items.value = data.items
    esiDown.value = !!data.esiUnavailable
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

const volumeTotal = computed(() => {
  return items.value.reduce((sum, item) => {
    if (item.matched && item.volume && item.quantity) {
      return sum + item.volume * item.quantity
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
const reprocessDiscount = ref(100)
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
    const discount = reprocessDiscount.value

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
        const { prices } = await getOrderPricesForTypes(matTypeIds, settings.datasource)
        orderPrices = prices
      } catch { /* prices optional */ }
    }

    reprocessResults.value = matTypeIds
      .map(tid => {
        const t = indData.types[tid]
        const gid = t?.g
        return {
          type_id: tid,
          type_name: t ? locName(t) : String(tid),
          quantity: outputMap[tid],
          volume: t?.v ?? null,
          buy_price: orderPrices[tid]?.buy_price ?? null,
          discount,
          group_id: gid ?? 0,
          group_name: (gid != null && indData.groups?.[gid]?.n) || '',
        }
      })
      // Group by item category (group), then by total value ascending within each group
      .sort((a, b) => {
        if (a.group_name !== b.group_name) return a.group_name.localeCompare(b.group_name)
        const aVal = (a.buy_price || 0) * a.quantity
        const bVal = (b.buy_price || 0) * b.quantity
        return aVal - bVal
      })
  } catch (e) {
    reprocessError.value = t('market.error')
  } finally {
    reprocessLoading.value = false
  }
}

function discountedPrice(mat) {
  if (mat.buy_price == null) return null
  const d = mat.discount != null ? mat.discount : 100
  return mat.buy_price * d / 100
}

const reprocessTotal = computed(() => {
  return reprocessResults.value.reduce((sum, mat) => {
    const p = discountedPrice(mat)
    if (p && mat.quantity) return sum + p * mat.quantity
    return sum
  }, 0)
})

const reprocessInputVolume = computed(() => {
  return reprocessInputItems.value.reduce((sum, item) => {
    if (item.matched && item.volume && item.quantity) return sum + item.volume * item.quantity
    return sum
  }, 0)
})

const reprocessOutputVolume = computed(() => {
  return reprocessResults.value.reduce((sum, mat) => {
    if (mat.volume && mat.quantity) return sum + mat.volume * mat.quantity
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
        const { prices } = await getOrderPricesForTypes([...mineralIds], settings.datasource)
        orderPrices = prices
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
  return `${total.toLocaleString()} m³`
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
/* ── Tabs ── */
.tabs { display: flex; gap: 4px; margin-bottom: 16px; border-bottom: 1px solid var(--border-default); flex-wrap: wrap; }
.tab {
  background: none; border: none; border-bottom: 2px solid transparent;
  color: var(--text-muted); padding: 9px 14px; font-size: var(--text-md); font-weight: 500;
  margin-bottom: -1px; transition: color .15s;
}
.tab:hover { color: var(--text-primary); }
.tab.active { color: var(--gold); border-bottom-color: var(--gold); }

/* ── Input area ── */
.input-section { display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px; }
.material-input {
  width: 100%; min-height: 120px; resize: vertical;
  background: var(--bg-input); border: 1px solid var(--border-default);
  border-radius: var(--radius-lg); color: var(--text-primary);
  font-family: var(--font-mono); font-size: var(--text-sm); line-height: 1.7; padding: 11px 13px;
}
.material-input:focus { outline: none; border-color: var(--gold-line); }

.query-btn {
  align-self: flex-start; height: 38px; padding: 0 22px;
  border: none; border-radius: var(--radius-md);
  background: var(--gold); color: var(--gold-ink); font-weight: 650; font-size: var(--text-base);
  transition: background .15s;
}
.query-btn:hover:not(:disabled) { background: var(--gold-hover); }
.query-btn:disabled { opacity: .45; cursor: not-allowed; }

.reprocess-controls { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.reprocess-label { font-size: var(--text-sm); color: var(--text-muted); }
.reprocess-label-gap { margin-left: 12px; }
.reprocess-rate-input {
  width: 72px; height: 34px; text-align: center;
  background: var(--bg-input); border: 1px solid var(--border-default);
  border-radius: var(--radius-md); color: var(--text-primary); font-family: var(--font-mono);
}
.reprocess-rate-input:focus { outline: none; border-color: var(--gold-line); }
.reprocess-pct { color: var(--text-muted); font-size: var(--text-sm); }

/* ── Messages ── */
.error-msg { color: var(--red); margin-bottom: 12px; }
.esi-down-msg { color: var(--orange); margin-bottom: 12px; font-size: var(--text-sm); }
.loading-msg { text-align: center; color: var(--text-dim); padding: 26px; }

/* ── Price summary tiles ── */
.price-summary { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
.summary-card { background: var(--bg-panel); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 14px 18px; }
.summary-label { font-size: var(--text-sm); color: var(--text-dim); margin-bottom: 4px; }
.summary-value { font-size: 22px; font-weight: 700; font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
.buy-total { color: var(--red); }
.sell-total { color: var(--green); }

/* ── Result tables ── */
.result-section { margin-bottom: 20px; }
.section-title { font-size: var(--text-base); font-weight: 600; margin-bottom: 10px; color: var(--text-primary); }
.result-table {
  width: 100%; border-collapse: collapse;
  border: 1px solid var(--border-default); border-radius: var(--radius-lg); overflow: hidden;
}
.result-table th {
  text-transform: uppercase; font-size: var(--text-xs); color: var(--text-dim); letter-spacing: 0.03em;
  background: var(--bg-panel-2); padding: 9px 14px; border-bottom: 1px solid var(--border-default); font-weight: 600;
}
.result-table td { padding: 8px 14px; border-bottom: 1px solid rgba(255, 255, 255, 0.035); font-size: var(--text-base); }
.result-table tbody tr:last-child td { border-bottom: none; }
.result-table tbody tr:hover { background: rgba(255, 255, 255, 0.025); }

.col-qty, .col-volume, .col-price, th.col-qty, th.col-volume, th.col-price {
  text-align: right; font-family: var(--font-mono); font-variant-numeric: tabular-nums;
}
th.col-qty, th.col-volume, th.col-price { font-family: var(--font-sans); }
.col-name, th.col-name { text-align: left; }
.col-discount, th.col-discount { text-align: center; white-space: nowrap; }

.sortable { cursor: pointer; user-select: none; }
.sortable:hover { color: var(--text-muted); }
.sort-indicator { display: inline-block; width: 12px; }
.sort-indicator.sort-asc::after { content: '▲'; font-size: 8px; color: var(--gold); }
.sort-indicator.sort-desc::after { content: '▼'; font-size: 8px; color: var(--gold); }

.total-row td { background: var(--bg-panel-2); font-weight: 600; color: var(--text-secondary); border-bottom: 1px solid var(--border-default); }
.total-val { color: var(--text-primary); font-family: var(--font-mono); font-variant-numeric: tabular-nums; }

.name-cell { display: flex; align-items: center; gap: 8px; min-width: 0; }
.type-icon { width: 24px; height: 24px; border-radius: 4px; flex: none; }
tr.unmatched td { color: var(--text-dim); }
.unmatched-name { color: var(--text-dim); font-style: italic; }

.group-row td { padding: 7px 14px 3px; background: transparent; }
.group-label { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-dim); }

.discount-input {
  width: 58px; height: 28px; text-align: right;
  background: var(--bg-input); border: 1px solid var(--border-default);
  border-radius: var(--radius-sm); color: var(--text-primary); font-family: var(--font-mono);
}
.discount-input:focus { outline: none; border-color: var(--gold-line); }

@media (max-width: 640px) {
  .price-summary { grid-template-columns: 1fr; }
}
</style>
