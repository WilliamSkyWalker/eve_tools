<template>
  <div class="market">
    <h1 class="title">{{ serverLabel }} {{ t('market.title') }}</h1>

    <!-- Tabs -->
    <div class="tabs">
      <button :class="['tab', { active: tab === 'price' }]" @click="tab = 'price'">{{ t('market.tabPrice') }}</button>
      <button :class="['tab', { active: tab === 'reprocess' }]" @click="tab = 'reprocess'">{{ t('market.tabReprocess') }}</button>
    </div>

    <!-- Price Query Tab -->
    <template v-if="tab === 'price'">
      <div class="input-section">
        <textarea
          v-model="inputText"
          class="material-input"
          :placeholder="t('market.placeholder')"
          rows="6"
        ></textarea>
        <button class="query-btn" :disabled="loading || !inputText.trim()" @click="queryPrices">
          {{ loading ? t('market.querying') : t('market.query') }}
        </button>
      </div>

      <div v-if="error" class="error-msg">{{ error }}</div>

      <div v-if="items.length" class="result-section">
        <table class="result-table">
          <thead>
            <tr>
              <th class="col-name">{{ t('market.colName') }}</th>
              <th class="col-qty">{{ t('market.colQty') }}</th>
              <th class="col-price">{{ t('market.colBuy') }}</th>
              <th class="col-price">{{ t('market.colBuyTotal') }}</th>
              <th class="col-price">{{ t('market.colSell') }}</th>
              <th class="col-price">{{ t('market.colSellTotal') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in items" :key="item.name" :class="{ unmatched: !item.matched }">
              <td class="col-name">
                <div class="name-cell">
                  <img v-if="item.matched" class="type-icon" :src="`https://images.evetech.net/types/${item.type_id}/icon?size=32`" alt="" loading="lazy">
                  <span v-if="item.matched" class="copyable" @click="copyName(item.type_name)">
                    {{ item.type_name }}
                  </span>
                  <span v-else class="unmatched-name">{{ item.name }} <small>({{ t('market.unmatched') }})</small></span>
                </div>
              </td>
              <td class="col-qty">{{ formatNumber(item.quantity) }}</td>
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
        <table class="result-table">
          <thead>
            <tr>
              <th class="col-name">{{ t('market.colName') }}</th>
              <th class="col-qty">{{ t('market.colQty') }}</th>
              <th class="col-price">{{ t('market.colSell') }}</th>
              <th class="col-price">{{ t('market.colSellTotal') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="mat in reprocessResults" :key="mat.type_id">
              <td class="col-name">
                <div class="name-cell">
                  <img class="type-icon" :src="`https://images.evetech.net/types/${mat.type_id}/icon?size=32`" alt="" loading="lazy">
                  <span class="copyable" @click="copyName(mat.type_name)">{{ mat.type_name }}</span>
                </div>
              </td>
              <td class="col-qty">{{ formatNumber(mat.quantity) }}</td>
              <td class="col-price">{{ formatPrice(mat.sell_price) }}</td>
              <td class="col-price">{{ formatSubtotal(mat.sell_price, mat.quantity) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td>{{ t('market.total') }}</td>
              <td></td>
              <td></td>
              <td class="col-price total-val">{{ formatPrice(reprocessTotal) }}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { marketCompare } from '../api/prices'
import { useSettingsStore } from '../stores/settings'
import { useI18n } from '../i18n'
import { loadIndustryData, getIndustryData } from '../data/loader'
import { parseMaterialText, resolveItemNames } from '../services/market'
import { getOrderPricesForTypes } from '../services/esiClient'
import { locName } from '../services/locale'

const settings = useSettingsStore()
const { t, serverLabel } = useI18n()

const tab = ref('price')

// ── Price Query ──
const inputText = ref('')
const items = ref([])
const loading = ref(false)
const error = ref('')

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
          sell_price: orderPrices[tid]?.sell_price ?? null,
        }
      })
      .sort((a, b) => {
        const aVal = (a.sell_price || 0) * a.quantity
        const bVal = (b.sell_price || 0) * b.quantity
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
    if (mat.sell_price && mat.quantity) return sum + mat.sell_price * mat.quantity
    return sum
  }, 0)
})

// ── Shared ──
function formatNumber(n) {
  return n != null ? n.toLocaleString() : '-'
}

function formatPrice(p) {
  if (p == null) return '-'
  return Number(p).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatSubtotal(price, quantity) {
  if (price == null || quantity == null) return '-'
  return (price * quantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function copyName(name) {
  navigator.clipboard.writeText(name)
}
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

.section-title {
  color: #c8aa6e;
  margin-bottom: 8px;
  font-size: 1em;
}

.result-section {
  overflow-x: auto;
  margin-bottom: 20px;
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
.col-price {
  text-align: right;
  white-space: nowrap;
}

.copyable {
  cursor: pointer;
  transition: color 0.2s;
}

.copyable:hover {
  color: #c8aa6e;
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
