<template>
  <div class="lpstore">
    <h1 class="title">{{ serverLabel }} {{ t('lp.title') }}</h1>

    <div v-if="!dataReady" class="loading-text">{{ t('lp.loading') }}</div>

    <template v-else>
      <!-- Corp search -->
      <div class="search-section">
        <input
          v-model="corpQuery"
          class="corp-search"
          :placeholder="t('lp.searchCorp')"
          @focus="dropdownOpen = true"
        />
        <div v-if="dropdownOpen && filteredCorps.length" class="corp-dropdown">
          <div
            v-for="c in filteredCorps"
            :key="c.id"
            class="corp-option"
            :class="{ active: c.id === selectedCorpId }"
            @click="selectCorp(c.id)"
          >
            {{ c.name }}
          </div>
        </div>
      </div>

      <!-- Calculate button -->
      <div class="action-row">
        <button class="calc-btn" :disabled="!selectedCorpId || priceLoading" @click="calculateAll">
          {{ priceLoading ? t('lp.fetchingPrices') : t('lp.calculate') }}
        </button>
      </div>

      <!-- Offers table -->
      <div v-if="selectedCorpId && currentOffers.length" class="result-section">
        <table class="offer-table">
          <thead>
            <tr>
              <th class="col-name">{{ t('lp.item') }}</th>
              <th class="col-num">{{ t('lp.qty') }}</th>
              <th class="col-num">{{ t('lp.lpCost') }}</th>
              <th class="col-num">{{ t('lp.iskCost') }}</th>
              <th class="col-req">{{ t('lp.requiredItems') }}</th>
              <th class="col-num">{{ t('lp.buyPrice') }}</th>
              <th class="col-num">{{ t('lp.sellPrice') }}</th>
              <th class="col-num sortable" :class="{ sorted: sortKey === 'iskPerLpBuy' }" @click="setSortKey('iskPerLpBuy')">
                {{ t('lp.iskPerLpBuy') }} {{ getSortIcon('iskPerLpBuy') }}
              </th>
              <th class="col-num sortable" :class="{ sorted: sortKey === 'iskPerLpSell' }" @click="setSortKey('iskPerLpSell')">
                {{ t('lp.iskPerLpSell') }} {{ getSortIcon('iskPerLpSell') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="o in sortedOffers" :key="o.t">
              <td class="col-name">
                <div class="name-cell">
                  <img 
                    class="type-icon" 
                    :src="`https://images.evetech.net/types/${o.t}/icon?size=32`" 
                    alt="" 
                    loading="lazy"
                    @error="handleImageError($event)"
                  >
                  <span class="copyable" @click="copyName(typeName(o.t), $event)">{{ typeName(o.t) }}</span>
                </div>
              </td>
              <td class="col-num">{{ o.q }}</td>
              <td class="col-num lp-val">{{ formatNumber(o.lp) }}</td>
              <td class="col-num">{{ formatNumber(o.isk) }}</td>
              <td class="col-req">
                <div v-if="o.req" class="req-list">
                  <span v-for="([tid, qty], i) in o.req" :key="i" class="req-item">
                    {{ typeName(tid) }} &times;{{ formatNumber(qty) }}
                  </span>
                </div>
                <span v-else class="no-req">-</span>
              </td>
              <td class="col-num">{{ formatPrice(buyPrice(o)) }}</td>
              <td class="col-num">{{ formatPrice(sellPrice(o)) }}</td>
              <td class="col-num" :class="iskPerLpBuyClass(o)">{{ formatIskPerLp(iskPerLpBuy(o)) }}</td>
              <td class="col-num" :class="iskPerLpSellClass(o)">{{ formatIskPerLp(iskPerLpSell(o)) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else-if="selectedCorpId" class="no-data">{{ t('lp.noOffers') }}</div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useSettingsStore } from '../stores/settings'
import { useI18n } from '../i18n'
import { loadLpStoreData, getLpStoreData, loadIndustryData } from '../data/loader'
import { getOrderPricesForTypes } from '../services/esiClient'

const settings = useSettingsStore()
const { t, locale, serverLabel } = useI18n()

const dataReady = ref(false)
const corpQuery = ref('')
const dropdownOpen = ref(false)
const selectedCorpId = ref(null)
const priceLoading = ref(false)
const prices = ref({})  // typeId -> { sell_price, buy_price }
const sortKey = ref('iskPerLpSell')
const sortDir = ref('desc')

onMounted(async () => {
  await Promise.all([loadLpStoreData(), loadIndustryData()])
  dataReady.value = true
  document.addEventListener('click', onDocClick)
})

onUnmounted(() => {
  document.removeEventListener('click', onDocClick)
})

function onDocClick(e) {
  if (!e.target.closest('.search-section')) dropdownOpen.value = false
  // Clear copied highlight
  const prev = document.querySelector('.copyable.copied')
  if (prev) prev.classList.remove('copied')
}

// ── Corp list ──
const corpList = computed(() => {
  const data = getLpStoreData()
  if (!data) return []
  return Object.entries(data.corps)
    .map(([id, c]) => ({
      id,
      name: (locale.value === 'zh' && c.nz) ? c.nz : c.n,
      search: `${c.n} ${c.nz || ''}`.toLowerCase(),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
})

const filteredCorps = computed(() => {
  const q = corpQuery.value.trim().toLowerCase()
  if (!q) return corpList.value
  return corpList.value.filter(c => c.search.includes(q))
})

function selectCorp(id) {
  selectedCorpId.value = id
  const corp = corpList.value.find(c => c.id === id)
  corpQuery.value = corp?.name || ''
  dropdownOpen.value = false
  prices.value = {}
}

// ── Offers ──
const currentOffers = computed(() => {
  const data = getLpStoreData()
  if (!data || !selectedCorpId.value) return []
  return data.offers[selectedCorpId.value] || []
})

// ── Type name resolution ──
function typeName(tid) {
  const data = getLpStoreData()
  const t = data?.types?.[tid]
  if (t) return (locale.value === 'zh' && t.nz) ? t.nz : t.n
  return String(tid)
}

// ── Price calculation ──
async function calculateAll() {
  if (!currentOffers.value.length) return
  priceLoading.value = true
  try {
    const typeIds = new Set()
    for (const o of currentOffers.value) {
      typeIds.add(o.t)
      if (o.req) for (const [tid] of o.req) typeIds.add(tid)
    }
    prices.value = await getOrderPricesForTypes([...typeIds], settings.datasource)
  } catch { /* prices optional */ }
  finally { priceLoading.value = false }
}

function buyPrice(offer) {
  const p = prices.value[offer.t]
  if (!p?.buy_price) return null
  return p.buy_price * offer.q
}

function sellPrice(offer) {
  const p = prices.value[offer.t]
  if (!p?.sell_price) return null
  return p.sell_price * offer.q
}

function reqCost(offer) {
  if (!offer.req) return 0
  let total = 0
  for (const [tid, qty] of offer.req) {
    const p = prices.value[tid]
    if (p?.sell_price) total += p.sell_price * qty
  }
  return total
}

function iskPerLpBuy(offer) {
  const buy = buyPrice(offer)
  if (buy == null || !offer.lp) return null
  const totalCost = offer.isk + reqCost(offer)
  const profit = buy - totalCost
  return profit / offer.lp
}

function iskPerLpSell(offer) {
  const sell = sellPrice(offer)
  if (sell == null || !offer.lp) return null
  const totalCost = offer.isk + reqCost(offer)
  const profit = sell - totalCost
  return profit / offer.lp
}

// ── Sorting ──
function setSortKey(key) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'desc' ? 'asc' : 'desc'
  } else {
    sortKey.value = key
    sortDir.value = 'desc'
  }
}

function getSortIcon(key) {
  if (sortKey.value !== key) return ''
  return sortDir.value === 'desc' ? '▼' : '▲'
}

const sortedOffers = computed(() => {
  const list = [...currentOffers.value]
  const dir = sortDir.value === 'desc' ? -1 : 1
  return list.sort((a, b) => {
    let va, vb
    if (sortKey.value === 'iskPerLpBuy') {
      va = iskPerLpBuy(a)
      vb = iskPerLpBuy(b)
    } else if (sortKey.value === 'iskPerLpSell') {
      va = iskPerLpSell(a)
      vb = iskPerLpSell(b)
    } else {
      // Default to sell price sorting
      va = iskPerLpSell(a)
      vb = iskPerLpSell(b)
    }
    
    if (va == null && vb == null) return 0
    if (va == null) return 1
    if (vb == null) return -1
    return (va - vb) * dir
  })
})

// ── Formatting ──
function formatNumber(n) {
  return n != null ? n.toLocaleString() : '-'
}

function formatPrice(n) {
  if (n == null) return '-'
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatIskPerLp(value) {
  if (value == null) return '-'
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 })
}

function iskPerLpBuyClass(offer) {
  const v = iskPerLpBuy(offer)
  if (v == null) return ''
  if (v >= 2000) return 'isk-lp-great'
  if (v >= 1000) return 'isk-lp-good'
  if (v > 0) return 'isk-lp-ok'
  return 'isk-lp-bad'
}

function iskPerLpSellClass(offer) {
  const v = iskPerLpSell(offer)
  if (v == null) return ''
  if (v >= 2000) return 'isk-lp-great'
  if (v >= 1000) return 'isk-lp-good'
  if (v > 0) return 'isk-lp-ok'
  return 'isk-lp-bad'
}

function clearCopied() {
  const prev = document.querySelector('.copyable.copied')
  if (prev) prev.classList.remove('copied')
}

function handleImageError(event) {
  // Use a generic blueprint icon when type-specific icon fails to load
  event.target.src = 'https://images.evetech.net/types/9/icon?size=32'
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
.lpstore {
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

.no-data {
  text-align: center;
  color: #555;
  padding: 40px;
}

/* ── Search ── */
.search-section {
  max-width: 500px;
  margin: 0 auto 12px;
  position: relative;
}

.corp-search {
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

.corp-search:focus {
  border-color: #c8aa6e;
}

.corp-dropdown {
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

.corp-option {
  padding: 8px 14px;
  cursor: pointer;
  font-size: 0.9em;
  color: #d0d0d0;
  transition: background 0.15s;
}

.corp-option:hover {
  background: rgba(200, 170, 110, 0.08);
  color: #c8aa6e;
}

.corp-option.active {
  color: #c8aa6e;
  background: rgba(200, 170, 110, 0.12);
}

/* ── Action ── */
.action-row {
  text-align: center;
  margin-bottom: 16px;
}

.calc-btn {
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

/* ── Table ── */
.result-section {
  overflow-x: auto;
}

.offer-table {
  width: 100%;
  background: #1a1a1a;
  border-radius: 8px;
  overflow: hidden;
  border-collapse: collapse;
}

.offer-table th {
  background: rgba(200, 170, 110, 0.08);
  color: #c8aa6e;
  padding: 10px 12px;
  font-size: 0.85em;
  font-weight: 500;
  border-bottom: 1px solid #2a2a2a;
  white-space: nowrap;
}

.offer-table td {
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

.col-req {
  text-align: left;
  max-width: 260px;
}

.sortable {
  cursor: pointer;
  user-select: none;
}

.sortable:hover {
  color: #e0c882;
}

.sorted {
  color: #fff;
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

.lp-val {
  color: #c8aa6e;
  font-weight: 600;
}

.req-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.req-item {
  background: rgba(138, 138, 138, 0.1);
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.8em;
  color: #8a8a8a;
  white-space: nowrap;
}

.no-req {
  color: #555;
}

/* ISK/LP color coding */
.isk-lp-great {
  color: #4caf50;
  font-weight: 700;
}

.isk-lp-good {
  color: #8bc34a;
  font-weight: 600;
}

.isk-lp-ok {
  color: #ff9800;
}

.isk-lp-bad {
  color: #ef5350;
}
</style>
