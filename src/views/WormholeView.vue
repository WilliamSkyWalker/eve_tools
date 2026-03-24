<template>
  <div class="wormhole-page">
    <h1 class="title">{{ t('wh.title') }}</h1>
    <p class="subtitle">{{ t('wh.subtitle') }}</p>

    <!-- Search & Filters -->
    <div class="form-section">
      <div class="form-row">
        <div class="field field-search">
          <label class="field-label">{{ t('wh.searchLabel') }}</label>
          <input
            v-model="query"
            type="text"
            class="search-input"
            :placeholder="t('wh.searchPlaceholder')"
            @input="onSearch"
          />
        </div>
        <div class="field field-class">
          <label class="field-label">{{ t('wh.class') }}</label>
          <select v-model="filterClass" class="select-input" @change="onSearch">
            <option :value="null">{{ t('wh.allClasses') }}</option>
            <option v-for="c in classOptions" :key="c.value" :value="c.value">{{ c.label }}</option>
          </select>
        </div>
        <div class="field field-effect">
          <label class="field-label">{{ t('wh.effect') }}</label>
          <select v-model="filterEffect" class="select-input" @change="onSearch">
            <option value="">{{ t('wh.allEffects') }}</option>
            <option v-for="e in effectOptions" :key="e" :value="e">{{ t(`wh.effects.${e}`) }}</option>
          </select>
        </div>
      </div>
      <div class="class-chips">
        <button
          v-for="c in classChips"
          :key="c.value"
          class="chip"
          :class="{ active: filterClass === c.value }"
          @click="toggleClassFilter(c.value)"
        >
          {{ c.label }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading-msg">{{ t('wh.loading') }}</div>
    <div v-if="error" class="error-msg">{{ error }}</div>

    <!-- Results Table -->
    <div v-if="results.length > 0" class="result-section">
      <table class="wh-table">
        <thead>
          <tr>
            <th>{{ t('wh.colName') }}</th>
            <th class="col-class">{{ t('wh.class') }}</th>
            <th class="col-effect">{{ t('wh.effect') }}</th>
            <th class="col-statics">{{ t('wh.statics') }}</th>
            <th class="col-sec">{{ t('wh.security') }}</th>
            <th>{{ t('wh.region') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="sys in results"
            :key="sys.solar_system_id"
            class="clickable-row"
            :class="{ 'selected-row': selectedSystem?.solar_system_id === sys.solar_system_id }"
            @click="selectSystem(sys)"
          >
            <td class="col-name">
              {{ sys.solar_system_name }}
              <span v-if="sys.solar_system_name_zh" class="zh-name">{{ sys.solar_system_name_zh }}</span>
            </td>
            <td class="col-class">
              <span class="class-badge" :class="`wh-c${sys.wormhole_class}`">{{ sys.class_display }}</span>
            </td>
            <td class="col-effect">
              <span v-if="sys.effect" class="effect-badge">{{ t(`wh.effects.${sys.effect}`) }}</span>
              <span v-else class="no-effect">-</span>
            </td>
            <td class="col-statics">
              <span v-if="sys.statics.length > 0" class="statics-list">
                <span v-for="s in sys.statics" :key="s" class="static-badge">{{ s }}</span>
              </span>
              <span v-else class="no-statics">-</span>
            </td>
            <td class="col-sec">
              <span class="security-badge sec-nullsec">{{ sys.security.toFixed(2) }}</span>
            </td>
            <td class="col-region">{{ sys.region_name }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="!loading && !error && searched && results.length === 0" class="empty-msg">
      {{ t('wh.noResults') }}
    </div>

    <!-- Detail Panel -->
    <div v-if="detail" class="detail-panel">
      <div class="detail-header">
        <h2>{{ detail.solar_system_name }}</h2>
        <span v-if="detail.solar_system_name_zh" class="detail-zh">{{ detail.solar_system_name_zh }}</span>
        <button class="detail-close" @click="detail = null">&times;</button>
      </div>
      <div class="detail-body">
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">{{ t('wh.class') }}</span>
            <span class="class-badge" :class="`wh-c${detail.wormhole_class}`">{{ detail.class_display }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">{{ t('wh.effect') }}</span>
            <span v-if="detail.effect" class="effect-badge">{{ t(`wh.effects.${detail.effect}`) }}</span>
            <span v-else class="no-effect">{{ t('wh.noEffect') }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">{{ t('wh.security') }}</span>
            <span class="security-badge sec-nullsec">{{ detail.security.toFixed(2) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">{{ t('wh.region') }}</span>
            <span>{{ detail.region_name }}</span>
          </div>
        </div>

        <!-- Statics Detail -->
        <div v-if="detail.static_details && detail.static_details.length > 0" class="statics-section">
          <h3>{{ t('wh.statics') }}</h3>
          <table class="statics-table">
            <thead>
              <tr>
                <th>{{ t('wh.designation') }}</th>
                <th>{{ t('wh.targetClass') }}</th>
                <th>{{ t('wh.lifetime') }}</th>
                <th>{{ t('wh.maxMass') }}</th>
                <th>{{ t('wh.maxJumpMass') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in detail.static_details" :key="s.designation">
                <td class="static-designation">{{ s.designation }}</td>
                <td>
                  <span v-if="s.target_class" class="class-badge" :class="`wh-c${s.target_class}`">
                    {{ s.target_class_display }}
                  </span>
                  <span v-else>-</span>
                </td>
                <td>{{ s.max_stable_time ? formatTime(s.max_stable_time) : '-' }}</td>
                <td>{{ s.max_stable_mass ? formatMass(s.max_stable_mass) : '-' }}</td>
                <td>{{ s.max_jump_mass ? formatMass(s.max_jump_mass) : '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else-if="detail.statics.length === 0" class="no-statics-msg">
          {{ t('wh.noStaticsData') }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { searchWormholeSystems, getWormholeSystemDetail } from '../api/wormhole'
import { useI18n } from '../i18n'
import { loadNavigationData, loadWormholeData } from '../data/loader'

const { t } = useI18n()

onMounted(() => Promise.all([loadNavigationData(), loadWormholeData()]))

const query = ref('')
const filterClass = ref(null)
const filterEffect = ref('')
const results = ref([])
const loading = ref(false)
const error = ref('')
const searched = ref(false)
const selectedSystem = ref(null)
const detail = ref(null)

const classOptions = [
  { value: 1, label: 'C1' },
  { value: 2, label: 'C2' },
  { value: 3, label: 'C3' },
  { value: 4, label: 'C4' },
  { value: 5, label: 'C5' },
  { value: 6, label: 'C6' },
  { value: 12, label: 'Thera' },
  { value: 13, label: 'Shattered' },
]

const classChips = classOptions

const effectOptions = [
  'Black Hole',
  'Cataclysmic Variable',
  'Magnetar',
  'Pulsar',
  'Red Giant',
  'Wolf-Rayet',
]

let searchTimer = null

function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(doSearch, 300)
}

async function doSearch() {
  const q = query.value.trim()
  if (!q && filterClass.value == null && !filterEffect.value) {
    results.value = []
    searched.value = false
    return
  }

  loading.value = true
  error.value = ''
  searched.value = true

  try {
    const { data } = await searchWormholeSystems(q, {
      whClass: filterClass.value,
      effect: filterEffect.value || undefined,
    })
    results.value = data.results
  } catch (e) {
    error.value = t('wh.error')
  } finally {
    loading.value = false
  }
}

function toggleClassFilter(value) {
  filterClass.value = filterClass.value === value ? null : value
  onSearch()
}

async function selectSystem(sys) {
  selectedSystem.value = sys
  try {
    const { data } = await getWormholeSystemDetail(sys.solar_system_id)
    detail.value = data
  } catch {
    detail.value = null
  }
}

function formatTime(minutes) {
  const hours = Math.round(minutes / 60)
  return `${hours}h`
}

function formatMass(kg) {
  if (kg >= 1e9) return `${(kg / 1e9).toFixed(1)}B kg`
  if (kg >= 1e6) return `${(kg / 1e6).toFixed(0)}M kg`
  return `${kg.toLocaleString()} kg`
}
</script>

<style scoped>
.wormhole-page {
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

.field-search {
  flex: 2;
  min-width: 200px;
}

.field-class,
.field-effect {
  flex: 1;
  min-width: 140px;
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

.class-chips {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.chip {
  padding: 4px 14px;
  font-size: 0.8em;
  background: #0d0d0d;
  border: 1px solid #2a2a2a;
  border-radius: 16px;
  color: #8a8a8a;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s;
}

.chip:hover {
  border-color: #c8aa6e;
  color: #c8aa6e;
}

.chip.active {
  border-color: #c8aa6e;
  color: #c8aa6e;
  background: rgba(200, 170, 110, 0.1);
}

.loading-msg {
  text-align: center;
  color: #8a8a8a;
  padding: 20px;
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

/* Results Table */
.result-section {
  margin-top: 8px;
}

.wh-table {
  width: 100%;
  background: #1a1a1a;
  border-radius: 8px;
  overflow: hidden;
  border-collapse: collapse;
}

.wh-table th {
  background: rgba(200, 170, 110, 0.08);
  color: #c8aa6e;
  padding: 10px 12px;
  font-size: 0.9em;
  font-weight: 500;
  border-bottom: 1px solid #2a2a2a;
  text-align: left;
}

.wh-table td {
  padding: 8px 12px;
  border-bottom: 1px solid rgba(42, 42, 42, 0.5);
}

.clickable-row {
  cursor: pointer;
  transition: background 0.15s;
}

.clickable-row:hover {
  background: rgba(200, 170, 110, 0.05);
}

.selected-row {
  background: rgba(200, 170, 110, 0.08);
}

.col-name {
  font-weight: 500;
}

.zh-name {
  color: #8a8a8a;
  margin-left: 8px;
  font-size: 0.9em;
  font-weight: 400;
}

.col-class {
  text-align: center;
  width: 80px;
}

.col-effect {
  width: 140px;
}

.col-statics {
  width: 120px;
}

.col-sec {
  text-align: center;
  width: 80px;
}

.col-region {
  color: #8a8a8a;
}

/* Badges */
.class-badge {
  font-size: 0.85em;
  padding: 2px 10px;
  border-radius: 4px;
  font-weight: 600;
}

.wh-c1 { color: #4caf50; background: rgba(76, 175, 80, 0.1); }
.wh-c2 { color: #42a5f5; background: rgba(66, 165, 245, 0.1); }
.wh-c3 { color: #ffca28; background: rgba(255, 202, 40, 0.1); }
.wh-c4 { color: #ff9800; background: rgba(255, 152, 0, 0.1); }
.wh-c5 { color: #ef5350; background: rgba(239, 83, 80, 0.1); }
.wh-c6 { color: #b71c1c; background: rgba(183, 28, 28, 0.15); }
.wh-c12 { color: #ce93d8; background: rgba(206, 147, 216, 0.1); }
.wh-c13 { color: #78909c; background: rgba(120, 144, 156, 0.1); }
.wh-c14, .wh-c15, .wh-c16, .wh-c17, .wh-c18 {
  color: #80cbc4; background: rgba(128, 203, 196, 0.1);
}

.effect-badge {
  font-size: 0.85em;
  color: #ce93d8;
}

.no-effect, .no-statics {
  color: #444;
}

.statics-list {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.static-badge {
  font-size: 0.8em;
  padding: 1px 8px;
  background: rgba(200, 170, 110, 0.1);
  border: 1px solid rgba(200, 170, 110, 0.2);
  border-radius: 4px;
  color: #c8aa6e;
}

.security-badge {
  font-weight: 600;
  font-size: 0.9em;
  padding: 2px 8px;
  border-radius: 4px;
}

.sec-nullsec {
  color: #ef5350;
  background: rgba(239, 83, 80, 0.1);
}

/* Detail Panel */
.detail-panel {
  margin-top: 20px;
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 8px;
  overflow: hidden;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid #2a2a2a;
  background: rgba(200, 170, 110, 0.05);
}

.detail-header h2 {
  color: #c8aa6e;
  font-size: 1.3em;
  margin: 0;
}

.detail-zh {
  color: #8a8a8a;
  font-size: 0.95em;
}

.detail-close {
  margin-left: auto;
  background: none;
  border: none;
  color: #8a8a8a;
  font-size: 1.5em;
  cursor: pointer;
  padding: 0 8px;
  transition: color 0.2s;
}

.detail-close:hover {
  color: #ef5350;
}

.detail-body {
  padding: 20px;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-label {
  font-size: 0.8em;
  color: #8a8a8a;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Statics Detail Table */
.statics-section h3 {
  color: #c8aa6e;
  font-size: 1em;
  margin-bottom: 12px;
}

.statics-table {
  width: 100%;
  border-collapse: collapse;
}

.statics-table th {
  background: rgba(200, 170, 110, 0.05);
  color: #8a8a8a;
  padding: 8px 12px;
  font-size: 0.85em;
  font-weight: 500;
  border-bottom: 1px solid #2a2a2a;
  text-align: left;
}

.statics-table td {
  padding: 8px 12px;
  border-bottom: 1px solid rgba(42, 42, 42, 0.5);
  font-size: 0.9em;
}

.static-designation {
  font-weight: 600;
  color: #c8aa6e;
}

.no-statics-msg {
  color: #555;
  font-size: 0.9em;
  padding: 8px 0;
}
</style>
