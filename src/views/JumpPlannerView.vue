<template>
  <div class="jump-planner">
    <div class="page-head">
      <div class="titles">
        <h1>{{ t('jump.title') }} <span class="srv-chip" :class="settings.server">{{ serverLabel }}</span><PageHelp topic="jump" /></h1>
        <p class="sub">{{ t('jump.subtitle') }}</p>
      </div>
    </div>

    <div class="card form-section">
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
import PageHelp from '../components/layout/PageHelp.vue'

const settings = useSettingsStore()
const { t, serverLabel } = useI18n()

onMounted(() => loadNavigationData())

// Base jump range × JDC V (20%/level × 5 = ×2.0)
// Super/Titan base 3.0→6.0, Dread/Carrier/FAX base 3.5→7.0, Blops base 4.0→8.0, JF/Rorqual base 5.0→10.0
const presets = computed(() => [
  { label: `6.0 (${t('jump.presets.super')}/${t('jump.presets.titan')})`, value: 6.0 },
  { label: `7.0 (${t('jump.presets.dread')}/${t('jump.presets.carrier')})`, value: 7.0 },
  { label: `8.0 (${t('jump.presets.blops')})`, value: 8.0 },
  { label: `10.0 (${t('jump.presets.jf')})`, value: 10.0 },
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
.form-section { padding: 16px; margin-bottom: 16px; }
.form-row { display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; }
.field-system { flex: 1; min-width: 220px; }
.field-label { display: block; font-size: var(--text-xs); text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-dim); margin-bottom: 4px; }
.range-input {
  width: 100px; height: 34px; text-align: center;
  background: var(--bg-input); border: 1px solid var(--border-default);
  border-radius: var(--radius-md); color: var(--text-primary); font-family: var(--font-mono);
}
.range-input:focus { outline: none; border-color: var(--gold-line); }
.btn-calculate {
  height: 34px; padding: 0 22px; border: none; border-radius: var(--radius-md);
  background: var(--gold); color: var(--gold-ink); font-weight: 650; font-size: var(--text-base);
  transition: background .15s;
}
.btn-calculate:hover:not(:disabled) { background: var(--gold-hover); }
.btn-calculate:disabled { opacity: .45; cursor: not-allowed; }

.preset-row { display: flex; align-items: center; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
.preset-label { font-size: var(--text-sm); color: var(--text-muted); }
.preset-btn {
  padding: 4px 13px; font-size: var(--text-sm);
  background: var(--bg-input); border: 1px solid var(--border-default); border-radius: 16px; color: var(--text-muted);
  transition: color .15s, border-color .15s, background .15s;
}
.preset-btn:hover { color: var(--text-primary); border-color: var(--border-strong); }
.preset-btn.active { color: var(--gold); border-color: var(--gold-line); background: var(--gold-bg); }

.avoid-section { display: flex; align-items: center; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
.avoid-label { font-size: var(--text-sm); color: var(--text-muted); }
.avoid-pill {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: var(--text-sm); padding: 2px 6px 2px 11px;
  background: var(--red-bg); border: 1px solid rgba(229, 89, 92, 0.3); border-radius: 14px; color: var(--red);
}
.avoid-pill-remove { background: none; border: none; color: inherit; font-size: 1.15em; line-height: 1; padding: 0; }

.error-msg { color: var(--red); margin-bottom: 12px; }
.result-section { margin-top: 16px; }
.route-summary { margin-bottom: 12px; padding: 12px 16px; background: var(--bg-panel); border: 1px solid var(--border-default); border-radius: var(--radius-lg); }
.summary-text { font-size: var(--text-md); }
.summary-text strong { color: var(--text-primary); }
.jump-count { color: var(--gold); margin-left: 8px; font-family: var(--font-mono); }
.total-dist { color: var(--text-muted); margin-left: 8px; font-family: var(--font-mono); }
.summary-sep { margin: 0 8px; color: var(--text-dim); }
.gate-count { color: var(--blue); font-family: var(--font-mono); }
.option-desc { color: var(--text-muted); font-size: var(--text-sm); margin-top: 6px; }

.option-tabs { display: flex; gap: 4px; margin-bottom: 12px; border-bottom: 1px solid var(--border-default); }
.option-tab { background: none; border: none; border-bottom: 2px solid transparent; color: var(--text-muted); padding: 9px 14px; font-weight: 500; margin-bottom: -1px; transition: color .15s; }
.option-tab:hover { color: var(--text-primary); }
.option-tab.active { color: var(--gold); border-bottom-color: var(--gold); }

.route-table {
  width: 100%; border-collapse: collapse;
  border: 1px solid var(--border-default); border-radius: var(--radius-lg); overflow: hidden;
}
.route-table th {
  text-transform: uppercase; font-size: var(--text-xs); color: var(--text-dim); letter-spacing: 0.03em;
  background: var(--bg-panel-2); padding: 9px 12px; border-bottom: 1px solid var(--border-default); font-weight: 600; text-align: left;
}
.route-table td { padding: 8px 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.035); font-size: var(--text-base); }
.route-table tbody tr:hover { background: rgba(255, 255, 255, 0.025); }
.col-num { width: 46px; text-align: center; color: var(--text-dim); font-family: var(--font-mono); }
.col-sec, .col-dist { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
.col-dist { text-align: right; }
.col-region { color: var(--text-muted); }
.col-action { text-align: right; }
.btn-avoid {
  background: none; border: 1px solid var(--border-default); border-radius: var(--radius-sm);
  color: var(--text-muted); padding: 2px 9px; font-size: var(--text-sm); transition: color .15s, border-color .15s;
}
.btn-avoid:hover { color: var(--red); border-color: rgba(229, 89, 92, 0.4); }
.start-marker, .gate-marker { color: var(--text-dim); }

.jump-type-badge { font-size: 0.8em; padding: 2px 8px; border-radius: 4px; font-weight: 600; }
.jt-start { color: var(--text-dim); background: rgba(120, 120, 120, 0.12); }
.jt-capital { color: var(--gold); background: var(--gold-bg); }
.jt-gate { color: var(--text-muted); background: rgba(138, 138, 138, 0.12); }

.separator-row td { border-bottom: none; }
.separator-cell { text-align: center; color: var(--text-dim); font-size: 0.85em; padding: 6px 12px; background: var(--bg-panel-2); letter-spacing: 2px; }

.security-badge { font-weight: 600; font-size: 0.9em; padding: 2px 8px; border-radius: 4px; font-family: var(--font-mono); }
.sec-highsec { color: var(--green); background: var(--green-bg); }
.sec-lowsec { color: var(--orange); background: var(--orange-bg); }
.sec-nullsec { color: var(--red); background: var(--red-bg); }
</style>
