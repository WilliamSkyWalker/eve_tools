<template>
  <div class="dscan">
    <div class="page-head">
      <div class="titles">
        <h1>{{ t('dscan.title') }} <span class="srv-chip gf beta-chip">{{ t('nav.beta') }}</span><PageHelp topic="dscan" /></h1>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button :class="['tab', { active: tab === 'dscan' }]" @click="tab = 'dscan'">{{ t('dscan.tabDscan') }}</button>
      <button :class="['tab', { active: tab === 'local' }]" @click="tab = 'local'">{{ t('dscan.tabLocal') }}</button>
    </div>

    <!-- D-Scan -->
    <template v-if="tab === 'dscan'">
      <div class="input-section">
        <textarea
          v-model="dscanText"
          class="scan-input"
          :placeholder="t('dscan.placeholder')"
          rows="8"
          @input="parseDscan"
          @keydown="handleTabKeydown"
        ></textarea>
      </div>

      <div v-if="dscanGroups.length" class="result-section">
        <div class="stat-bar">
          <span class="stat">{{ t('dscan.total') }}: <strong>{{ dscanTotal }}</strong></span>
          <span class="stat">{{ dscanGroups.length }} {{ t('dscan.type') }}</span>
        </div>

        <table class="scan-table">
          <thead>
            <tr>
              <th class="col-type">{{ t('dscan.type') }}</th>
              <th class="col-num sortable" :class="{ sorted: dscanSort === 'count' }" @click="dscanSort = 'count'">{{ t('dscan.count') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="g in dscanSorted" :key="g.type" @click="toggleExpand(g.type)" class="group-row">
              <td class="col-type">
                <span class="expand-icon">{{ expanded.has(g.type) ? '▼' : '▶' }}</span>
                {{ g.type }}
              </td>
              <td class="col-num">{{ g.count }}</td>
            </tr>
            <template v-for="g in dscanSorted" :key="'d_' + g.type">
              <tr v-if="expanded.has(g.type)" v-for="item in g.items" :key="item.name" class="detail-row">
                <td class="col-type detail-name">{{ item.name }}</td>
                <td class="col-num detail-dist">{{ item.distance }}</td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <div v-else-if="dscanText.trim()" class="no-data">{{ t('dscan.noResult') }}</div>
    </template>

    <!-- Local -->
    <template v-if="tab === 'local'">
      <div class="input-section">
        <textarea
          v-model="localText"
          class="scan-input"
          :placeholder="t('dscan.localPlaceholder')"
          rows="8"
          @input="parseLocal"
          @keydown="handleTabKeydown"
        ></textarea>
      </div>

      <div v-if="localNames.length" class="result-section">
        <div class="stat-bar">
          <span class="stat"><strong>{{ localNames.length }}</strong> {{ t('dscan.players') }}</span>
        </div>

        <table class="scan-table">
          <thead>
            <tr>
              <th>#</th>
              <th>{{ t('dscan.name') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(name, i) in localNames" :key="name">
              <td class="col-rank">{{ i + 1 }}</td>
              <td>{{ name }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else-if="localText.trim()" class="no-data">{{ t('dscan.noResult') }}</div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { useI18n } from '../i18n'
import { useTabInput } from '../composables/useTabInput'
import PageHelp from '../components/layout/PageHelp.vue'

const { t } = useI18n()
const { handleTabKeydown } = useTabInput()

const tab = ref('dscan')

// ── D-Scan ──
const dscanText = ref('')
const dscanGroups = ref([])  // [{ type, count, items: [{ name, distance }] }]
const dscanSort = ref('count')
const expanded = reactive(new Set())

function parseDscan() {
  const groups = {}
  for (const line of dscanText.value.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const parts = trimmed.split('\t')
    if (parts.length < 2) continue
    const itemName = parts[0].trim()
    const typeName = parts[1].trim()
    const distance = parts[2]?.trim() || '-'
    if (!typeName) continue

    if (!groups[typeName]) groups[typeName] = { type: typeName, count: 0, items: [] }
    groups[typeName].count++
    groups[typeName].items.push({ name: itemName, distance })
  }
  dscanGroups.value = Object.values(groups)
  expanded.clear()
}

const dscanTotal = computed(() => dscanGroups.value.reduce((s, g) => s + g.count, 0))

const dscanSorted = computed(() => {
  return [...dscanGroups.value].sort((a, b) => b.count - a.count)
})

function toggleExpand(type) {
  if (expanded.has(type)) expanded.delete(type)
  else expanded.add(type)
}

// ── Local ──
const localText = ref('')
const localNames = ref([])

function parseLocal() {
  const names = []
  for (const line of localText.value.split('\n')) {
    const name = line.trim()
    if (name) names.push(name)
  }
  localNames.value = names
}
</script>

<style scoped>
.beta-chip { font-weight: 600; }

.tabs { display: flex; gap: 4px; margin-bottom: 16px; border-bottom: 1px solid var(--border-default); }
.tab {
  background: none; border: none; border-bottom: 2px solid transparent;
  color: var(--text-muted); padding: 9px 14px; font-size: var(--text-md); font-weight: 500;
  margin-bottom: -1px; transition: color .15s;
}
.tab:hover { color: var(--text-primary); }
.tab.active { color: var(--gold); border-bottom-color: var(--gold); }

.input-section { margin-bottom: 16px; }
.scan-input {
  width: 100%; min-height: 160px; resize: vertical;
  background: var(--bg-input); border: 1px solid var(--border-default);
  border-radius: var(--radius-lg); color: var(--text-primary);
  font-family: var(--font-mono); font-size: var(--text-sm); line-height: 1.7; padding: 11px 13px;
}
.scan-input:focus { outline: none; border-color: var(--gold-line); }

.no-data { text-align: center; color: var(--text-dim); padding: 30px; }

.stat-bar { display: flex; gap: 20px; margin-bottom: 12px; }
.stat { font-size: var(--text-base); color: var(--text-muted); }
.stat strong { color: var(--gold); font-family: var(--font-mono); }

.scan-table {
  width: 100%; border-collapse: collapse;
  border: 1px solid var(--border-default); border-radius: var(--radius-lg); overflow: hidden;
}
.scan-table th {
  text-transform: uppercase; font-size: var(--text-xs); color: var(--text-dim); letter-spacing: 0.03em;
  background: var(--bg-panel-2); padding: 9px 14px; border-bottom: 1px solid var(--border-default); font-weight: 600; text-align: left;
}
.scan-table td { padding: 8px 14px; border-bottom: 1px solid rgba(255, 255, 255, 0.035); font-size: var(--text-base); }
.col-num, th.col-num { text-align: right; font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
th.col-num { font-family: var(--font-sans); }
.col-rank { color: var(--text-dim); width: 40px; font-family: var(--font-mono); }
.sortable { cursor: pointer; user-select: none; }
.sorted { color: var(--gold); }

.group-row { cursor: pointer; }
.group-row:hover { background: rgba(255, 255, 255, 0.03); }
.expand-icon { color: var(--text-dim); font-size: 9px; margin-right: 7px; }
.detail-row td { background: var(--bg-base); font-size: var(--text-sm); }
.detail-name { color: var(--text-muted); padding-left: 32px !important; }
.detail-dist { color: var(--text-dim); }
</style>
