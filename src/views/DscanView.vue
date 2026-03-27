<template>
  <div class="dscan">
    <h1 class="title">{{ t('dscan.title') }}</h1>

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

const { t } = useI18n()

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
.dscan {
  padding-top: 20px;
}

.title {
  color: #c8aa6e;
  font-size: 1.8em;
  margin-bottom: 4px;
  text-align: center;
}

.tabs {
  display: flex;
  justify-content: center;
  gap: 4px;
  margin-bottom: 20px;
}

.tab {
  padding: 8px 24px;
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 6px 6px 0 0;
  color: #8a8a8a;
  font-size: 0.9em;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s;
}

.tab:hover {
  color: #c8aa6e;
}

.tab.active {
  color: #c8aa6e;
  border-color: #c8aa6e;
  border-bottom-color: #0d0d0d;
  background: #0d0d0d;
  font-weight: 600;
}

.input-section {
  max-width: 700px;
  margin: 0 auto 20px;
}

.scan-input {
  width: 100%;
  background: #0d0d0d;
  border: 1px solid #2a2a2a;
  border-radius: 6px;
  color: #d0d0d0;
  padding: 10px 14px;
  font-size: 0.95em;
  font-family: inherit;
  resize: vertical;
  box-sizing: border-box;
}

.scan-input::placeholder {
  color: #555;
}

.scan-input:focus {
  outline: none;
  border-color: #c8aa6e;
}

.stat-bar {
  display: flex;
  gap: 20px;
  margin-bottom: 12px;
  padding: 8px 14px;
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 6px;
}

.stat {
  color: #8a8a8a;
  font-size: 0.9em;
}

.stat strong {
  color: #c8aa6e;
  font-size: 1.1em;
}

.result-section {
  overflow-x: auto;
}

.scan-table {
  width: 100%;
  max-width: 700px;
  margin: 0 auto;
  background: #1a1a1a;
  border-radius: 8px;
  overflow: hidden;
  border-collapse: collapse;
}

.scan-table th {
  background: rgba(200, 170, 110, 0.08);
  color: #c8aa6e;
  padding: 10px 12px;
  font-size: 0.85em;
  font-weight: 500;
  border-bottom: 1px solid #2a2a2a;
}

.scan-table td {
  padding: 8px 12px;
  border-bottom: 1px solid rgba(42, 42, 42, 0.5);
  font-size: 0.9em;
}

.col-type {
  text-align: left;
}

.col-num {
  text-align: right;
  white-space: nowrap;
}

.col-rank {
  color: #555;
  width: 40px;
  text-align: center;
}

.sortable {
  cursor: pointer;
  user-select: none;
}

.group-row {
  cursor: pointer;
  transition: background 0.15s;
}

.group-row:hover {
  background: rgba(200, 170, 110, 0.05);
}

.expand-icon {
  color: #555;
  font-size: 0.75em;
  margin-right: 4px;
}

.detail-row td {
  background: rgba(0, 0, 0, 0.2);
  font-size: 0.85em;
}

.detail-name {
  padding-left: 28px !important;
  color: #8a8a8a;
}

.detail-dist {
  color: #555;
}

.no-data {
  text-align: center;
  color: #555;
  padding: 40px;
}
</style>
