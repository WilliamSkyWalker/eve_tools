<template>
  <div class="wormhole-page">
    <div class="page-head">
      <div class="titles">
        <h1>{{ t('wh.title') }} <span class="srv-chip gf beta-chip">{{ t('nav.beta') }}</span></h1>
        <p class="sub">{{ t('wh.subtitle') }}</p>
      </div>
    </div>

    <!-- Search & filters -->
    <div class="card filter-card">
      <div class="filter-row">
        <div class="field field-search">
          <label>{{ t('wh.searchLabel') }}</label>
          <input v-model="query" type="text" class="inp" :placeholder="t('wh.searchPlaceholder')" @input="onSearch" />
        </div>
        <div class="field">
          <label>{{ t('wh.class') }}</label>
          <select v-model="filterClass" class="sel" @change="onSearch">
            <option :value="null">{{ t('wh.allClasses') }}</option>
            <option v-for="c in classOptions" :key="c.value" :value="c.value">{{ c.label }}</option>
          </select>
        </div>
        <div class="field">
          <label>{{ t('wh.effect') }}</label>
          <select v-model="filterEffect" class="sel" @change="onSearch">
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
        >{{ c.label }}</button>
      </div>
    </div>

    <div v-if="loading" class="state-msg">{{ t('wh.loading') }}</div>
    <div v-if="error" class="state-msg error-text">{{ error }}</div>

    <!-- Results -->
    <div v-if="results.length > 0" class="card table-scroll results-card">
      <table class="data-table wh-table">
        <thead>
          <tr>
            <th>{{ t('wh.colName') }}</th>
            <th class="c col-class">{{ t('wh.class') }}</th>
            <th class="col-effect">{{ t('wh.effect') }}</th>
            <th class="col-statics">{{ t('wh.statics') }}</th>
            <th class="c col-sec">{{ t('wh.security') }}</th>
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
              <span class="sys-name">{{ sys.solar_system_name }}</span>
              <span v-if="sys.solar_system_name_zh" class="zh-name">{{ sys.solar_system_name_zh }}</span>
            </td>
            <td class="c col-class">
              <span class="class-badge" :class="`wh-c${sys.wormhole_class}`">{{ sys.class_display }}</span>
            </td>
            <td class="col-effect">
              <span v-if="sys.effect" class="effect-badge">{{ t(`wh.effects.${sys.effect}`) }}</span>
              <span v-else class="t-dim">—</span>
            </td>
            <td class="col-statics">
              <span v-if="sys.statics.length > 0" class="statics-list">
                <span v-for="s in sys.statics" :key="s" class="static-badge">{{ s }}</span>
              </span>
              <span v-else class="t-dim">—</span>
            </td>
            <td class="c col-sec"><span class="num sec-badge">{{ sys.security.toFixed(2) }}</span></td>
            <td class="t-muted col-region">{{ sys.region_name }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="!loading && !error && searched && results.length === 0" class="state-msg">
      {{ t('wh.noResults') }}
    </div>

    <!-- Detail panel -->
    <div v-if="detail" class="card detail-panel">
      <div class="detail-header">
        <h2>{{ detail.solar_system_name }}</h2>
        <span v-if="detail.solar_system_name_zh" class="detail-zh">{{ detail.solar_system_name_zh }}</span>
        <button class="modal-close" style="position:static;margin-left:auto" @click="detail = null">&times;</button>
      </div>
      <div class="detail-body">
        <div class="detail-grid">
          <div class="detail-item">
            <span class="eyebrow">{{ t('wh.class') }}</span>
            <span class="class-badge" :class="`wh-c${detail.wormhole_class}`">{{ detail.class_display }}</span>
          </div>
          <div class="detail-item">
            <span class="eyebrow">{{ t('wh.effect') }}</span>
            <span v-if="detail.effect" class="effect-badge">{{ t(`wh.effects.${detail.effect}`) }}</span>
            <span v-else class="t-dim">{{ t('wh.noEffect') }}</span>
          </div>
          <div class="detail-item">
            <span class="eyebrow">{{ t('wh.security') }}</span>
            <span class="num sec-badge">{{ detail.security.toFixed(2) }}</span>
          </div>
          <div class="detail-item">
            <span class="eyebrow">{{ t('wh.region') }}</span>
            <span>{{ detail.region_name }}</span>
          </div>
        </div>

        <div v-if="detail.effect_details && detail.effect_details.length > 0" class="detail-section">
          <h3>{{ t('wh.effectBeacon') }}</h3>
          <div class="table-scroll">
            <table class="data-table">
              <tbody>
                <tr v-for="ed in detail.effect_details" :key="ed.attr">
                  <td class="t-muted">{{ t(`wh.attr.${ed.attr}`) }}</td>
                  <td class="r num" :class="ed.value >= 1 ? 't-green' : 't-red'">{{ formatMultiplier(ed.value) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-if="detail.static_details && detail.static_details.length > 0" class="detail-section">
          <h3>{{ t('wh.statics') }}</h3>
          <div class="table-scroll">
            <table class="data-table">
              <thead>
                <tr>
                  <th>{{ t('wh.designation') }}</th>
                  <th class="c">{{ t('wh.targetClass') }}</th>
                  <th class="r">{{ t('wh.lifetime') }}</th>
                  <th class="r">{{ t('wh.maxMass') }}</th>
                  <th class="r">{{ t('wh.maxJumpMass') }}</th>
                  <th class="r">{{ t('wh.massRegen') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="s in detail.static_details" :key="s.designation">
                  <td><span class="static-badge">{{ s.designation }}</span></td>
                  <td class="c">
                    <span v-if="s.target_class" class="class-badge" :class="`wh-c${s.target_class}`">{{ s.target_class_display }}</span>
                    <span v-else class="t-dim">—</span>
                  </td>
                  <td class="r num t-muted">{{ s.max_stable_time ? formatTime(s.max_stable_time) : '—' }}</td>
                  <td class="r num t-muted">{{ s.max_stable_mass ? formatMass(s.max_stable_mass) : '—' }}</td>
                  <td class="r num t-muted">{{ s.max_jump_mass ? formatMass(s.max_jump_mass) : '—' }}</td>
                  <td class="r num t-muted">{{ s.mass_regen ? formatMass(s.mass_regen) + '/h' : '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div v-else-if="detail.statics.length === 0" class="state-msg" style="padding:14px 0">
          {{ t('wh.noStaticsData') }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { onMounted } from 'vue'
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

function formatMultiplier(value) {
  return `${value.toFixed(2)}×`
}
</script>

<style scoped>
.filter-card { padding: 16px; margin-bottom: 16px; }
.filter-row { display: flex; align-items: flex-end; gap: 14px; flex-wrap: wrap; }
.field-search { flex: 2; min-width: 220px; }
.filter-row .field { flex: 1; min-width: 150px; }
.filter-row .inp, .filter-row .sel { width: 100%; }

.class-chips { display: flex; gap: 8px; margin-top: 14px; flex-wrap: wrap; }
.chip {
  padding: 4px 14px;
  font-size: var(--text-sm);
  background: var(--bg-input);
  border: 1px solid var(--border-default);
  border-radius: 16px;
  color: var(--text-muted);
  transition: border-color .15s, color .15s, background .15s;
}
.chip:hover { border-color: var(--gold-line); color: var(--text-primary); }
.chip.active { border-color: var(--gold-line); color: var(--gold); background: var(--gold-bg); }

.beta-chip { font-weight: 600; }

.results-card { margin-bottom: 16px; }
.clickable-row { cursor: pointer; }
.selected-row, .selected-row:hover { background: var(--gold-bg) !important; }
.col-name { min-width: 150px; }
.sys-name { font-weight: 500; }
.zh-name { color: var(--text-muted); margin-left: 8px; font-size: 0.9em; }
.col-class { width: 80px; }
.col-effect { width: 130px; }
.col-statics { width: 130px; }
.col-sec { width: 70px; }

.class-badge { font-size: 0.82em; padding: 2px 9px; border-radius: 4px; font-weight: 700; display: inline-block; }
.wh-c1 { color: var(--green); background: var(--green-bg); }
.wh-c2 { color: var(--blue); background: var(--blue-bg); }
.wh-c3 { color: #ffca57; background: rgba(255, 202, 87, 0.12); }
.wh-c4 { color: var(--orange); background: var(--orange-bg); }
.wh-c5 { color: var(--red); background: var(--red-bg); }
.wh-c6 { color: #ff7b7b; background: rgba(255, 90, 90, 0.16); }
.wh-c12 { color: var(--purple); background: var(--purple-bg); }
.wh-c13 { color: #90a4b0; background: rgba(144, 164, 176, 0.12); }
.wh-c14, .wh-c15, .wh-c16, .wh-c17, .wh-c18 { color: #80cbc4; background: rgba(128, 203, 196, 0.12); }

.effect-badge { font-size: 0.85em; color: var(--purple); }
.statics-list { display: flex; gap: 4px; flex-wrap: wrap; }
.static-badge {
  font-size: 0.8em;
  padding: 1px 8px;
  background: var(--gold-bg);
  border: 1px solid var(--gold-line);
  border-radius: 4px;
  color: var(--gold);
  font-weight: 600;
}
.sec-badge { color: var(--red); font-weight: 600; }

/* Detail panel */
.detail-panel { overflow: hidden; }
.detail-header {
  display: flex; align-items: center; gap: 12px;
  padding: 15px 18px; border-bottom: 1px solid var(--border-default);
  background: var(--gold-bg-light);
}
.detail-header h2 { color: var(--gold); font-size: 1.25em; margin: 0; }
.detail-zh { color: var(--text-muted); font-size: 0.95em; }
.detail-body { padding: 18px; }
.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  margin-bottom: 22px;
}
.detail-item { display: flex; flex-direction: column; gap: 6px; align-items: flex-start; }
.detail-section { margin-bottom: 22px; }
.detail-section:last-child { margin-bottom: 0; }
.detail-section h3 { color: var(--text-primary); font-size: 0.95em; margin-bottom: 10px; font-weight: 600; }
.detail-section .data-table { border: 1px solid var(--border-default); border-radius: var(--radius-md); overflow: hidden; }

@media (max-width: 640px) {
  .zh-name { display: block; margin-left: 0; }
}
</style>
