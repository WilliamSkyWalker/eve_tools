<template>
  <div class="industry">
    <button class="t2rank-btn" @click="openT2Rank">{{ t('industry.t2RankBtn') }}</button>
    <h1 class="title">{{ t('industry.title') }} ({{ serverLabel }})<PageHelp topic="industry" /></h1>

    <ManufacturingQueue @calculate="onCalculate" />

    <div v-if="calculating" class="loading">{{ t('industry.calculating') }}</div>

    <template v-if="levels.length">
      <div class="global-me-bar">
        <label class="global-me-label">{{ t('industry.subComponentMe') }}</label>
        <input type="number" v-model.number="globalMe" min="0" max="10" class="global-me-input" />
        <button class="global-me-btn" @click="applyGlobalMe">{{ t('industry.applyMe') }}</button>
        <span class="bar-spacer"></span>
        <button class="global-me-btn" @click="sharePlan">{{ shareLabel }}</button>
      </div>

      <!-- Tier columns grid -->
      <div class="tier-grid">
        <!-- Final product -->
        <section class="tier-col tier-col-product">
          <header class="tier-head">
            <div class="tier-title-row">
              <span class="tier-name">{{ t('industry.finalProduct') }}</span>
            </div>
            <div v-if="productSellPrice != null || productVolume != null || totalTime.max" class="tier-stats">
              <span v-if="productSellPrice != null" class="stat-item sell">{{ t('industry.sell') }} {{ formatPrice(productSellPrice) }}</span>
              <span v-if="productBuyPrice != null" class="stat-item buy">{{ t('industry.buy') }} {{ formatPrice(productBuyPrice) }}</span>
              <span v-if="productVolume != null" class="stat-item volume">{{ t('industry.volume') }} {{ formatVolume(productVolume) }}</span>
              <span v-if="totalTime.max" class="stat-item time">{{ formatTime(totalTime.min) }} ~ {{ formatTime(totalTime.max) }}</span>
            </div>
          </header>
          <table class="tier-table">
            <colgroup>
              <col><!-- product name fills remaining width -->
              <col class="col-qty">
            </colgroup>
            <tbody>
              <tr v-for="item in currentItems" :key="item.blueprint_type_id">
                <td class="name-cell">
                  <img class="type-icon" :src="`https://images.evetech.net/types/${item.product_type_id}/icon?size=32`" alt="" loading="lazy">
                  <span class="product-name-text">{{ item.product_name }}</span>
                </td>
                <td class="qty-cell">{{ formatNumber(item.runs) }}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <!-- Level columns -->
        <section v-for="lvl in levels" :key="lvl.level" class="tier-col" :class="{ 'tier-col-me': lvl.level === 0 && hasManufacturable(lvl) }">
          <header class="tier-head">
            <div class="tier-title-row">
              <span class="tier-name">{{ levelLabel(lvl.level) }}</span>
              <button class="tier-inv-btn" @click="openInventory(lvl.level)">{{ t('industry.inventoryBtn') }}</button>
            </div>
            <div v-if="levelStats[lvl.level]" class="tier-stats">
              <span v-if="levelStats[lvl.level].sellTotal != null" class="stat-item sell">{{ t('industry.sell') }} {{ formatPrice(levelStats[lvl.level].sellTotal) }}</span>
              <span v-if="levelStats[lvl.level].buyTotal != null" class="stat-item buy">{{ t('industry.buy') }} {{ formatPrice(levelStats[lvl.level].buyTotal) }}</span>
              <span v-if="levelStats[lvl.level].volume" class="stat-item volume">{{ t('industry.volume') }} {{ formatVolume(levelStats[lvl.level].volume) }}</span>
              <span v-if="levelStats[lvl.level].minTime" class="stat-item time">{{ formatTime(levelStats[lvl.level].minTime) }} ~ {{ formatTime(levelStats[lvl.level].maxTime) }}</span>
            </div>
            <div v-else-if="priceLoading" class="tier-stats"><span class="stat-item loading-stat">...</span></div>
          </header>
          <table class="tier-table" @copy="onTableCopy($event, lvl)">
            <colgroup>
              <col><!-- material name fills remaining width -->
              <col class="col-qty">
              <col v-if="lvl.level === 0 && hasManufacturable(lvl)" class="col-me">
            </colgroup>
            <tbody>
              <template v-for="(mat, idx) in lvl.materials" :key="mat.type_id">
                <tr v-if="lvl.hasMixed && (idx === 0 || mat.build !== lvl.materials[idx - 1].build)" class="super-group-row">
                  <td :colspan="colSpan(lvl)" class="super-group-label">{{ mat.build ? t('industry.toProcess') : t('industry.otherMaterials') }}</td>
                </tr>
                <tr v-if="idx === 0 || mat.group_name !== lvl.materials[idx - 1].group_name || mat.build !== lvl.materials[idx - 1].build" class="group-row">
                  <td :colspan="colSpan(lvl)" class="group-label">{{ mat.group_name }}</td>
                </tr>
                <tr :class="{ 'skipped-row': skippedItems.has(mat.type_id), 'owned-row': isOwned(lvl.level, mat.type_id, mat.quantity) }" @contextmenu.prevent="toggleOwned(lvl.level, mat.type_id, mat.quantity)">
                  <td class="name-cell">
                    <img class="type-icon" :src="`https://images.evetech.net/types/${mat.type_id}/icon?size=32`" alt="" loading="lazy">
                    <span
                      class="copyable"
                      :class="{
                        'name-reaction': mat.is_reaction && !skippedItems.has(mat.type_id),
                        'name-mfg': mat.is_manufacturable && !mat.is_reaction && !skippedItems.has(mat.type_id),
                        'name-skipped': skippedItems.has(mat.type_id),
                      }"
                      :data-tid="mat.type_id"
                      :title="mat.type_name"
                      @click="copyName(mat.type_name, $event)"
                    >{{ mat.type_name }}</span>
                  </td>
                  <td class="qty-cell">{{ formatNumber(mat.quantity) }}</td>
                  <td class="me-cell" v-if="lvl.level === 0 && hasManufacturable(lvl)">
                    <input
                      v-if="mat.build && !mat.is_reaction"
                      type="number"
                      :value="getBuildMe(mat.type_id)"
                      @change="onMeChange(mat.type_id, $event)"
                      min="0" max="10"
                      class="me-input"
                    />
                    <span v-else-if="mat.is_reaction && mat.build" class="me-na">-</span>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </section>

        <!-- Summary column -->
        <section v-if="summary.length" class="tier-col">
          <header class="tier-head">
            <div class="tier-title-row">
              <span class="tier-name">{{ t('industry.rawSummary') }}</span>
              <button class="tier-inv-btn" @click="openInventory('summary')">{{ t('industry.inventoryBtn') }}</button>
            </div>
            <div v-if="levelStats['summary']?.sellTotal || levelStats['summary']?.volume" class="tier-stats">
              <span v-if="levelStats['summary'].sellTotal != null" class="stat-item sell">{{ t('industry.sell') }} {{ formatPrice(levelStats['summary'].sellTotal) }}</span>
              <span v-if="levelStats['summary'].buyTotal != null" class="stat-item buy">{{ t('industry.buy') }} {{ formatPrice(levelStats['summary'].buyTotal) }}</span>
              <span v-if="levelStats['summary'].volume" class="stat-item volume">{{ t('industry.volume') }} {{ formatVolume(levelStats['summary'].volume) }}</span>
            </div>
          </header>
          <table class="tier-table" @copy="onSummaryCopy($event)">
            <colgroup>
              <col><!-- material name fills remaining width -->
              <col class="col-qty">
            </colgroup>
            <tbody>
              <tr v-for="mat in summary" :key="mat.type_id" :class="{ 'owned-row': isOwned('summary', mat.type_id, mat.total_quantity) }" @contextmenu.prevent="toggleOwned('summary', mat.type_id, mat.total_quantity)">
                <td class="name-cell">
                  <img class="type-icon" :src="`https://images.evetech.net/types/${mat.type_id}/icon?size=32`" alt="" loading="lazy">
                  <span class="copyable" :data-tid="mat.type_id" :title="mat.type_name" @click="copyName(mat.type_name, $event)">{{ mat.type_name }}</span>
                </td>
                <td class="qty-cell">{{ formatNumber(mat.total_quantity) }}</td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>
    </template>

    <!-- Inventory Modal -->
    <Teleport to="body">
      <div v-if="inventoryModal !== null" class="modal-overlay" @click.self="inventoryModal = null">
        <div class="modal-content inv-modal">
          <button class="modal-close" @click="inventoryModal = null">&times;</button>
          <h2 class="modal-title">{{ levelLabel(inventoryModal) }} - {{ t('industry.pasteInventory') }}</h2>

          <div class="inv-body">
            <!-- Left: paste area -->
            <div class="inv-left">
              <p class="inv-hint">{{ t('industry.inventoryHint') }}</p>
              <textarea
                v-model="inventoryText"
                class="inventory-textarea"
                :placeholder="t('industry.inventoryPlaceholder')"
                rows="12"
                @input="onInventoryInput"
                @keydown="handleTabKeydown"
              ></textarea>
            </div>

            <!-- Right: materials table -->
            <div class="inv-right">
              <div class="inv-table-wrap">
                <table class="inv-table">
                  <thead>
                    <tr>
                      <th>{{ t('industry.material') }}</th>
                      <th class="num">{{ t('industry.quantity') }}</th>
                      <th class="num">{{ t('industry.haveQty') }}</th>
                      <th class="num">{{ t('industry.needQty') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="mat in modalMaterials" :key="mat.type_id">
                      <td class="inv-name">{{ mat.type_name }}</td>
                      <td class="num">{{ formatNumber(mat.required) }}</td>
                      <td class="num have-val">{{ mat.have ? formatNumber(mat.have) : '' }}</td>
                      <td class="num" :class="mat.need > 0 ? 'need-val' : 'need-zero'">{{ formatNumber(mat.need) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="inv-actions">
                <button class="modal-btn copy-btn" @click="copyNeed">{{ copyLabel }}</button>
                <button class="modal-btn clear-btn" @click="clearInventory">{{ t('industry.clearInventory') }}</button>
                <button class="modal-btn apply-btn" @click="applyInventory">{{ t('industry.applyInventory') }}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- T2 Profit Ranking Modal -->
    <Teleport to="body">
      <div v-if="t2RankModal" class="modal-overlay" @click.self="t2RankModal = false">
        <div class="modal-content t2rank-modal">
          <button class="modal-close" @click="t2RankModal = false">&times;</button>
          <h2 class="modal-title">{{ t('industry.t2RankTitle') }} ({{ serverLabel }})</h2>
          <p class="t2rank-hint">{{ t('industry.t2RankHint') }}</p>

          <div v-if="t2Loading" class="t2rank-msg">{{ t('industry.t2RankLoading') }}</div>
          <div v-if="t2Error" class="t2rank-msg t2rank-err">{{ t2Error }}</div>
          <div v-if="t2EsiDown" class="t2rank-msg t2rank-err">{{ t('market.esiDown') }}</div>

          <div v-if="!t2Loading && t2Rows.length" class="t2rank-table-wrap">
            <table class="t2rank-table">
              <thead>
                <tr>
                  <th class="num">#</th>
                  <th>{{ t('industry.t2ColShip') }}</th>
                  <th>{{ t('industry.t2ColGroup') }}</th>
                  <th class="num">{{ t('industry.t2ColRevenue') }}</th>
                  <th class="num">{{ t('industry.t2ColCost') }}</th>
                  <th class="num">{{ t('industry.t2ColProfit') }}</th>
                  <th class="num">{{ t('industry.t2ColMargin') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(r, i) in t2Rows" :key="r.type_id">
                  <td class="num t2-rank-idx">{{ i + 1 }}</td>
                  <td class="t2-name-cell">
                    <img class="type-icon" :src="`https://images.evetech.net/types/${r.type_id}/icon?size=32`" alt="" loading="lazy">
                    <span class="copyable" @click="copyName(r.name, $event)">{{ r.name }}</span>
                    <small v-if="r.missing" class="t2-missing" :title="t('industry.t2Missing')">*</small>
                  </td>
                  <td class="t2-group-cell">{{ r.group }}</td>
                  <td class="num">{{ formatPrice(r.revenue) }}</td>
                  <td class="num">{{ formatPrice(r.cost) }}</td>
                  <td class="num" :class="r.profit >= 0 ? 't2-pos' : 't2-neg'">{{ formatPrice(r.profit) }}</td>
                  <td class="num" :class="r.margin >= 0 ? 't2-pos' : 't2-neg'">{{ r.margin.toFixed(1) }}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import { getBatchBom } from '../api/blueprints'
import ManufacturingQueue from '../components/blueprint/ManufacturingQueue.vue'
import PageHelp from '../components/layout/PageHelp.vue'
import { useSettingsStore } from '../stores/settings'
import { useI18n } from '../i18n'
import { useTabInput } from '../composables/useTabInput'
import { loadIndustryData, getIndustryData } from '../data/loader'
import { getOrderPricesForTypes } from '../services/esiClient'
import { resolveItemNames, parseMaterialText } from '../services/market'
import { getTypeName } from '../services/calculator'
import { computeT2Margins } from '../services/t2margin'

const settings = useSettingsStore()

// Groups to skip during auto-expand (buy instead of build)
const SKIP_EXPAND_GROUPS = new Set([
  1136, // Fuel Block
  1042, // Basic Commodities - Tier 1 (PI)
  1034, // Refined Commodities - Tier 2 (PI)
  1040, // Specialized Commodities - Tier 3 (PI)
  1041, // Advanced Commodities - Tier 4 (PI)
])
const { t, serverLabel } = useI18n()
const { handleTabKeydown } = useTabInput()

const levels = ref([])
const summary = ref([])
const buildItems = ref({})
const currentItems = ref([])
const calculating = ref(false)
const dataReady = ref(false)
const globalMe = ref(0)
const skippedItems = reactive(new Set())

const productSellPrice = ref(null)
const productBuyPrice = ref(null)
const productVolume = ref(null)

// ── T2 profit ranking ──
const t2RankModal = ref(false)
const t2Rows = ref([])
const t2Loading = ref(false)
const t2Error = ref('')
const t2EsiDown = ref(false)

async function openT2Rank() {
  t2RankModal.value = true
  if (t2Rows.value.length) return  // cached until server/locale change
  t2Loading.value = true
  t2Error.value = ''
  t2EsiDown.value = false
  try {
    await loadIndustryData()
    const { rows, esiUnavailable } = await computeT2Margins(settings.datasource)
    t2Rows.value = rows
    t2EsiDown.value = esiUnavailable
    if (!rows.length && !esiUnavailable) t2Error.value = t('industry.t2RankError')
  } catch (e) {
    t2Error.value = t('industry.t2RankError')
  } finally {
    t2Loading.value = false
  }
}

const totalTime = computed(() => {
  let totalBase = 0, totalBest = 0
  const indData = getIndustryData()
  if (!indData) return { min: null, max: null }
  for (const lvl of levels.value) {
    for (const mat of lvl.materials) {
      if (!mat.build || !mat.blueprint_type_id || !mat.source_activity) continue
      const baseTime = indData.activities?.[mat.blueprint_type_id]?.[mat.source_activity]
      if (!baseTime) continue
      const prodEntry = indData.productsByBp?.[mat.blueprint_type_id]?.[mat.source_activity]
      const prodQty = prodEntry?.[1] || 1
      const runs = Math.ceil(mat.quantity / prodQty)
      const jobTime = baseTime * runs
      totalBase += jobTime
      totalBest += jobTime * (mat.is_reaction ? REACT_BEST_MULT : MFG_BEST_MULT)
    }
  }
  return {
    min: totalBase > 0 ? Math.round(totalBest) : null,
    max: totalBase > 0 ? totalBase : null,
  }
}) // right-clicked items: won't be expanded
const levelStats = reactive({}) // level -> { sellTotal, buyTotal, minTime, maxTime }
const priceLoading = ref(false)
const shareLabel = ref('')

// Per-level inventory: { levelIndex: { typeId: quantity } }
const inventoryByLevel = reactive({})
const inventoryModal = ref(null)
const inventoryText = ref('')
const tempInventory = reactive({}) // parsed from textarea in real-time
const copyLabel = ref('')

onMounted(async () => {
  await loadIndustryData()
  dataReady.value = true
  shareLabel.value = t('industry.share')
  copyLabel.value = t('industry.copyNeed')
})

// Material names (`mat.type_name`, `item.product_name`) are baked at BOM-compute
// time by getTypeName(), which reads the current locale. When the user toggles
// language afterwards the cached strings stay in the previous locale — so
// re-resolve everything and recompute the BOM whenever locale changes.
watch(() => settings.locale, () => {
  shareLabel.value = t('industry.share')
  copyLabel.value = t('industry.copyNeed')
  t2Rows.value = []  // ship names are baked via locName — recompute on next open
  if (!dataReady.value) return
  for (const item of currentItems.value) {
    item.product_name = getTypeName(item.product_type_id)
  }
  if (currentItems.value.length) fetchBom()
})

function levelLabel(n) {
  if (n === 'summary') return t('industry.rawSummary')
  const names = t('industry.levels')
  if (Array.isArray(names) && n < names.length) return names[n]
  return t('industry.levelN', { n: n + 1 })
}

async function fetchBom() {
  if (!currentItems.value.length) return
  calculating.value = true
  try {
    const { data } = await getBatchBom(currentItems.value, buildItems.value)
    levels.value = data.levels
    summary.value = data.summary || []
    computeTimeStats()
    fetchLevelPrices()
  } finally {
    calculating.value = false
  }
}

// Theoretical best time multipliers (all skills V + best structure + T2 rig lowsec)
// Manufacturing: TE20(0.80) × Industry V(0.80) × Adv Industry V(0.85) × Sotiyo(0.70) × T2 rig(0.958)
const MFG_BEST_MULT = 0.80 * 0.80 * 0.85 * 0.70 * 0.958  // ≈ 0.365
// Reaction: Reactions V(0.75) × Adv Industry V(0.85) × Tatara(0.75) × T2 rig(0.958)
const REACT_BEST_MULT = 0.75 * 0.85 * 0.75 * 0.958  // ≈ 0.458

function computeTimeStats() {
  const indData = getIndustryData()
  if (!indData) return

  // Compute production time per level, then shift to next level for display
  const timeByLevel = {} // level -> { totalBase, totalBest }
  for (const lvl of levels.value) {
    let totalBase = 0
    let totalBest = 0
    for (const mat of lvl.materials) {
      if (!mat.build || !mat.blueprint_type_id || !mat.source_activity) continue
      const baseTime = indData.activities?.[mat.blueprint_type_id]?.[mat.source_activity]
      if (!baseTime) continue
      const prodEntry = indData.productsByBp?.[mat.blueprint_type_id]?.[mat.source_activity]
      const prodQty = prodEntry?.[1] || 1
      const runs = Math.ceil(mat.quantity / prodQty)
      const jobTime = baseTime * runs
      totalBase += jobTime
      totalBest += jobTime * (mat.is_reaction ? REACT_BEST_MULT : MFG_BEST_MULT)
    }
    if (totalBase > 0) timeByLevel[lvl.level] = { totalBase, totalBest }
  }

  // Display time at level N+1 (child materials level shows parent's production time)
  for (const lvl of levels.value) {
    const existing = levelStats[lvl.level]
    const parentTime = timeByLevel[lvl.level - 1]
    levelStats[lvl.level] = {
      sellTotal: existing?.sellTotal ?? null,
      buyTotal: existing?.buyTotal ?? null,
      volume: existing?.volume ?? null,
      minTime: parentTime ? Math.round(parentTime.totalBest) : null,
      maxTime: parentTime ? parentTime.totalBase : null,
    }
  }
}

async function fetchLevelPrices() {
  priceLoading.value = true
  try {
    const indData = getIndustryData()
    const volOf = tid => indData?.types?.[tid]?.v || 0

    // Collect all type IDs
    const allTypeIds = new Set()
    for (const item of currentItems.value) allTypeIds.add(item.product_type_id)
    for (const lvl of levels.value) {
      for (const mat of lvl.materials) allTypeIds.add(mat.type_id)
    }
    for (const mat of summary.value) allTypeIds.add(mat.type_id)

    // Fetch Jita order prices for all types at once
    const { prices } = await getOrderPricesForTypes([...allTypeIds], settings.datasource)

    // Product prices
    let prodSell = 0, prodBuy = 0, prodVolume = 0
    for (const item of currentItems.value) {
      const p = prices[item.product_type_id]
      const qty = item.runs * (item.product_quantity || 1)
      if (p?.sell_price) prodSell += p.sell_price * qty
      if (p?.buy_price) prodBuy += p.buy_price * qty
      prodVolume += volOf(item.product_type_id) * qty
    }
    productSellPrice.value = prodSell || null
    productBuyPrice.value = prodBuy || null
    productVolume.value = prodVolume || null

    // Summary prices (skip owned materials — they don't participate in valuation)
    let summSell = 0, summBuy = 0, summVolume = 0
    for (const mat of summary.value) {
      if (isOwned('summary', mat.type_id, mat.total_quantity)) continue
      const p = prices[mat.type_id]
      if (p?.sell_price) summSell += p.sell_price * mat.total_quantity
      if (p?.buy_price) summBuy += p.buy_price * mat.total_quantity
      summVolume += volOf(mat.type_id) * mat.total_quantity
    }
    levelStats['summary'] = { sellTotal: summSell || null, buyTotal: summBuy || null, volume: summVolume || null, minTime: null, maxTime: null }

    // Per-level prices (skip owned materials)
    for (const lvl of levels.value) {
      let sellTotal = 0, buyTotal = 0, volume = 0
      for (const mat of lvl.materials) {
        if (isOwned(lvl.level, mat.type_id, mat.quantity)) continue
        const p = prices[mat.type_id]
        if (p?.sell_price) sellTotal += p.sell_price * mat.quantity
        if (p?.buy_price) buyTotal += p.buy_price * mat.quantity
        volume += volOf(mat.type_id) * mat.quantity
      }
      if (levelStats[lvl.level]) {
        levelStats[lvl.level].sellTotal = sellTotal
        levelStats[lvl.level].buyTotal = buyTotal
        levelStats[lvl.level].volume = volume
      } else {
        levelStats[lvl.level] = { sellTotal, buyTotal, volume, minTime: null, maxTime: null }
      }
    }
  } catch { /* prices optional */ }
  finally { priceLoading.value = false }
}

function formatPrice(n) {
  if (n == null) return '—'
  const sign = n < 0 ? '-' : ''
  const a = Math.abs(n)
  if (a >= 1e9) return sign + (a / 1e9).toFixed(2) + 'B'
  if (a >= 1e6) return sign + (a / 1e6).toFixed(2) + 'M'
  if (a >= 1e3) return sign + (a / 1e3).toFixed(1) + 'K'
  return sign + a.toFixed(0)
}

function formatVolume(v) {
  if (v == null) return '—'
  if (v >= 1e9) return (v / 1e9).toFixed(2) + 'B m³'
  if (v >= 1e6) return (v / 1e6).toFixed(2) + 'M m³'
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K m³'
  return v.toFixed(1) + ' m³'
}

function formatTime(seconds) {
  if (!seconds) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 24) {
    const d = Math.floor(h / 24)
    const rh = h % 24
    return `${d}d ${rh}h`
  }
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function sharePlan() {
  const lines = []
  lines.push(`=== ${t('industry.finalProduct')} ===`)
  for (const item of currentItems.value) {
    lines.push(`${item.product_name}\t${item.runs}\tME${item.me_level}`)
  }

  navigator.clipboard.writeText(lines.join('\n'))
  shareLabel.value = t('industry.copied')
  setTimeout(() => { shareLabel.value = t('industry.share') }, 2000)
}

async function onCalculate(items) {
  currentItems.value = items
  buildItems.value = {}
  skippedItems.clear()
  for (const key of Object.keys(inventoryByLevel)) delete inventoryByLevel[key]
  for (const key of Object.keys(levelStats)) delete levelStats[key]
  productSellPrice.value = null
  productBuyPrice.value = null
  productVolume.value = null

  const finalProductIds = new Set(items.map(i => i.product_type_id))
  const indData = getIndustryData()
  let prevCount = 0
  for (let i = 0; i < 10; i++) {
    await fetchBom()
    for (const lvl of levels.value) {
      for (const mat of lvl.materials) {
        if (mat.is_manufacturable && !buildItems.value[String(mat.type_id)]?.build && !skippedItems.has(mat.type_id)) {
          const group = indData?.types[mat.type_id]?.g
          if (SKIP_EXPAND_GROUPS.has(group) && !finalProductIds.has(mat.type_id)) continue
          buildItems.value[String(mat.type_id)] = { me_level: globalMe.value, build: true }
        }
      }
    }
    if (Object.keys(buildItems.value).length === prevCount) break
    prevCount = Object.keys(buildItems.value).length
  }
}

function toggleSkip(typeId) {
  if (skippedItems.has(typeId)) {
    skippedItems.delete(typeId)
    // Re-add to buildItems if manufacturable
    const indData = getIndustryData()
    const source = indData?.products?.[1]?.[typeId] || indData?.products?.[11]?.[typeId]
    if (source) {
      buildItems.value[String(typeId)] = { me_level: globalMe.value, build: true }
    }
  } else {
    skippedItems.add(typeId)
    // Remove from buildItems to stop expansion
    delete buildItems.value[String(typeId)]
  }
  fetchBom()
}

function onSummaryCopy(event) {
  const matMap = {}
  for (const mat of summary.value) matMap[String(mat.type_id)] = mat
  const lines = collectSelectedRows(event.currentTarget, tid => {
    const mat = matMap[tid]
    return mat ? `${mat.type_name}\t${mat.total_quantity}` : null
  })
  if (lines.length) {
    event.preventDefault()
    event.clipboardData.setData('text/plain', lines.join('\n'))
  }
}

function isOwned(level, typeId, required) {
  return (inventoryByLevel[level]?.[typeId] || 0) >= required
}

function toggleOwned(level, typeId, quantity) {
  if (!inventoryByLevel[level]) inventoryByLevel[level] = {}
  const wasOwned = inventoryByLevel[level][typeId] >= quantity
  let bomChanged = false
  if (wasOwned) {
    delete inventoryByLevel[level][typeId]
    if (!Object.keys(inventoryByLevel[level]).length) delete inventoryByLevel[level]
    // Restore expansion so sub-materials reappear downstream.
    const indData = getIndustryData()
    const source = indData?.products?.[1]?.[typeId] || indData?.products?.[11]?.[typeId]
    if (source && !buildItems.value[String(typeId)]?.build) {
      buildItems.value[String(typeId)] = { me_level: globalMe.value, build: true }
      bomChanged = true
    }
  } else {
    inventoryByLevel[level][typeId] = quantity
    // Stop expansion so deeper levels don't list materials we don't need.
    if (buildItems.value[String(typeId)]?.build) {
      delete buildItems.value[String(typeId)]
      bomChanged = true
    }
  }
  // A BOM change re-runs fetchLevelPrices via fetchBom; otherwise recompute
  // stats directly so owned materials drop out of the sell/buy/volume totals.
  if (bomChanged) fetchBom()
  else fetchLevelPrices()
}

function hasManufacturable(lvl) {
  return lvl.materials.some(m => m.build && m.is_manufacturable)
}

function hasInventory(level) {
  return !!inventoryByLevel[level]
}

function colSpan(lvl) {
  return (lvl.level === 0 && hasManufacturable(lvl)) ? 3 : 2
}

function onTableCopy(event, lvl) {
  const matMap = {}
  for (const mat of lvl.materials) {
    matMap[String(mat.type_id)] = mat
  }
  const lines = collectSelectedRows(event.currentTarget, tid => {
    const mat = matMap[tid]
    return mat ? `${mat.type_name}\t${mat.quantity}` : null
  })
  if (lines.length) {
    event.preventDefault()
    event.clipboardData.setData('text/plain', lines.join('\n'))
  }
}

// Walk rows in the table; for each row that intersects the current selection,
// resolve it via `formatRow(typeId)`. Uses range-based intersection so a
// selection that starts mid-cell (or whose first cell got chopped) still maps
// cleanly back to whole-row data — the prior text-parsing approach lost the
// first row in those cases, fell through to the browser's default, and
// produced "name\nqty" instead of "name\tqty".
function collectSelectedRows(table, formatRow) {
  const sel = window.getSelection()
  if (!sel || sel.isCollapsed || !sel.rangeCount || !table) return []
  const ranges = []
  for (let i = 0; i < sel.rangeCount; i++) ranges.push(sel.getRangeAt(i))
  const seen = new Set()
  const lines = []
  for (const span of table.querySelectorAll('span.copyable[data-tid]')) {
    const row = span.closest('tr')
    if (!row) continue
    if (!ranges.some(r => r.intersectsNode(row))) continue
    const tid = span.getAttribute('data-tid')
    if (seen.has(tid)) continue
    seen.add(tid)
    const line = formatRow(tid)
    if (line) lines.push(line)
  }
  return lines
}

function formatInventory(level, typeId) {
  const qty = inventoryByLevel[level]?.[typeId]
  return qty ? formatNumber(qty) : ''
}

function formatNeed(level, typeId, required) {
  const have = inventoryByLevel[level]?.[typeId] || 0
  const need = Math.max(0, required - have)
  return formatNumber(need)
}

function needClass(level, typeId, required) {
  const have = inventoryByLevel[level]?.[typeId] || 0
  return have >= required ? 'need-zero' : 'need-val'
}

// Materials for the currently open modal level
const modalMaterials = computed(() => {
  const level = inventoryModal.value
  if (level === null) return []

  let mats
  if (level === 'summary') {
    mats = summary.value.map(m => ({ type_id: m.type_id, type_name: m.type_name, quantity: m.total_quantity }))
  } else {
    const lvl = levels.value.find(l => l.level === level)
    if (!lvl) return []
    mats = lvl.materials
  }

  return mats.map(mat => {
    const have = tempInventory[mat.type_id] || 0
    return {
      type_id: mat.type_id,
      type_name: mat.type_name,
      required: mat.quantity,
      have,
      need: Math.max(0, mat.quantity - have),
    }
  })
})

function parseInventoryText() {
  // Clear temp
  for (const k of Object.keys(tempInventory)) delete tempInventory[k]
  const text = inventoryText.value
  if (!text.trim()) return
  const parsed = parseMaterialText(text)
  if (!parsed.length) return
  const resolved = resolveItemNames(parsed.map(p => p.name))
  for (let i = 0; i < resolved.length; i++) {
    if (resolved[i].matched) {
      const tid = resolved[i].type_id
      tempInventory[tid] = (tempInventory[tid] || 0) + (parsed[i].quantity || 1)
    }
  }
}

function onInventoryInput() {
  parseInventoryText()
}

function openInventory(level) {
  inventoryModal.value = level
  inventoryText.value = ''
  copyLabel.value = t('industry.copyNeed')
  // Clear temp
  for (const k of Object.keys(tempInventory)) delete tempInventory[k]
  // If existing inventory, pre-populate textarea
  if (inventoryByLevel[level]) {
    for (const [tid, qty] of Object.entries(inventoryByLevel[level])) {
      tempInventory[tid] = qty
    }
  }
}

function applyInventory() {
  const level = inventoryModal.value
  if (level === null) return
  if (Object.keys(tempInventory).length) {
    inventoryByLevel[level] = { ...tempInventory }
  }
  inventoryModal.value = null
}

function clearInventory() {
  const level = inventoryModal.value
  if (level !== null) {
    delete inventoryByLevel[level]
  }
  for (const k of Object.keys(tempInventory)) delete tempInventory[k]
  inventoryText.value = ''
}

function copyNeed() {
  const lines = modalMaterials.value
    .filter(m => m.need > 0)
    .map(m => `${m.type_name}\t${m.need}`)
  if (lines.length) {
    navigator.clipboard.writeText(lines.join('\n'))
    copyLabel.value = t('industry.copied')
    setTimeout(() => { copyLabel.value = t('industry.copyNeed') }, 2000)
  }
}

function getBuildMe(typeId) {
  return buildItems.value[String(typeId)]?.me_level ?? 0
}

function onMeChange(typeId, event) {
  const val = parseInt(event.target.value)
  if (val >= 0 && val <= 10) {
    const key = String(typeId)
    if (buildItems.value[key]) {
      buildItems.value[key].me_level = val
    }
    fetchBom()
  }
}

function applyGlobalMe() {
  for (const key of Object.keys(buildItems.value)) {
    const item = buildItems.value[key]
    if (item.build) {
      item.me_level = globalMe.value
    }
  }
  fetchBom()
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

function formatNumber(n) {
  return n != null ? n.toLocaleString() : '-'
}
</script>

<style scoped>
.industry {
  padding-top: 20px;
  position: relative;
}

.title {
  color: #c8aa6e;
  font-size: 1.8em;
  margin-bottom: 4px;
  text-align: center;
}

.t2rank-btn {
  position: absolute;
  top: 20px;
  right: 0;
  background: #1a1a1a;
  border: 1px solid #c8aa6e;
  border-radius: 6px;
  color: #c8aa6e;
  padding: 7px 16px;
  font-size: 0.85em;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
  z-index: 5;
}

.t2rank-btn:hover {
  background: #c8aa6e;
  color: #0d0d0d;
}

.subtitle {
  color: #8a8a8a;
  margin-bottom: 24px;
  text-align: center;
}

.loading {
  text-align: center;
  padding: 30px;
  color: #8a8a8a;
}

/* ---- global ME bar ---- */
.global-me-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding: 8px 12px;
  background: #1a1a1a;
  border-radius: 6px;
  border: 1px solid #2a2a2a;
}

.global-me-label {
  color: #8a8a8a;
  font-size: 0.85em;
  white-space: nowrap;
}

.global-me-input {
  width: 55px;
  padding: 4px 6px;
  background: #0d0d0d;
  border: 1px solid #2a2a2a;
  border-radius: 4px;
  color: #d0d0d0;
  text-align: center;
  font-size: 0.9em;
  outline: none;
}

.global-me-input:focus {
  border-color: #c8aa6e;
}

.global-me-btn {
  padding: 4px 14px;
  background: #2a2a2a;
  color: #c8aa6e;
  border: 1px solid #3a3a3a;
  border-radius: 4px;
  font-size: 0.85em;
  cursor: pointer;
  transition: background 0.2s;
}

.global-me-btn:hover {
  background: #3a3a3a;
}

.bar-spacer {
  flex: 1;
}

/* ---- Tier columns grid ---- */
.tier-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.tier-col {
  flex: 1 1 340px;
  min-width: 300px;
  max-width: 520px;
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Final-product column carries only the product name + run count, so cap it
   narrow and let the freed space flow to the material columns. */
.tier-col-product {
  flex: 0 1 200px;
  min-width: 160px;
  max-width: 240px;
}

/* Tier-0 column adds a per-row ME input on the right, so reserve extra width
   for the material name to avoid clipping (e.g. 旗舰级核心温度调节器). */
.tier-col-me {
  flex: 1 1 400px;
  min-width: 360px;
  max-width: 580px;
}

.tier-head {
  padding: 8px 10px 6px;
  border-bottom: 1px solid #2a2a2a;
  background: #141414;
}

.tier-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.tier-name {
  font-weight: 600;
  font-size: 0.9em;
  color: #c8aa6e;
  white-space: nowrap;
}

.tier-inv-btn {
  padding: 2px 8px;
  font-size: 0.7em;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 3px;
  color: #8a8a8a;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}

.tier-inv-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #c8aa6e;
}

.tier-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 8px;
  margin-top: 4px;
}

.stat-item {
  font-size: 0.7em;
  font-weight: 400;
  opacity: 0.85;
  white-space: nowrap;
}

.stat-item.sell { color: #ef5350; }
.stat-item.buy { color: #4caf50; }
.stat-item.volume { color: #c8aa6e; }
.stat-item.time { color: #8a8a8a; }
.stat-item.loading-stat { color: #555; }

.tier-table {
  width: 100%;
  border-collapse: collapse;
  background: transparent;
  table-layout: fixed;
}

.tier-table tbody td {
  padding: 3px 6px;
  font-size: 0.82em;
  border-bottom: 1px solid rgba(42, 42, 42, 0.4);
  vertical-align: middle;
}

/* Explicit column widths so a leading group-header row (colspan=N) doesn't
   make `table-layout: fixed` divide the table into equal parts. The qty
   column is sized for ~12-digit formatted quantities (e.g. 999,999,999,999);
   the ME column fits the 38px input + side padding. */
.tier-table .col-qty {
  width: 96px;
}

.tier-table .col-me {
  width: 52px;
}

.tier-table .qty-cell {
  text-align: right;
  color: #aaa;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.tier-table .name-cell {
  display: flex;
  align-items: center;
  gap: 4px;
  overflow: hidden;
}

.tier-table .me-cell {
  text-align: right;
}

.product-name-text {
  color: #c8aa6e;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.group-row td {
  border-bottom: none !important;
  padding: 6px 6px 1px !important;
}

.group-label {
  font-size: 0.72em;
  color: #555555;
  letter-spacing: 0.3px;
}

.super-group-row td {
  border-bottom: none !important;
  padding: 8px 6px 2px !important;
}

.super-group-label {
  font-size: 0.8em;
  color: #c8aa6e;
  font-weight: 600;
  letter-spacing: 0.6px;
  border-top: 1px solid rgba(200, 170, 110, 0.15);
  padding-top: 6px !important;
}

.name-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.type-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  border-radius: 2px;
}

/* Keep material names on a single row; the title attribute exposes the full
   text on hover when a column is too narrow for the longest names. */
.tier-table .copyable {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

.me-input {
  width: 38px;
  padding: 2px 4px;
  background: #0d0d0d;
  border: 1px solid #2a2a2a;
  border-radius: 4px;
  color: #d0d0d0;
  text-align: center;
  font-size: 0.85em;
  outline: none;
  user-select: none;
}

.me-input:focus {
  border-color: #c8aa6e;
}

.me-na {
  color: #555;
  font-size: 0.85em;
  user-select: none;
}

.num {
  text-align: right;
}

.have-val {
  color: #4caf50;
}

.need-val {
  color: #ef5350;
}

.need-zero {
  color: #4caf50;
}

.name-reaction {
  color: #ff9800;
}

.name-reaction:hover {
  color: #ffb74d;
}

.name-mfg {
  color: #4caf50;
}

.name-mfg:hover {
  color: #81c784;
}

.owned-row {
  opacity: 0.45;
}

.owned-row .num {
  color: #4caf50;
}

.skipped-row {
  opacity: 0.4;
}

.name-skipped {
  color: #555 !important;
  text-decoration: line-through;
}

/* ---- Inventory Modal ---- */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 12px;
  padding: 24px 28px;
  position: relative;
}

.inv-modal {
  max-width: 900px;
  width: 95%;
}

.t2rank-modal {
  max-width: 860px;
  width: 95%;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
}

.t2rank-hint {
  color: #777;
  font-size: 0.78em;
  margin-bottom: 10px;
  line-height: 1.5;
}

.t2rank-msg {
  text-align: center;
  color: #8a8a8a;
  padding: 24px;
}

.t2rank-err {
  color: #ff9800;
}

.t2rank-table-wrap {
  overflow-y: auto;
  overflow-x: auto;
}

.t2rank-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85em;
}

.t2rank-table th {
  position: sticky;
  top: 0;
  background: #1f1c17;
  color: #c8aa6e;
  padding: 8px 10px;
  font-weight: 500;
  text-align: left;
  border-bottom: 1px solid #2a2a2a;
  white-space: nowrap;
}

.t2rank-table td {
  padding: 6px 10px;
  border-bottom: 1px solid rgba(42, 42, 42, 0.5);
}

.t2rank-table .num {
  text-align: right;
  white-space: nowrap;
}

.t2-rank-idx {
  color: #777;
}

.t2-name-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.t2-group-cell {
  color: #8a8a8a;
  white-space: nowrap;
}

.t2-missing {
  color: #ff9800;
  cursor: help;
}

.t2-pos { color: #4caf50; }
.t2-neg { color: #ef5350; }

.modal-close {
  position: absolute;
  top: 10px;
  right: 14px;
  background: none;
  border: none;
  color: #555;
  font-size: 1.5em;
  cursor: pointer;
  transition: color 0.2s;
}

.modal-close:hover {
  color: #c8aa6e;
}

.modal-title {
  color: #c8aa6e;
  font-size: 1.1em;
  margin-bottom: 12px;
}

.inv-body {
  display: flex;
  gap: 20px;
}

.inv-left {
  flex: 0 0 280px;
  display: flex;
  flex-direction: column;
}

.inv-hint {
  color: #555;
  font-size: 0.8em;
  margin-bottom: 6px;
}

.inventory-textarea {
  width: 100%;
  flex: 1;
  padding: 10px;
  background: #0d0d0d;
  border: 1px solid #2a2a2a;
  border-radius: 6px;
  color: #d0d0d0;
  font-size: 0.85em;
  resize: none;
  outline: none;
  box-sizing: border-box;
}

.inventory-textarea:focus {
  border-color: #c8aa6e;
}

.inv-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.inv-table-wrap {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid #2a2a2a;
  border-radius: 6px;
}

.inv-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85em;
}

.inv-table thead {
  position: sticky;
  top: 0;
  background: #1a1a1a;
  z-index: 1;
}

.inv-table th {
  color: #8a8a8a;
  font-weight: 600;
  font-size: 0.85em;
  padding: 6px 10px;
  border-bottom: 1px solid #2a2a2a;
  text-align: left;
}

.inv-table th.num {
  text-align: right;
}

.inv-table td {
  padding: 5px 10px;
  border-bottom: 1px solid rgba(42, 42, 42, 0.4);
}

.inv-name {
  color: #d0d0d0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
}

.inv-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}

.modal-btn {
  padding: 6px 16px;
  border-radius: 4px;
  font-size: 0.85em;
  cursor: pointer;
  transition: background 0.2s;
}

.copy-btn {
  background: none;
  border: 1px solid #c8aa6e;
  color: #c8aa6e;
}

.copy-btn:hover {
  background: rgba(200, 170, 110, 0.1);
}

.clear-btn {
  background: none;
  border: 1px solid #2a2a2a;
  color: #8a8a8a;
}

.clear-btn:hover {
  background: #2a2a2a;
}

.apply-btn {
  background: #c8aa6e;
  border: none;
  color: #0d0d0d;
  font-weight: 600;
}

.apply-btn:hover {
  background: #e0c882;
}
</style>
