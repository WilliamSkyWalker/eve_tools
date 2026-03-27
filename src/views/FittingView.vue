<template>
  <div class="fitting">
    <h1 class="title">{{ t('fit.title') }}</h1>

    <div class="input-section">
      <textarea
        v-model="eftText"
        class="eft-input"
        :placeholder="t('fit.placeholder')"
        rows="12"
        @input="parseEft"
      ></textarea>
      <button class="calc-btn" :disabled="!items.length || priceLoading" @click="fetchPrices">
        {{ priceLoading ? t('fit.fetchingPrices') : t('fit.calculate') }}
      </button>
    </div>

    <!-- Ship header -->
    <div v-if="shipName" class="ship-header">
      <img v-if="shipTid" class="ship-icon" :src="`https://images.evetech.net/types/${shipTid}/icon?size=64`" alt="" loading="lazy">
      <div>
        <div class="ship-type">{{ shipDisplayName || shipName }}</div>
        <div v-if="fitName" class="fit-name">{{ fitName }}</div>
      </div>
      <div v-if="totalPrice != null" class="total-price">
        {{ t('fit.total') }}: <strong>{{ formatPrice(totalPrice) }}</strong> ISK
      </div>
    </div>

    <!-- Items table -->
    <div v-if="items.length" class="result-section">
      <table class="fit-table">
        <thead>
          <tr>
            <th class="col-name">{{ t('fit.item') }}</th>
            <th class="col-num">{{ t('fit.qty') }}</th>
            <th class="col-num">{{ t('fit.price') }}</th>
            <th class="col-num">{{ t('fit.subtotal') }}</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="(group, gi) in groupedItems" :key="gi">
            <tr class="group-header">
              <td colspan="4">{{ group.label }}</td>
            </tr>
            <tr v-for="item in group.items" :key="item.name" :class="{ unmatched: !item.matched }">
              <td class="col-name">
                <div class="name-cell">
                  <img v-if="item.tid" class="type-icon" :src="`https://images.evetech.net/types/${item.tid}/icon?size=32`" alt="" loading="lazy">
                  <span :class="{ copyable: item.matched }" @click="item.matched && copyName(item.displayName, $event)">{{ item.displayName }}</span>
                </div>
              </td>
              <td class="col-num">{{ item.qty }}</td>
              <td class="col-num">{{ formatPrice(item.sellPrice) }}</td>
              <td class="col-num highlight">{{ formatPrice(item.subtotal) }}</td>
            </tr>
          </template>
        </tbody>
        <tfoot v-if="totalPrice != null">
          <tr class="total-row">
            <td colspan="3" class="total-label">{{ t('fit.total') }}</td>
            <td class="col-num total-val">{{ formatPrice(totalPrice) }} ISK</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <div v-else-if="eftText.trim() && !shipName" class="no-data">{{ t('fit.noResult') }}</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useSettingsStore } from '../stores/settings'
import { useI18n } from '../i18n'
import { loadIndustryData, getIndustryData } from '../data/loader'
import { getOrderPricesForTypes } from '../services/esiClient'
import { locName } from '../services/locale'

const settings = useSettingsStore()
const { t, locale } = useI18n()

const eftText = ref('')
const shipName = ref('')
const shipTid = ref(null)
const shipDisplayName = ref('')
const fitName = ref('')
const items = ref([])  // [{ name, qty, category, tid, matched, displayName }]
const prices = ref({})
const priceLoading = ref(false)

onMounted(async () => {
  await loadIndustryData()
  document.addEventListener('click', onDocClick)
})
onUnmounted(() => document.removeEventListener('click', onDocClick))

function onDocClick() {
  const prev = document.querySelector('.copyable.copied')
  if (prev) prev.classList.remove('copied')
}

