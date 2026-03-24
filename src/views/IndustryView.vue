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
      </div>

      <div class="levels-row">
        <!-- Products column -->
        <div class="level-col product-col">
          <table class="level-table">
            <thead>
              <tr>
                <th class="col-header level-product" colspan="2">{{ t('industry.finalProduct') }}</th>
              </tr>
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

        <div v-for="lvl in levels" :key="lvl.level" class="level-col">
          <table class="level-table">
            <thead>
              <tr>
                <th :class="`col-header level-${Math.min(lvl.level, 4)}`" :colspan="hasManufacturable(lvl) ? 3 : 2">
                  {{ levelLabel(lvl.level) }}
                </th>
              </tr>
              <tr>
                <th class="sub-header">{{ t('industry.material') }}</th>
                <th class="sub-header num">{{ t('industry.quantity') }}</th>
                <th class="sub-header num" v-if="hasManufacturable(lvl)">{{ t('queue.me') }}</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="(mat, idx) in lvl.materials" :key="mat.type_id">
                <tr v-if="idx === 0 || mat.group_name !== lvl.materials[idx - 1].group_name" class="group-row">
                  <td :colspan="hasManufacturable(lvl) ? 3 : 2" class="group-label">{{ mat.group_name }}</td>
                </tr>
                <tr>
                  <td class="name-cell">
                    <img class="type-icon" :src="`https://images.evetech.net/types/${mat.type_id}/icon?size=32`" alt="" loading="lazy">
                    <span
                      class="copyable"
                      :class="{
                        'name-reaction': mat.is_reaction,
                        'name-mfg': mat.is_manufacturable && !mat.is_reaction,
                      }"
                      @click="copyName(mat.type_name)"
                    >{{ mat.type_name }}</span>
                  </td>
                  <td class="num">{{ formatNumber(mat.quantity) }}</td>
                  <td class="num" v-if="hasManufacturable(lvl)">
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
      </div>

      <div v-if="summary.length" class="summary-section">
        <h3 class="section-title">{{ t('industry.rawSummary') }}</h3>
        <MaterialSummary :materials="summary" :prices="prices" />
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getBatchBom } from '../api/blueprints'
import { getPrices } from '../api/prices'
import ManufacturingQueue from '../components/blueprint/ManufacturingQueue.vue'
import MaterialSummary from '../components/calculation/MaterialSummary.vue'
import { useSettingsStore } from '../stores/settings'
import { useI18n } from '../i18n'
import { loadIndustryData, getIndustryData } from '../data/loader'

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
const prices = ref({})
const buildItems = ref({})
const currentItems = ref([])
const calculating = ref(false)
const dataReady = ref(false)
const globalMe = ref(10)

onMounted(async () => {
  await loadIndustryData()
  dataReady.value = true
})

function levelLabel(n) {
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
    summary.value = data.summary

    const typeIds = data.summary.map(m => m.type_id)
    if (typeIds.length) {
      try {
        const priceResp = await getPrices(typeIds, settings.datasource)
        prices.value = priceResp.data.prices
      } catch {
        // prices are optional
      }
    }
  } finally {
    calculating.value = false
  }
}

async function onCalculate(items) {
  currentItems.value = items
  buildItems.value = {}

  // Final product type_ids — these are always expanded even if in skip groups
  const finalProductIds = new Set(items.map(i => i.product_type_id))

  // Auto expand all: iteratively mark every manufacturable item as build
  let prevCount = 0
  const indData = getIndustryData()
  for (let i = 0; i < 10; i++) {
    await fetchBom()
    for (const lvl of levels.value) {
      for (const mat of lvl.materials) {
        if (mat.is_manufacturable && !buildItems.value[String(mat.type_id)]?.build) {
          // Skip certain groups (e.g. Fuel Block) unless it's a final product
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

function hasManufacturable(lvl) {
  return lvl.materials.some(m => m.build && m.is_manufacturable)
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
    // Only apply to manufacturing items, not reactions
    if (item.build) {
      item.me_level = globalMe.value
    }
  }
  fetchBom()
}

function copyName(name) {
  navigator.clipboard.writeText(name)
}

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

/* ---- product column ---- */
.product-col .col-header {
  background: rgba(200, 170, 110, 0.18);
  color: #c8aa6e;
}

.col-header.level-product {
  background: rgba(200, 170, 110, 0.18);
  color: #c8aa6e;
}

.product-name-text {
  color: #c8aa6e;
  font-weight: 500;
}

/* ---- per-level tables side by side ---- */
.levels-row {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  align-items: flex-start;
}

.level-col {
  flex: 0 0 auto;
  min-width: 200px;
}

.level-table {
  background: #1a1a1a;
  border-radius: 8px;
  overflow: hidden;
  border-collapse: collapse;
  width: 100%;
}

.level-table th,
.level-table td {
  padding: 6px 10px;
  white-space: nowrap;
}

.col-header {
  text-align: center;
  font-size: 0.95em;
  padding: 8px 10px;
}

.col-header.level-0 { background: rgba(200, 170, 110, 0.12); color: #c8aa6e; }
.col-header.level-1 { background: rgba(255, 152, 0, 0.12); color: #ff9800; }
.col-header.level-2 { background: rgba(156, 39, 176, 0.12); color: #ce93d8; }
.col-header.level-3 { background: rgba(76, 175, 80, 0.12); color: #81c784; }
.col-header.level-4 { background: rgba(244, 67, 54, 0.12); color: #ef9a9a; }

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

.copyable {
  cursor: pointer;
  transition: color 0.2s;
}

.copyable:hover {
  color: #c8aa6e;
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

.section-title {
  color: #c8aa6e;
  margin-bottom: 12px;
  font-size: 1.1em;
}

.summary-section {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #2a2a2a;
}
</style>
