<template>
  <div class="industry">
    <h1 class="title">{{ t('industry.title') }} ({{ serverLabel }})</h1>

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

      <!-- Tab Bar -->
      <div class="tab-bar">
        <button class="tab-btn" :class="{ 'tab-active': activeTab === 'product' }" @click="activeTab = 'product'">
          <div class="tab-label">{{ t('industry.finalProduct') }}</div>
          <div v-if="productSellPrice != null || totalTime.max" class="tab-meta">
            <div v-if="productSellPrice != null" class="tab-stats">
              <span class="stat-item sell">{{ t('industry.sell') }} {{ formatPrice(productSellPrice) }}</span>
              <span class="stat-item buy">{{ t('industry.buy') }} {{ formatPrice(productBuyPrice) }}</span>
            </div>
            <div v-if="totalTime.max" class="tab-stats">
              <span class="stat-item time">{{ formatTime(totalTime.min) }} ~ {{ formatTime(totalTime.max) }}</span>
            </div>
          </div>
        </button>
        <button v-for="lvl in levels" :key="lvl.level" class="tab-btn" :class="{ 'tab-active': activeTab === lvl.level }" @click="activeTab = lvl.level">
          <div class="tab-label">{{ levelLabel(lvl.level) }}</div>
          <div v-if="levelStats[lvl.level]" class="tab-meta">
            <div v-if="levelStats[lvl.level].sellTotal != null" class="tab-stats">
              <span class="stat-item sell">{{ t('industry.sell') }} {{ formatPrice(levelStats[lvl.level].sellTotal) }}</span>
              <span class="stat-item buy">{{ t('industry.buy') }} {{ formatPrice(levelStats[lvl.level].buyTotal) }}</span>
            </div>
            <div v-if="levelStats[lvl.level].minTime" class="tab-stats">
              <span class="stat-item time">{{ formatTime(levelStats[lvl.level].minTime) }} ~ {{ formatTime(levelStats[lvl.level].maxTime) }}</span>
            </div>
          </div>
          <div v-else-if="priceLoading" class="tab-stats"><span class="stat-item loading-stat">...</span></div>
        </button>
        <button v-if="summary.length" class="tab-btn" :class="{ 'tab-active': activeTab === 'summary' }" @click="activeTab = 'summary'">
          <div class="tab-label">{{ t('industry.rawSummary') }}</div>
          <div v-if="levelStats['summary']?.sellTotal" class="tab-meta">
            <div class="tab-stats">
              <span class="stat-item sell">{{ t('industry.sell') }} {{ formatPrice(levelStats['summary'].sellTotal) }}</span>
              <span class="stat-item buy">{{ t('industry.buy') }} {{ formatPrice(levelStats['summary'].buyTotal) }}</span>
            </div>
          </div>
        </button>
      </div>

      <!-- Tab Content -->
      <div class="tab-content">
        <!-- Product Tab -->
        <div v-if="activeTab === 'product'">
          <table class="level-table full-width">
            <thead>
              <tr>
                <th class="sub-header">{{ t('queue.product') }}</th>
                <th class="sub-header num">{{ t('industry.quantity') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in currentItems" :key="item.blueprint_type_id">
                <td class="name-cell">
                  <img class="type-icon" :src="`https://images.evetech.net/types/${item.product_type_id}/icon?size=32`" alt="" loading="lazy">
                  <span class="product-name-text">{{ item.product_name }}</span>
                </td>
                <td class="num">{{ formatNumber(item.runs) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Level Tabs -->
        <div v-for="lvl in levels" :key="lvl.level" v-show="activeTab === lvl.level">
          <div class="tab-toolbar">
            <button class="inventory-btn" @click="openInventory(lvl.level)">{{ t('industry.inventoryBtn') }}</button>
          </div>
          <table class="level-table full-width" @copy="onTableCopy($event, lvl)">
            <thead>
              <tr>
                <th class="sub-header">{{ t('industry.material') }}</th>
                <th class="sub-header num">{{ t('industry.quantity') }}</th>
                <th class="sub-header num" v-if="lvl.level === 0 && hasManufacturable(lvl)">{{ t('queue.me') }}</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="(mat, idx) in lvl.materials" :key="mat.type_id">
                <tr v-if="idx === 0 || mat.group_name !== lvl.materials[idx - 1].group_name" class="group-row">
                  <td :colspan="colSpan(lvl)" class="group-label">{{ mat.group_name }}</td>
                </tr>
                <tr :class="{ 'skipped-row': skippedItems.has(mat.type_id) }">
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
                      @click="copyName(mat.type_name, $event)"
                      @contextmenu.prevent="toggleSkip(mat.type_id)"
                    >{{ mat.type_name }}</span>
                  </td>
                  <td class="num">{{ formatNumber(mat.quantity) }}</td>
                  <td class="num" v-if="lvl.level === 0 && hasManufacturable(lvl)">
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
        </div>

        <!-- Summary Tab -->
        <div v-if="activeTab === 'summary' && summary.length">
          <div class="tab-toolbar">
            <button class="inventory-btn" @click="openInventory('summary')">{{ t('industry.inventoryBtn') }}</button>
          </div>
          <table class="level-table full-width" @copy="onSummaryCopy($event)">
            <thead>
              <tr>
                <th class="sub-header">{{ t('industry.material') }}</th>
                <th class="sub-header num">{{ t('industry.quantity') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="mat in summary" :key="mat.type_id">
                <td class="name-cell">
                  <img class="type-icon" :src="`https://images.evetech.net/types/${mat.type_id}/icon?size=32`" alt="" loading="lazy">
                  <span class="copyable" :data-tid="mat.type_id" @click="copyName(mat.type_name, $event)">{{ mat.type_name }}</span>
                </td>
                <td class="num">{{ formatNumber(mat.total_quantity) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
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
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { getBatchBom } from '../api/blueprints'
import ManufacturingQueue from '../components/blueprint/ManufacturingQueue.vue'
import { useSettingsStore } from '../stores/settings'
import { useI18n } from '../i18n'
import { loadIndustryData, getIndustryData } from '../data/loader'
import { getOrderPricesForTypes } from '../services/esiClient'
import { resolveItemNames, parseMaterialText } from '../services/market'

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

const levels = ref([])
const summary = ref([])
const activeTab = ref(0)
const buildItems = ref({})
const currentItems = ref([])
const calculating = ref(false)
const dataReady = ref(false)
const globalMe = ref(0)
const skippedItems = reactive(new Set())

const productSellPrice = ref(null)
const productBuyPrice = ref(null)

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
      minTime: parentTime ? Math.round(parentTime.totalBest) : null,
      maxTime: parentTime ? parentTime.totalBase : null,
    }
  }
}

async function fetchLevelPrices() {
  priceLoading.value = true
  try {
    // Collect all type IDs
    const allTypeIds = new Set()
    for (const item of currentItems.value) allTypeIds.add(item.product_type_id)
    for (const lvl of levels.value) {
      for (const mat of lvl.materials) allTypeIds.add(mat.type_id)
    }
    for (const mat of summary.value) allTypeIds.add(mat.type_id)

    // Fetch Jita order prices for all types at once
    const prices = await getOrderPricesForTypes([...allTypeIds], settings.datasource)

    // Product prices
    let prodSell = 0, prodBuy = 0
    for (const item of currentItems.value) {
      const p = prices[item.product_type_id]
      const qty = item.runs * (item.product_quantity || 1)
      if (p?.sell_price) prodSell += p.sell_price * qty
      if (p?.buy_price) prodBuy += p.buy_price * qty
    }
    productSellPrice.value = prodSell || null
    productBuyPrice.value = prodBuy || null

    // Summary prices
    let summSell = 0, summBuy = 0
    for (const mat of summary.value) {
      const p = prices[mat.type_id]
      if (p?.sell_price) summSell += p.sell_price * mat.total_quantity
      if (p?.buy_price) summBuy += p.buy_price * mat.total_quantity
    }
    levelStats['summary'] = { sellTotal: summSell || null, buyTotal: summBuy || null, minTime: null, maxTime: null }

    // Per-level prices
    for (const lvl of levels.value) {
      let sellTotal = 0, buyTotal = 0
      for (const mat of lvl.materials) {
        const p = prices[mat.type_id]
        if (p?.sell_price) sellTotal += p.sell_price * mat.quantity
        if (p?.buy_price) buyTotal += p.buy_price * mat.quantity
      }
      if (levelStats[lvl.level]) {
        levelStats[lvl.level].sellTotal = sellTotal
        levelStats[lvl.level].buyTotal = buyTotal
      } else {
        levelStats[lvl.level] = { sellTotal, buyTotal, minTime: null, maxTime: null }
      }
    }
  } catch { /* prices optional */ }
  finally { priceLoading.value = false }
}

function formatPrice(n) {
  if (n == null) return '—'
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return n.toFixed(0)
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
  activeTab.value = 0

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
  const sel = window.getSelection()
  if (!sel || sel.isCollapsed) return
  const text = sel.toString()
  const matMap = {}
  for (const mat of summary.value) matMap[mat.type_name] = mat.total_quantity
  const lines = []
  for (const line of text.split('\n')) {
    const name = line.trim().replace(/[\d,.\s]+$/, '').trim()
    if (name && matMap[name] != null) lines.push(`${name}\t${matMap[name]}`)
  }
  if (lines.length) {
    event.preventDefault()
    event.clipboardData.setData('text/plain', lines.join('\n'))
  }
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
  // Build a lookup: name -> raw quantity (no commas)
  const matMap = {}
  for (const mat of lvl.materials) {
    matMap[mat.type_name] = mat.quantity
  }
  // Parse the default selection text and reformat
  const sel = window.getSelection()
  if (!sel || sel.isCollapsed) return
  const text = sel.toString()
  const lines = []
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    // Try to match "materialName  number" (with possible commas in number)
    const name = trimmed.replace(/[\d,.\s]+$/, '').trim()
    if (name && matMap[name] != null) {
      lines.push(`${name}\t${matMap[name]}`)
    }
  }
  if (lines.length) {
    event.preventDefault()
    event.clipboardData.setData('text/plain', lines.join('\n'))
  }
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
}

.title {
  color: #c8aa6e;
  font-size: 1.8em;
  margin-bottom: 4px;
  text-align: center;
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

/* ---- Tab Bar ---- */
.tab-bar {
  display: flex;
  gap: 0;
  overflow-x: auto;
  border-bottom: 2px solid #2a2a2a;
  margin-bottom: 0;
  padding-bottom: 0;
}

.tab-btn {
  flex-shrink: 0;
  padding: 8px 16px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  color: #8a8a8a;
  font-size: 0.85em;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s;
  text-align: center;
}

.tab-btn:hover {
  color: #c8aa6e;
}

.tab-active {
  color: #c8aa6e;
  border-bottom-color: #c8aa6e;
}

.tab-label {
  font-weight: 600;
  white-space: nowrap;
}

.tab-meta {
  margin-top: 2px;
}

.tab-stats {
  display: flex;
  gap: 6px;
  justify-content: center;
}

.stat-item {
  font-size: 0.7em;
  font-weight: 400;
  opacity: 0.8;
}

.stat-item.sell { color: #ef5350; }
.stat-item.buy { color: #4caf50; }
.stat-item.time { color: #8a8a8a; }
.stat-item.loading-stat { color: #555; }

/* ---- Tab Content ---- */
.tab-content {
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-top: none;
  border-radius: 0 0 8px 8px;
  padding: 0;
}

.tab-toolbar {
  padding: 8px 12px;
  display: flex;
  gap: 8px;
}

.inventory-btn {
  padding: 3px 10px;
  font-size: 0.8em;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 3px;
  color: #8a8a8a;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}

.inventory-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #c8aa6e;
}

.product-name-text {
  color: #c8aa6e;
  font-weight: 500;
}

.level-table {
  background: transparent;
  border-collapse: collapse;
  width: 100%;
}

.full-width {
  width: 100%;
}

.level-table th,
.level-table td {
  padding: 6px 12px;
}

.sub-header {
  font-size: 0.8em;
  color: #555555;
  font-weight: 400;
  border-bottom: 1px solid #2a2a2a;
}

.level-table tbody td {
  border-bottom: 1px solid rgba(42, 42, 42, 0.5);
}

.group-row td {
  border-bottom: none;
}

.group-label {
  font-size: 0.75em;
  color: #555555;
  padding: 6px 10px 2px;
  letter-spacing: 0.5px;
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

.me-input {
  width: 45px;
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