// ── Name lookup ──
function lookupType(name) {
  const data = getIndustryData()
  if (!data) return null
  if (!data._nameLookup) {
    data._nameLookup = new Map()
    for (const [tidStr, t] of Object.entries(data.types)) {
      const tid = parseInt(tidStr)
      if (t.n) data._nameLookup.set(t.n.toLowerCase(), { tid, t })
      if (t.nz) data._nameLookup.set(t.nz, { tid, t })
    }
  }
  return data._nameLookup.get(name.toLowerCase()) || data._nameLookup.get(name) || null
}

// ── EFT Parser ──
function parseEft() {
  shipName.value = ''
  shipTid.value = null
  shipDisplayName.value = ''
  fitName.value = ''
  items.value = []
  prices.value = {}

  const lines = eftText.value.split('\n')
  if (!lines.length) return

  // First line: [ShipType, Fit Name]
  const headerMatch = lines[0].trim().match(/^\[(.+?)(?:,\s*(.+))?\]$/)
  if (!headerMatch) return

  shipName.value = headerMatch[1].trim()
  fitName.value = headerMatch[2]?.trim() || ''

  const shipLookup = lookupType(shipName.value)
  if (shipLookup) {
    shipTid.value = shipLookup.tid
    shipDisplayName.value = locName(shipLookup.t)
  }

  // Parse remaining lines
  const itemMap = {}  // key -> { name, qty, category, tid, matched, displayName }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    if (line.startsWith('[')) continue  // skip additional headers

    // Check for "x5" suffix (drones, charges)
    let itemName = line
    let qty = 1
    const xMatch = line.match(/^(.+?)\s+x(\d+)\s*$/i)
    if (xMatch) {
      itemName = xMatch[1].trim()
      qty = parseInt(xMatch[2], 10) || 1
    }

    // Split on comma: module, charge/script
    const commaParts = itemName.split(',')
    const moduleName = commaParts[0].trim()
    const chargeName = commaParts.length > 1 ? commaParts[1].trim() : null

    if (moduleName && moduleName !== '[Empty High slot]' && moduleName !== '[Empty Med slot]' && moduleName !== '[Empty Low slot]' && moduleName !== '[Empty Rig slot]' && moduleName !== '[Empty Subsystem slot]') {
      addItem(itemMap, moduleName, qty, 'module')
    }

    if (chargeName) {
      addItem(itemMap, chargeName, qty, 'charge')
    }
  }

  items.value = Object.values(itemMap)
}

function addItem(map, name, qty, category) {
  const key = name.toLowerCase()
  if (map[key]) {
    map[key].qty += qty
  } else {
    const lookup = lookupType(name)
    map[key] = {
      name,
      qty,
      category,
      tid: lookup?.tid || null,
      matched: lookup != null,
      displayName: lookup ? locName(lookup.t) : name,
    }
  }
}

// ── Prices ──
async function fetchPrices() {
  if (!items.value.length) return
  priceLoading.value = true
  try {
    const typeIds = new Set()
    if (shipTid.value) typeIds.add(shipTid.value)
    for (const item of items.value) {
      if (item.tid) typeIds.add(item.tid)
    }
    prices.value = await getOrderPricesForTypes([...typeIds], settings.datasource)
  } catch { /* optional */ }
  finally { priceLoading.value = false }
}

// ── Grouped display ──
const groupedItems = computed(() => {
  const modules = items.value.filter(i => i.category === 'module')
  const charges = items.value.filter(i => i.category === 'charge')
  const groups = []

  // Ship
  if (shipTid.value || shipName.value) {
    const shipPrice = shipTid.value ? prices.value[shipTid.value]?.sell_price : null
    groups.push({
      label: t('fit.ship'),
      items: [{
        name: shipName.value,
        qty: 1,
        tid: shipTid.value,
        matched: shipTid.value != null,
        displayName: shipDisplayName.value || shipName.value,
        sellPrice: shipPrice,
        subtotal: shipPrice,
      }],
    })
  }

  if (modules.length) {
    groups.push({
      label: t('fit.item'),
      items: modules.map(i => ({
        ...i,
        sellPrice: i.tid ? prices.value[i.tid]?.sell_price ?? null : null,
        subtotal: i.tid && prices.value[i.tid]?.sell_price ? prices.value[i.tid].sell_price * i.qty : null,
      })),
    })
  }

  if (charges.length) {
    groups.push({
      label: t('fit.charge'),
      items: charges.map(i => ({
        ...i,
        sellPrice: i.tid ? prices.value[i.tid]?.sell_price ?? null : null,
        subtotal: i.tid && prices.value[i.tid]?.sell_price ? prices.value[i.tid].sell_price * i.qty : null,
      })),
    })
  }

  return groups
})

