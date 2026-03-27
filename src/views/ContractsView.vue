<template>
  <div class="contracts-page">
    <h1 class="title">{{ t('contracts.title') }} ({{ serverLabel }})</h1>
    <p class="subtitle">{{ t('contracts.subtitle') }}</p>

    <!-- Filters -->
    <div class="form-section">
      <div class="form-row">
        <div class="field field-region">
          <label class="field-label">{{ t('contracts.region') }}</label>
          <div class="region-search-wrap">
            <input
              v-model="regionQuery"
              type="text"
              class="search-input"
              :placeholder="t('contracts.regionPlaceholder')"
              @input="onRegionSearch"
              @focus="showRegionDropdown = true"
            />
            <div v-if="showRegionDropdown && regionResults.length > 0" class="dropdown">
              <div
                v-for="r in regionResults"
                :key="r.region_id"
                class="dropdown-item"
                @mousedown.prevent="selectRegion(r)"
              >
                {{ locPick(r.region_name_zh, r.region_name) }}
                <span v-if="r.region_name_zh && locale !== 'zh'" class="dropdown-sub">{{ r.region_name_zh }}</span>
                <span v-if="r.region_name && locale === 'zh'" class="dropdown-sub">{{ r.region_name }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="field field-type">
          <label class="field-label">{{ t('contracts.type') }}</label>
          <select v-model="contractType" class="select-input">
            <option value="">{{ t('contracts.allTypes') }}</option>
            <option value="item_exchange">{{ t('contracts.typeItemExchange') }}</option>
            <option value="auction">{{ t('contracts.typeAuction') }}</option>
            <option value="courier">{{ t('contracts.typeCourier') }}</option>
          </select>
        </div>
        <div class="field field-btn">
          <button
            class="btn-search"
            :disabled="loading || !selectedRegion"
            @click="fetchContracts(1)"
          >
            {{ loading ? t('contracts.loading') : t('contracts.search') }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="error" class="error-msg">{{ error }}</div>

    <!-- Results -->
    <div v-if="contracts.length > 0" class="result-section">
      <div class="result-header">
        <span class="result-count">
          {{ t('contracts.page') }} {{ currentPage }}/{{ totalPages }}
        </span>
        <div class="pagination">
          <button class="page-btn" :disabled="currentPage <= 1" @click="fetchContracts(currentPage - 1)">&laquo;</button>
          <button class="page-btn" :disabled="currentPage >= totalPages" @click="fetchContracts(currentPage + 1)">&raquo;</button>
        </div>
      </div>

      <table class="contracts-table">
        <thead>
          <tr>
            <th class="col-type">{{ t('contracts.type') }}</th>
            <th>{{ t('contracts.colTitle') }}</th>
            <th class="col-price">{{ t('contracts.colPrice') }}</th>
            <th class="col-jita">{{ t('contracts.jitaBuy') }}</th>
            <th class="col-volume">{{ t('contracts.colVolume') }}</th>
            <th class="col-issued">{{ t('contracts.colIssued') }}</th>
            <th class="col-action">{{ t('contracts.colDetail') }}</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="c in contracts" :key="c.contract_id">
            <tr
              class="contract-row"
              :class="contractPriceClass(c)"
              @click="toggleDetail(c)"
            >
              <td class="col-type">
                <span class="type-badge" :class="`ct-${c.type}`">{{ contractTypeLabel(c.type) }}</span>
              </td>
              <td class="col-title">
                <span v-if="c.title" class="contract-title">{{ c.title }}</span>
                <span v-if="c._item_names && c._item_names.length > 0" class="item-names">
                  <span v-for="(name, idx) in c._item_names.slice(0, 3)" :key="idx" class="item-name-tag">{{ name }}</span>
                  <span v-if="c._item_names.length > 3" class="item-name-more">+{{ c._item_names.length - 3 }}</span>
                </span>
                <span v-else-if="!c.title && !c._item_names">-</span>
              </td>
              <td class="col-price">
                <template v-if="c.type === 'courier'">
                  <span class="price-reward">{{ formatIsk(c.reward) }}</span>
                  <span class="price-collateral" v-if="c.collateral">
                    {{ t('contracts.collateral') }}: {{ formatIsk(c.collateral) }}
                  </span>
                </template>
                <template v-else>
                  {{ formatIsk(c.price) }}
                  <span v-if="c.buyout && c.type === 'auction'" class="price-buyout">
                    {{ t('contracts.buyout') }}: {{ formatIsk(c.buyout) }}
                  </span>
                </template>
              </td>
              <td class="col-jita">
                <template v-if="c._jita_total != null">
                  {{ formatIsk(c._jita_total) }}
                  <span class="discount-badge" :class="discountClass(c)">
                    {{ discountText(c) }}
                  </span>
                </template>
                <template v-else>
                  <span v-if="c._jita_loading" class="jita-loading">...</span>
                  <span v-else>-</span>
                </template>
              </td>
              <td class="col-volume">{{ c.volume ? `${formatNumber(c.volume)} m³` : '-' }}</td>
              <td class="col-issued">{{ formatDate(c.date_issued) }}</td>
              <td class="col-action">
                <button class="btn-items" @click.stop="toggleDetail(c)">
                  {{ expandedContract === c.contract_id ? t('contracts.hideDetail') : t('contracts.showDetail') }}
                </button>
              </td>
            </tr>
            <!-- Detail panel -->
            <tr v-if="expandedContract === c.contract_id" class="detail-row">
              <td colspan="7">
                <div class="detail-panel">
                  <!-- Contract info + Copy link -->
                  <div class="detail-header">
                    <div class="detail-info-grid">
                      <div class="detail-field">
                        <span class="detail-label">{{ t('contracts.contractId') }}</span>
                        <span class="detail-value">{{ c.contract_id }}</span>
                      </div>
                      <div class="detail-field">
                        <span class="detail-label">{{ t('contracts.type') }}</span>
                        <span class="detail-value">{{ contractTypeLabel(c.type) }}</span>
                      </div>
                      <div class="detail-field">
                        <span class="detail-label">{{ t('contracts.issuer') }}</span>
                        <span class="detail-value">{{ c.issuer_id }} <span class="detail-sub">({{ c.issuer_corporation_id }})</span></span>
                      </div>
                      <div class="detail-field">
                        <span class="detail-label">{{ t('contracts.availability') }}</span>
                        <span class="detail-value">{{ c.for_corporation ? t('contracts.corpOnly') : t('contracts.public') }}</span>
                      </div>
                      <div class="detail-field">
                        <span class="detail-label">{{ t('contracts.colIssued') }}</span>
                        <span class="detail-value">{{ formatDateTime(c.date_issued) }}</span>
                      </div>
                      <div class="detail-field">
                        <span class="detail-label">{{ t('contracts.colExpires') }}</span>
                        <span class="detail-value">{{ formatDateTime(c.date_expired) }}</span>
                      </div>
                      <div v-if="c.type === 'courier'" class="detail-field">
                        <span class="detail-label">{{ t('contracts.startLocation') }}</span>
                        <span class="detail-value">{{ c.start_location_id }}</span>
                      </div>
                      <div v-if="c.type === 'courier'" class="detail-field">
                        <span class="detail-label">{{ t('contracts.endLocation') }}</span>
                        <span class="detail-value">{{ c.end_location_id }}</span>
                      </div>
                      <div v-if="c.type === 'courier'" class="detail-field">
                        <span class="detail-label">{{ t('contracts.daysToComplete') }}</span>
                        <span class="detail-value">{{ c.days_to_complete }} {{ t('contracts.days') }}</span>
                      </div>
                      <div v-if="c.price" class="detail-field">
                        <span class="detail-label">{{ t('contracts.colPrice') }}</span>
                        <span class="detail-value detail-price">{{ formatIsk(c.price) }}</span>
                      </div>
                      <div v-if="c.reward" class="detail-field">
                        <span class="detail-label">{{ t('contracts.reward') }}</span>
                        <span class="detail-value detail-price">{{ formatIsk(c.reward) }}</span>
                      </div>
                      <div v-if="c.collateral" class="detail-field">
                        <span class="detail-label">{{ t('contracts.collateral') }}</span>
                        <span class="detail-value">{{ formatIsk(c.collateral) }}</span>
                      </div>
                      <div v-if="c.buyout" class="detail-field">
                        <span class="detail-label">{{ t('contracts.buyout') }}</span>
                        <span class="detail-value">{{ formatIsk(c.buyout) }}</span>
                      </div>
                      <div v-if="c.volume" class="detail-field">
                        <span class="detail-label">{{ t('contracts.colVolume') }}</span>
                        <span class="detail-value">{{ formatNumber(c.volume) }} m³</span>
                      </div>
                    </div>
                    <div class="detail-actions">
                      <button class="btn-copy-link" @click.stop="copyEveLink(c)">
                        {{ copySuccess === c.contract_id ? t('contracts.copied') : t('contracts.copyLink') }}
                      </button>
                    </div>
                  </div>

                  <!-- Items table -->
                  <div v-if="c.type !== 'courier'">
                    <div v-if="itemsLoading" class="items-loading">{{ t('contracts.loadingItems') }}</div>
                    <template v-else-if="expandedItems.length > 0">
                      <table class="items-table">
                        <thead>
                          <tr>
                            <th>{{ t('contracts.itemName') }}</th>
                            <th class="col-qty">{{ t('contracts.itemQty') }}</th>
                            <th class="col-jita-item">{{ t('contracts.jitaBuy') }}</th>
                            <th class="col-jita-item">{{ t('contracts.jitaSell') }}</th>
                            <th class="col-included">{{ t('contracts.itemIncluded') }}</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="item in expandedItems" :key="item.record_id">
                            <td>
                              {{ locPick(item.type_name_zh, item.type_name) || `Type #${item.type_id}` }}
                            </td>
                            <td class="col-qty">{{ formatNumber(item.quantity) }}</td>
                            <td class="col-jita-item col-jita-buy">{{ item.jita_buy ? formatIsk(item.jita_buy) : '-' }}</td>
                            <td class="col-jita-item">{{ item.jita_sell ? formatIsk(item.jita_sell) : '-' }}</td>
                            <td class="col-included">
                              <span :class="item.is_included ? 'included-yes' : 'included-no'">
                                {{ item.is_included ? t('contracts.yes') : t('contracts.wantsToBuy') }}
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                      <div class="jita-total-row">
                        <span v-if="expandedJitaBuy">{{ t('contracts.totalJitaBuy') }}: {{ formatIsk(expandedJitaBuy) }}</span>
                        <span v-if="expandedJitaBuy && expandedJitaTotal" class="jita-total-sep">|</span>
                        <span v-if="expandedJitaTotal">{{ t('contracts.totalJitaValue') }}: {{ formatIsk(expandedJitaTotal) }}</span>
                      </div>
                    </template>
                  </div>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>

      <div class="pagination-bottom">
        <button class="page-btn" :disabled="currentPage <= 1" @click="fetchContracts(currentPage - 1)">&laquo; {{ t('contracts.prev') }}</button>
        <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
        <button class="page-btn" :disabled="currentPage >= totalPages" @click="fetchContracts(currentPage + 1)">{{ t('contracts.next') }} &raquo;</button>
      </div>
    </div>

    <div v-if="!loading && searched && contracts.length === 0" class="empty-msg">
      {{ t('contracts.noResults') }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getPublicContracts, getContractItems, searchRegions } from '../api/contracts'
import { useSettingsStore } from '../stores/settings'
import { useI18n } from '../i18n'
import { loadIndustryData, loadNavigationData } from '../data/loader'

const settings = useSettingsStore()
const { t, locale, serverLabel } = useI18n()

function locPick(zh, en) {
  if (locale.value === 'en') return en || zh || ''
  return zh || en || ''
}

onMounted(() => Promise.all([loadIndustryData(), loadNavigationData()]))

const datasource = computed(() => settings.server === 'of' ? 'tranquility' : 'serenity')

const regionQuery = ref('')
const regionResults = ref([])
const showRegionDropdown = ref(false)
const selectedRegion = ref(null)
const contractType = ref('')
const contracts = ref([])
const loading = ref(false)
const error = ref('')
const searched = ref(false)
const currentPage = ref(1)
const totalPages = ref(1)
const expandedContract = ref(null)
const expandedItems = ref([])
const expandedJitaTotal = ref(null)
const expandedJitaBuy = ref(null)
const itemsLoading = ref(false)
const contractItemsCache = {} // contract_id -> { items, total_jita_value, total_jita_buy }
const copySuccess = ref(null)

let regionTimer = null
let copyTimer = null

function onRegionSearch() {
  clearTimeout(regionTimer)
  selectedRegion.value = null
  regionTimer = setTimeout(async () => {
    const q = regionQuery.value.trim()
    if (q.length < 1) {
      regionResults.value = []
      return
    }
    try {
      const { data } = await searchRegions(q)
      regionResults.value = data.results
      showRegionDropdown.value = true
    } catch {
      regionResults.value = []
    }
  }, 200)
}

function selectRegion(r) {
  selectedRegion.value = r
  regionQuery.value = locPick(r.region_name_zh, r.region_name)
  showRegionDropdown.value = false
  regionResults.value = []
}

async function fetchContracts(page = 1) {
  if (!selectedRegion.value) return
  loading.value = true
  error.value = ''
  searched.value = true
  expandedContract.value = null
  expandedItems.value = []

  try {
    const { data } = await getPublicContracts(selectedRegion.value.region_id, {
      type: contractType.value || undefined,
      page,
      datasource: datasource.value,
    })
    contracts.value = data.contracts.map(c => ({ ...c, _jita_total: null, _jita_loading: false, _item_names: null }))
    currentPage.value = data.page
    totalPages.value = data.total_pages

    // Auto-fetch Jita prices for item_exchange contracts (in background)
    fetchJitaPricesForContracts()
  } catch (e) {
    error.value = e.response?.data?.error || t('contracts.error')
    contracts.value = []
  } finally {
    loading.value = false
  }
}

async function fetchJitaPricesForContracts() {
  // Fetch items + Jita prices for each item_exchange/auction contract in parallel (max 5 at a time)
  const itemContracts = contracts.value.filter(c => c.type === 'item_exchange' || c.type === 'auction')
  const batchSize = 10

  for (let i = 0; i < itemContracts.length; i += batchSize) {
    const batch = itemContracts.slice(i, i + batchSize)
    await Promise.all(batch.map(async (c) => {
      c._jita_loading = true
      try {
        const { data } = await getContractItems(c.contract_id, {
          datasource: datasource.value,
        })
        contractItemsCache[c.contract_id] = data
        c._jita_total = data.total_jita_buy
        // Store item names for display in title column
        const included = (data.items || []).filter(i => i.is_included !== false)
        c._item_names = included.map(i => {
          const name = locPick(i.type_name_zh, i.type_name) || `#${i.type_id}`
          return i.quantity > 1 ? `${name} x${i.quantity.toLocaleString()}` : name
        })
      } catch {
        c._jita_total = null
      } finally {
        c._jita_loading = false
      }
    }))
  }
}

async function toggleDetail(contract) {
  if (expandedContract.value === contract.contract_id) {
    expandedContract.value = null
    expandedItems.value = []
    expandedJitaTotal.value = null
    expandedJitaBuy.value = null
    return
  }

  expandedContract.value = contract.contract_id
  expandedItems.value = []
  expandedJitaTotal.value = null
  expandedJitaBuy.value = null

  if (contract.type !== 'courier') {
    const cached = contractItemsCache[contract.contract_id]
    if (cached) {
      expandedItems.value = cached.items
      expandedJitaTotal.value = cached.total_jita_value
      expandedJitaBuy.value = cached.total_jita_buy
    } else {
      itemsLoading.value = true
      try {
        const { data } = await getContractItems(contract.contract_id, {
          datasource: datasource.value,
        })
        contractItemsCache[contract.contract_id] = data
        expandedItems.value = data.items
        expandedJitaTotal.value = data.total_jita_value
        expandedJitaBuy.value = data.total_jita_buy
      } catch {
        expandedItems.value = []
      } finally {
        itemsLoading.value = false
      }
    }
  }
}

function copyEveLink(contract) {
  const title = contract.title || `Contract #${contract.contract_id}`
  // EVE in-game contract link format: <url=contract:SOLAR_SYSTEM_ID//CONTRACT_ID>text</url>
  // start_location_id serves as location reference
  const locationId = contract.start_location_id || 0
  const link = `<url=contract:${locationId}//${contract.contract_id}>${title}</url>`
  navigator.clipboard.writeText(link).then(() => {
    copySuccess.value = contract.contract_id
    clearTimeout(copyTimer)
    copyTimer = setTimeout(() => { copySuccess.value = null }, 2000)
  })
}

function contractPriceClass(c) {
  if (c.type === 'courier' || c._jita_total == null || c._jita_total <= 0) return ''
  const ratio = c.price / c._jita_total
  if (ratio < 1) return 'price-green'    // cheaper than Jita = good deal
  if (ratio > 1.2) return 'price-red'    // 20%+ above Jita = bad deal
  return ''
}

function discountClass(c) {
  if (!c._jita_total || c._jita_total <= 0 || c.type === 'courier') return ''
  const ratio = c.price / c._jita_total
  if (ratio < 1) return 'discount-green'
  if (ratio > 1.2) return 'discount-red'
  return 'discount-normal'
}

function discountText(c) {
  if (!c._jita_total || c._jita_total <= 0 || c.type === 'courier') return ''
  const pct = Math.round((1 - c.price / c._jita_total) * 100)
  if (pct > 0) return `-${pct}%`    // discount
  if (pct < 0) return `+${-pct}%`   // premium
  return '0%'
}

function contractTypeLabel(type) {
  const map = {
    item_exchange: t('contracts.typeItemExchange'),
    auction: t('contracts.typeAuction'),
    courier: t('contracts.typeCourier'),
    unknown: t('contracts.typeUnknown'),
  }
  return map[type] || type
}

function formatIsk(value) {
  if (!value && value !== 0) return '-'
  return Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ISK'
}

function formatNumber(value) {
  if (!value && value !== 0) return '0'
  return Number(value).toLocaleString()
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString()
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
.contracts-page {
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

.form-section {
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.form-row {
  display: flex;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
}

.field-region {
  flex: 2;
  min-width: 200px;
  position: relative;
}

.field-type {
  flex: 1;
  min-width: 150px;
}

.field-btn {
  min-width: 120px;
}

.field-label {
  display: block;
  font-size: 0.85em;
  color: #8a8a8a;
  margin-bottom: 4px;
}

.search-input,
.select-input {
  width: 100%;
  padding: 10px 14px;
  font-size: 0.95em;
  background: #0d0d0d;
  border: 1px solid #2a2a2a;
  border-radius: 6px;
  color: #d0d0d0;
  outline: none;
  box-sizing: border-box;
}

.search-input:focus,
.select-input:focus {
  border-color: #c8aa6e;
}

.select-input {
  cursor: pointer;
  appearance: auto;
}

.region-search-wrap {
  position: relative;
}

.dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 0 0 6px 6px;
  z-index: 100;
  max-height: 200px;
  overflow-y: auto;
}

.dropdown-item {
  padding: 8px 14px;
  cursor: pointer;
  font-size: 0.9em;
  color: #d0d0d0;
  transition: background 0.15s;
}

.dropdown-item:hover {
  background: rgba(200, 170, 110, 0.1);
}

.dropdown-sub {
  color: #8a8a8a;
  margin-left: 8px;
  font-size: 0.85em;
}

.btn-search {
  width: 100%;
  padding: 10px 24px;
  background: #c8aa6e;
  color: #0d0d0d;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.95em;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-search:hover:not(:disabled) {
  background: #e0c882;
}

.btn-search:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-msg {
  text-align: center;
  color: #ef5350;
  margin-bottom: 16px;
}

.empty-msg {
  text-align: center;
  color: #555;
  padding: 40px;
}

/* Results */
.result-section {
  margin-top: 8px;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.result-count {
  color: #8a8a8a;
  font-size: 0.9em;
}

.pagination {
  display: flex;
  gap: 8px;
}

.page-btn {
  padding: 6px 14px;
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 4px;
  color: #8a8a8a;
  cursor: pointer;
  font-size: 0.9em;
  transition: border-color 0.2s, color 0.2s;
}

.page-btn:hover:not(:disabled) {
  border-color: #c8aa6e;
  color: #c8aa6e;
}

.page-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.pagination-bottom {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 16px;
}

.page-info {
  color: #8a8a8a;
  font-size: 0.9em;
}

.contracts-table {
  width: 100%;
  background: #1a1a1a;
  border-radius: 8px;
  overflow: hidden;
  border-collapse: collapse;
}

.contracts-table th {
  background: rgba(200, 170, 110, 0.08);
  color: #c8aa6e;
  padding: 10px 12px;
  font-size: 0.9em;
  font-weight: 500;
  border-bottom: 1px solid #2a2a2a;
  text-align: left;
}

.contracts-table td {
  padding: 8px 12px;
  border-bottom: 1px solid rgba(42, 42, 42, 0.5);
}

.contract-row:hover {
  background: rgba(200, 170, 110, 0.03);
}

.col-type { width: 100px; }
.col-price { width: 160px; text-align: right; }
.col-jita { width: 160px; text-align: right; }
.col-volume { width: 90px; text-align: right; color: #8a8a8a; }
.col-issued { width: 90px; color: #8a8a8a; font-size: 0.9em; }
.col-action { width: 80px; text-align: center; }
.col-title { color: #d0d0d0; }

.contract-title {
  display: block;
  margin-bottom: 2px;
}

.item-names {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.item-name-tag {
  font-size: 0.8em;
  color: #8a8a8a;
  background: rgba(138, 138, 138, 0.1);
  padding: 1px 6px;
  border-radius: 3px;
  white-space: nowrap;
}

.item-name-more {
  font-size: 0.8em;
  color: #8a8a8a;
}

/* Price-based row coloring */
.price-green td { color: #4caf50; }
.price-green .col-title { color: #4caf50; }
.price-red td { color: #ef5350; }
.price-red .col-title { color: #ef5350; }

.discount-badge {
  display: inline-block;
  font-size: 0.8em;
  margin-left: 6px;
  padding: 1px 6px;
  border-radius: 3px;
}
.discount-normal { color: #d0d0d0; }
.discount-green { color: #4caf50; background: rgba(76, 175, 80, 0.1); }
.discount-red { color: #ef5350; background: rgba(239, 83, 80, 0.1); }

.jita-loading { color: #555; }

.type-badge {
  font-size: 0.8em;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 500;
}

.ct-item_exchange { color: #4caf50; background: rgba(76, 175, 80, 0.1); }
.ct-auction { color: #ff9800; background: rgba(255, 152, 0, 0.1); }
.ct-courier { color: #42a5f5; background: rgba(66, 165, 245, 0.1); }
.ct-unknown { color: #8a8a8a; background: rgba(138, 138, 138, 0.1); }

.price-reward { color: #4caf50; }
.price-collateral, .price-buyout {
  display: block;
  font-size: 0.8em;
  color: #8a8a8a;
  margin-top: 2px;
}

.btn-items {
  padding: 4px 10px;
  font-size: 0.8em;
  background: transparent;
  border: 1px solid #2a2a2a;
  border-radius: 4px;
  color: #c8aa6e;
  cursor: pointer;
  transition: border-color 0.2s;
}

.btn-items:hover {
  border-color: #c8aa6e;
}

/* Detail panel */
.contract-row { cursor: pointer; }

.detail-row td {
  padding: 0;
  border-bottom: 1px solid #2a2a2a;
}

.detail-panel {
  background: rgba(200, 170, 110, 0.03);
  padding: 16px 20px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
}

.detail-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 8px 24px;
  flex: 1;
}

.detail-field {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.detail-label {
  font-size: 0.8em;
  color: #8a8a8a;
}

.detail-value {
  font-size: 0.9em;
  color: #d0d0d0;
}

.detail-sub {
  color: #8a8a8a;
  font-size: 0.85em;
}

.detail-price {
  color: #c8aa6e;
  font-weight: 600;
}

.detail-actions {
  flex-shrink: 0;
}

.btn-copy-link {
  padding: 8px 16px;
  background: transparent;
  border: 1px solid #c8aa6e;
  border-radius: 6px;
  color: #c8aa6e;
  font-size: 0.85em;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s, color 0.2s;
}

.btn-copy-link:hover {
  background: #c8aa6e;
  color: #0d0d0d;
}

.items-table {
  width: 100%;
  border-collapse: collapse;
}

.items-table th {
  color: #8a8a8a;
  padding: 6px 10px;
  font-size: 0.85em;
  font-weight: 500;
  border-bottom: 1px solid rgba(42, 42, 42, 0.5);
  text-align: left;
}

.items-table td {
  padding: 6px 10px;
  font-size: 0.9em;
  border-bottom: 1px solid rgba(42, 42, 42, 0.3);
}

.col-qty { text-align: right; width: 100px; }
.col-jita-item { text-align: right; width: 140px; color: #c8aa6e; }
.col-jita-buy { color: #4caf50; }
.col-included { text-align: center; width: 80px; }

.jita-total-row {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 8px 10px;
  color: #c8aa6e;
  font-weight: 600;
  border-top: 1px solid #2a2a2a;
}

.jita-total-sep {
  color: #2a2a2a;
}

.included-yes { color: #4caf50; }
.included-no { color: #ff9800; }

.items-loading {
  text-align: center;
  color: #8a8a8a;
  padding: 16px;
}
</style>
