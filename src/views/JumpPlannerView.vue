<template>
  <div class="jump-planner">
    <h1 class="title">{{ t('jump.title') }} ({{ serverLabel }})</h1>
    <p class="subtitle">{{ t('jump.subtitle') }}</p>

    <div class="form-section">
      <div class="form-row">
        <div class="field field-system">
          <SystemSearch
            v-model="startSystem"
            :label="t('jump.startLabel')"
            :placeholder="t('jump.startPlaceholder')"
            @select="onStartSelect"
          />
        </div>
        <div class="field field-system">
          <SystemSearch
            v-model="destSystem"
            :label="t('jump.destLabel')"
            :placeholder="t('jump.destPlaceholder')"
            @select="onDestSelect"
          />
        </div>
        <div class="field field-range">
          <label class="field-label">{{ t('jump.rangeLabel') }}</label>
          <input
            v-model.number="jumpRange"
            type="number"
            class="range-input"
            min="1"
            max="15"
            step="0.1"
          />
        </div>
        <div class="field field-btn">
          <button
            class="btn-calculate"
            :disabled="loading || !startSystem.trim() || !destSystem.trim()"
            @click="onCalculate"
          >
            {{ loading ? t('jump.calculating') : t('jump.calculate') }}
          </button>
        </div>
      </div>
      <div class="preset-row">
        <span class="preset-label">{{ t('jump.preset') }}</span>
        <button
          v-for="p in presets"
          :key="p.value"
          class="preset-btn"
          :class="{ active: jumpRange === p.value }"
          @click="jumpRange = p.value"
        >
          {{ p.label }}
        </button>
      </div>

      <!-- Avoid systems list -->
      <div v-if="avoidSystems.length > 0" class="avoid-section">
        <span class="avoid-label">{{ t('jump.avoidLabel') }}</span>
        <span
          v-for="sys in avoidSystems"
          :key="sys.solar_system_id"
          class="avoid-pill"
        >
          {{ sys.solar_system_name_zh || sys.solar_system_name }}
          <button class="avoid-pill-remove" @click="removeAvoid(sys.solar_system_id)">&times;</button>
        </span>
      </div>
    </div>

    <div v-if="error" class="error-msg">{{ error }}</div>

    <!-- Normal route (low/null-sec destination) -->
    <div v-if="routeResult && !routeResult.highsec_destination" class="result-section">
      <div class="route-summary">
        <span class="summary-text">
          <strong>{{ displaySystemName(routeResult.route[0]) }}</strong>
          →
          <strong>{{ displaySystemName(routeResult.route[routeResult.route.length - 1]) }}</strong>:
          <span class="jump-count">{{ routeResult.total_jumps }} {{ t('jump.jumps') }}</span>
          <span class="total-dist">{{ routeResult.total_distance_ly }} {{ t('jump.ly') }}</span>
        </span>
      </div>

      <table class="route-table">
        <thead>
          <tr>
            <th class="col-num">{{ t('jump.colNum') }}</th>
            <th class="col-type">{{ t('jump.colType') }}</th>
            <th>{{ t('jump.colSystem') }}</th>
            <th class="col-sec">{{ t('jump.colSec') }}</th>
            <th class="col-dist">{{ t('jump.colDist') }}</th>
            <th>{{ t('jump.colRegion') }}</th>
            <th class="col-action">{{ t('jump.colAction') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="node in routeResult.route" :key="node.jump_number">
            <td class="col-num">{{ node.jump_number }}</td>
            <td class="col-type">
              <span class="jump-type-badge" :class="`jt-${node.jump_type}`">
                {{ jumpTypeLabel(node.jump_type) }}
              </span>
            </td>
            <td class="col-name">
              <template v-if="node.solar_system_name_zh">{{ node.solar_system_name_zh }} / </template>{{ node.solar_system_name }}
            </td>
            <td class="col-sec">
              <span class="security-badge" :class="`sec-${node.security_class}`">
                {{ node.security.toFixed(1) }}
              </span>
            </td>
            <td class="col-dist">
              <span v-if="node.distance_ly > 0">{{ node.distance_ly.toFixed(2) }} LY</span>
              <span v-else class="start-marker">{{ t('jump.typeStart') }}</span>
            </td>
            <td class="col-region">{{ node.region_name }}</td>
            <td class="col-action">
              <button
                v-if="isMiddleNode(node, routeResult.route)"
                class="btn-avoid"
                @click="addAvoid(node)"
              >
                ✕ {{ t('jump.avoid') }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Highsec destination: two options -->
    <div v-if="routeResult && routeResult.highsec_destination" class="result-section">
      <div class="option-tabs">
        <button
          v-for="(opt, idx) in routeResult.options"
          :key="idx"
          class="option-tab"
          :class="{ active: activeOption === idx }"
          @click="activeOption = idx"
        >
          {{ opt.label }}
        </button>
      </div>

      <div v-if="currentOption" class="option-content">
        <div v-if="currentOption.error" class="error-msg">{{ currentOption.error }}</div>

        <template v-else>
          <div class="route-summary">
            <span class="summary-text">
              <span class="jump-count">{{ t('jump.capitalJumps', { n: currentOption.capital_jumps }) }}</span>
              <span class="total-dist">({{ currentOption.total_distance_ly }} {{ t('jump.ly') }})</span>
              <span class="summary-sep">+</span>
              <span class="gate-count">{{ t('jump.gateJumps', { n: currentOption.gate_jumps }) }}</span>
            </span>
            <div class="option-desc">{{ currentOption.description }}</div>
          </div>

          <table class="route-table">
            <thead>
              <tr>
                <th class="col-num">{{ t('jump.colNum') }}</th>
                <th class="col-type">{{ t('jump.colType') }}</th>
                <th>{{ t('jump.colSystem') }}</th>
                <th class="col-sec">{{ t('jump.colSec') }}</th>
                <th class="col-dist">{{ t('jump.colDist') }}</th>
                <th>{{ t('jump.colRegion') }}</th>
                <th class="col-action">{{ t('jump.colAction') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(node, idx) in mergedRoute" :key="idx" :class="{ 'separator-row': node._separator }">
                <template v-if="node._separator">
                  <td colspan="7" class="separator-cell">{{ t('jump.gateSeparator') }}</td>
                </template>
                <template v-else>
                  <td class="col-num">{{ node._display_num }}</td>
                  <td class="col-type">
                    <span class="jump-type-badge" :class="`jt-${node.jump_type}`">
                      {{ jumpTypeLabel(node.jump_type) }}
                    </span>
                  </td>
                  <td class="col-name">
                    <template v-if="node.solar_system_name_zh">{{ node.solar_system_name_zh }} / </template>{{ node.solar_system_name }}
                  </td>
                  <td class="col-sec">
                    <span class="security-badge" :class="`sec-${node.security_class}`">
                      {{ node.security.toFixed(1) }}
                    </span>
                  </td>
                  <td class="col-dist">
                    <span v-if="node.jump_type === 'capital'">{{ node.distance_ly.toFixed(2) }} LY</span>
                    <span v-else-if="node.jump_type === 'start'" class="start-marker">{{ t('jump.typeStart') }}</span>
                    <span v-else class="gate-marker">{{ t('jump.typeGate') }}</span>
                  </td>
                  <td class="col-region">{{ node.region_name }}</td>
                  <td class="col-action">
                    <button
                      v-if="isMergedMiddleNode(node, idx)"
                      class="btn-avoid"
                      @click="addAvoid(node)"
                    >
                      ✕ {{ t('jump.avoid') }}
                    </button>
                  </td>
                </template>
              </tr>
            </tbody>
          </table>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { calculateRoute } from '../api/navigation'
import SystemSearch from '../components/navigation/SystemSearch.vue'
import { useSettingsStore } from '../stores/settings'
import { useI18n } from '../i18n'
import { loadNavigationData } from '../data/loader'

const settings = useSettingsStore()
const { t, serverLabel } = useI18n()

onMounted(() => loadNavigationData())

const presets = computed(() => [
  { label: `3.5 (${t('jump.presets.dread')})`, value: 3.5 },
  { label: `5.0 (${t('jump.presets.carrier')})`, value: 5.0 },
  { label: `6.5 (${t('jump.presets.super')})`, value: 6.5 },
  { label: `7.0 (${t('jump.presets.jf')})`, value: 7.0 },
  { label: `10.0 (${t('jump.presets.titan')})`, value: 10.0 },
  { label: `15.0 (${t('jump.presets.bowhead')})`, value: 15.0 },
])

const startSystem = ref('')
const destSystem = ref('')
const jumpRange = ref(7.0)
const loading = ref(false)
const error = ref('')
const routeResult = ref(null)
const activeOption = ref(0)
const avoidSystems = ref([])

const currentOption = computed(() => {
  if (!routeResult.value?.highsec_destination) return null
  return routeResult.value.options[activeOption.value] || null
})

const mergedRoute = computed(() => {
  const opt = currentOption.value
  if (!opt || opt.error) return []

  const rows = []
  let num = 0

  // Capital route
  for (const node of opt.capital_route) {
    rows.push({ ...node, _display_num: num++ })
  }

  // Separator
  if (opt.gate_route.length > 0) {
    rows.push({ _separator: true })

    // Gate route
    for (const node of opt.gate_route) {
      rows.push({ ...node, _display_num: num++ })
    }
  }

  return rows
})

function displaySystemName(node) {
  return node.solar_system_name_zh
    ? `${node.solar_system_name_zh} / ${node.solar_system_name}`
    : node.solar_system_name
}

function jumpTypeLabel(type) {
  if (type === 'start') return t('jump.typeStart')
  if (type === 'capital') return t('jump.typeCapital')
  if (type === 'gate') return t('jump.typeGate')
  return type
}

function isMiddleNode(node, route) {
  // Not start (first) or end (last)
  return node.jump_number > 0 && node.jump_number < route.length - 1
}

function isMergedMiddleNode(node, idx) {
  if (node._separator) return false
  // Not the first node (start) and not the last non-separator node
  const nonSepNodes = mergedRoute.value.filter(n => !n._separator)
  const first = nonSepNodes[0]
  const last = nonSepNodes[nonSepNodes.length - 1]
  return node.solar_system_id !== first.solar_system_id
    && node.solar_system_id !== last.solar_system_id
}

function addAvoid(node) {
  if (avoidSystems.value.some(s => s.solar_system_id === node.solar_system_id)) return
  avoidSystems.value.push({
    solar_system_id: node.solar_system_id,
    solar_system_name: node.solar_system_name,
    solar_system_name_zh: node.solar_system_name_zh,
  })
  onCalculate()
}

function removeAvoid(systemId) {
  avoidSystems.value = avoidSystems.value.filter(s => s.solar_system_id !== systemId)
  onCalculate()
}

function onStartSelect(sys) {
  startSystem.value = sys.solar_system_name
}

function onDestSelect(sys) {
  destSystem.value = sys.solar_system_name
}

async function onCalculate() {
  if (!startSystem.value.trim() || !destSystem.value.trim()) return
  loading.value = true
  error.value = ''
  routeResult.value = null
  activeOption.value = 0

  try {
    const { data } = await calculateRoute(
      startSystem.value.trim(),
      destSystem.value.trim(),
      jumpRange.value,
      avoidSystems.value.map(s => s.solar_system_id),
    )
    routeResult.value = data
  } catch (e) {
    error.value = e.response?.data?.error || t('jump.error')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.jump-planner {
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

.field-system {
  flex: 1;
  min-width: 200px;
}

.field-range {
  min-width: 130px;
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

.range-input {
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

.range-input:focus {
  border-color: #c8aa6e;
}

.preset-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.preset-label {
  font-size: 0.85em;
  color: #8a8a8a;
}

.preset-btn {
  padding: 4px 12px;
  font-size: 0.8em;
  background: #0d0d0d;
  border: 1px solid #2a2a2a;
  border-radius: 4px;
  color: #8a8a8a;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s;
}

.preset-btn:hover {
  border-color: #c8aa6e;
  color: #c8aa6e;
}

.preset-btn.active {
  border-color: #c8aa6e;
  color: #c8aa6e;
  background: rgba(200, 170, 110, 0.1);
}

/* Avoid systems section */
.avoid-section {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.avoid-label {
  font-size: 0.85em;
  color: #ef5350;
}

.avoid-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  font-size: 0.8em;
  background: rgba(239, 83, 80, 0.1);
  border: 1px solid rgba(239, 83, 80, 0.3);
  border-radius: 12px;
  color: #ef5350;
}

.avoid-pill-remove {
  background: none;
  border: none;
  color: #ef5350;
  font-size: 1.1em;
  cursor: pointer;
  padding: 0 2px;
  line-height: 1;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.avoid-pill-remove:hover {
  opacity: 1;
}

.btn-calculate {
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

.btn-calculate:hover:not(:disabled) {
  background: #e0c882;
}

.btn-calculate:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-msg {
  text-align: center;
  color: #ef5350;
  margin-bottom: 16px;
}

.result-section {
  margin-top: 8px;
}

/* Option tabs for highsec destination */
.option-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.option-tab {
  flex: 1;
  padding: 10px 20px;
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 8px;
  color: #8a8a8a;
  font-size: 0.95em;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s, background 0.2s;
}

.option-tab:hover {
  border-color: #c8aa6e;
  color: #c8aa6e;
}

.option-tab.active {
  border-color: #c8aa6e;
  color: #c8aa6e;
  background: rgba(200, 170, 110, 0.1);
}

.option-desc {
  color: #8a8a8a;
  font-size: 0.85em;
  margin-top: 4px;
}

.route-summary {
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 8px;
  padding: 16px 20px;
  margin-bottom: 16px;
  text-align: center;
}

.summary-text {
  font-size: 1.1em;
  color: #d0d0d0;
}

.summary-text strong {
  color: #c8aa6e;
}

.jump-count {
  color: #c8aa6e;
  font-weight: 700;
  font-size: 1.15em;
}

.gate-count {
  color: #8a8a8a;
  font-weight: 700;
  font-size: 1.15em;
}

.summary-sep {
  color: #555555;
  margin: 0 8px;
}

.total-dist {
  color: #8a8a8a;
  margin-left: 12px;
  font-size: 0.95em;
}

.route-table {
  width: 100%;
  background: #1a1a1a;
  border-radius: 8px;
  overflow: hidden;
  border-collapse: collapse;
}

.route-table th {
  background: rgba(200, 170, 110, 0.08);
  color: #c8aa6e;
  padding: 10px 12px;
  font-size: 0.9em;
  font-weight: 500;
  border-bottom: 1px solid #2a2a2a;
}

.route-table td {
  padding: 8px 12px;
  border-bottom: 1px solid rgba(42, 42, 42, 0.5);
}

.col-num {
  text-align: center;
  width: 50px;
  color: #555555;
}

.col-type {
  text-align: center;
  width: 70px;
}

.col-name {
  font-weight: 500;
}

.col-sec {
  text-align: center;
  width: 80px;
}

.col-dist {
  text-align: center;
  width: 110px;
  color: #d0d0d0;
}

.col-region {
  color: #8a8a8a;
}

.col-action {
  text-align: center;
  width: 80px;
}

.start-marker {
  color: #555555;
  font-size: 0.85em;
}

.gate-marker {
  color: #555555;
  font-size: 0.85em;
}

/* Avoid button */
.btn-avoid {
  padding: 2px 8px;
  font-size: 0.75em;
  background: transparent;
  border: 1px solid rgba(239, 83, 80, 0.3);
  border-radius: 4px;
  color: #ef5350;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s, border-color 0.2s;
}

.btn-avoid:hover {
  background: rgba(239, 83, 80, 0.1);
  border-color: #ef5350;
}

/* Jump type badges */
.jump-type-badge {
  font-size: 0.8em;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 500;
}

.jt-start {
  color: #555555;
  background: rgba(85, 85, 85, 0.1);
}

.jt-capital {
  color: #c8aa6e;
  background: rgba(200, 170, 110, 0.1);
}

.jt-gate {
  color: #8a8a8a;
  background: rgba(138, 138, 138, 0.1);
}

/* Separator row */
.separator-row td {
  border-bottom: none;
}

.separator-cell {
  text-align: center;
  color: #555555;
  font-size: 0.85em;
  padding: 6px 12px;
  background: rgba(42, 42, 42, 0.3);
  letter-spacing: 2px;
}

.security-badge {
  font-weight: 600;
  font-size: 0.9em;
  padding: 2px 8px;
  border-radius: 4px;
}

.sec-highsec {
  color: #4caf50;
  background: rgba(76, 175, 80, 0.1);
}

.sec-lowsec {
  color: #ff9800;
  background: rgba(255, 152, 0, 0.1);
}

.sec-nullsec {
  color: #ef5350;
  background: rgba(239, 83, 80, 0.1);
}
</style>