const totalPrice = computed(() => {
  let total = 0
  let hasAny = false
  for (const group of groupedItems.value) {
    for (const item of group.items) {
      if (item.subtotal != null) { total += item.subtotal; hasAny = true }
    }
  }
  return hasAny ? total : null
})

// ── Formatting ──
function formatPrice(n) {
  if (n == null) return '-'
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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
.fitting {
  padding-top: 20px;
}

.title {
  color: #c8aa6e;
  font-size: 1.8em;
  margin-bottom: 4px;
  text-align: center;
}

.input-section {
  max-width: 700px;
  margin: 0 auto 20px;
}

.eft-input {
  width: 100%;
  background: #0d0d0d;
  border: 1px solid #2a2a2a;
  border-radius: 6px;
  color: #d0d0d0;
  padding: 10px 14px;
  font-size: 0.9em;
  font-family: 'Courier New', monospace;
  resize: vertical;
  box-sizing: border-box;
}

.eft-input::placeholder {
  color: #555;
  font-family: inherit;
}

.eft-input:focus {
  outline: none;
  border-color: #c8aa6e;
}

.calc-btn {
  margin-top: 10px;
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

.calc-btn:hover:not(:disabled) {
  background: #e0c882;
}

.calc-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ── Ship header ── */
.ship-header {
  display: flex;
  align-items: center;
  gap: 14px;
  max-width: 700px;
  margin: 0 auto 20px;
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 8px;
  padding: 14px 18px;
}

.ship-icon {
  width: 48px;
  height: 48px;
  border-radius: 6px;
  flex-shrink: 0;
}

.ship-type {
  color: #c8aa6e;
  font-size: 1.2em;
  font-weight: 600;
}

.fit-name {
  color: #8a8a8a;
  font-size: 0.85em;
}

.total-price {
  margin-left: auto;
  color: #8a8a8a;
  font-size: 0.9em;
  white-space: nowrap;
}

.total-price strong {
  color: #4caf50;
  font-size: 1.1em;
}

/* ── Table ── */
.result-section {
  overflow-x: auto;
}

.fit-table {
  width: 100%;
  max-width: 700px;
  margin: 0 auto;
  background: #1a1a1a;
  border-radius: 8px;
  overflow: hidden;
  border-collapse: collapse;
}

.fit-table th {
  background: rgba(200, 170, 110, 0.08);
  color: #c8aa6e;
  padding: 10px 12px;
  font-size: 0.85em;
  font-weight: 500;
  border-bottom: 1px solid #2a2a2a;
}

.fit-table td {
  padding: 8px 12px;
  border-bottom: 1px solid rgba(42, 42, 42, 0.5);
  font-size: 0.9em;
}

.col-name {
  text-align: left;
}

.col-num {
  text-align: right;
  white-space: nowrap;
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

.highlight {
  color: #c8aa6e;
}

.group-header td {
  background: rgba(200, 170, 110, 0.04);
  color: #8a8a8a;
  font-size: 0.8em;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 6px 12px;
  border-bottom: 1px solid #2a2a2a;
}

.unmatched td {
  opacity: 0.5;
}

.total-row td {
  border-top: 2px solid #2a2a2a;
  border-bottom: none;
  padding: 10px 12px;
}

.total-label {
  text-align: right;
  font-weight: 700;
  color: #c8aa6e;
}

.total-val {
  font-weight: 700;
  color: #4caf50;
  font-size: 1.05em;
}

.no-data {
  text-align: center;
  color: #555;
  padding: 40px;
}
</style>
