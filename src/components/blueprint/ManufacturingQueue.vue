<template>
  <div class="queue-container">
    <!-- Add item row -->
    <div class="add-row">
      <div class="search-field">
        <div class="search-box">
          <input
            v-model="query"
            type="text"
            :placeholder="t('queue.searchPlaceholder')"
            @input="onInput"
            @focus="showDropdown = results.length > 0"
            @keydown.escape="showDropdown = false"
            class="search-input"
          />
          <span v-if="loading" class="spinner"></span>
        </div>
        <ul v-if="showDropdown && results.length" class="dropdown">
          <li
            v-for="bp in results"
            :key="bp.blueprint_type_id"
            @click="selectBlueprint(bp)"
            class="dropdown-item"
          >
            <span class="dropdown-left">
              <img class="type-icon" :src="`https://images.evetech.net/types/${bp.product_type_id}/icon?size=32`" alt="" loading="lazy">
              <span class="product-name">{{ bp.product_name }}</span>
            </span>
            <span class="bp-name">{{ bp.blueprint_name }}</span>
          </li>
        </ul>
      </div>
      <div class="field">
        <label>{{ t('queue.me') }}</label>
        <input type="number" v-model.number="meLevel" min="0" max="10" class="small-input" />
      </div>
      <div class="field">
        <label>{{ t('queue.runs') }}</label>
        <input type="number" v-model.number="runs" min="1" class="small-input" />
      </div>
      <button @click="addItem" class="btn btn-add" :disabled="!selectedBp">{{ t('queue.add') }}</button>
      <button @click="showImport = true" class="btn btn-import">{{ t('queue.import') }}</button>
    </div>

    <!-- Import Modal -->
    <Teleport to="body">
      <div v-if="showImport" class="modal-overlay" @click.self="showImport = false">
        <div class="modal-content">
          <button class="modal-close" @click="showImport = false">&times;</button>
          <h2 class="modal-title">{{ t('queue.importTitle') }}</h2>
          <textarea
            v-model="importText"
            class="import-textarea"
            :placeholder="t('queue.importPlaceholder')"
            rows="10"
          ></textarea>
          <p v-if="importError" class="import-error">{{ importError }}</p>
          <div class="modal-actions">
            <button class="btn btn-primary" @click="doImport">{{ t('queue.import') }}</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Queue table -->
    <table v-if="items.length" class="queue-table">
      <thead>
        <tr>
          <th>{{ t('queue.product') }}</th>
          <th class="num">{{ t('queue.me') }}</th>
          <th class="num">{{ t('queue.runs') }}</th>
          <th>{{ t('queue.action') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(item, idx) in items" :key="idx">
          <td class="name-cell"><img class="type-icon" :src="`https://images.evetech.net/types/${item.product_type_id}/icon?size=32`" alt="" loading="lazy">{{ item.product_name }}</td>
          <td class="num">
            <input
              type="number"
              :value="item.me_level"
              @change="updateMe(idx, $event)"
              min="0"
              max="10"
              class="inline-input"
            />
          </td>
          <td class="num">
            <input
              type="number"
              :value="item.runs"
              @change="updateRuns(idx, $event)"
              min="1"
              class="inline-input"
            />
          </td>
          <td>
            <button @click="removeItem(idx)" class="btn-remove">✕</button>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-if="items.length" class="queue-actions">
      <button @click="emitCalculate" class="btn btn-primary">{{ t('queue.calculate') }}</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { searchBlueprints } from '../../api/blueprints'
import { useI18n } from '../../i18n'
import { resolveItemNames } from '../../services/market'
import { getSourceForProduct, getTypeName } from '../../services/calculator'

const { t } = useI18n()

const emit = defineEmits(['calculate'])

const query = ref('')
const results = ref([])
const showDropdown = ref(false)
const loading = ref(false)
const selectedBp = ref(null)
const meLevel = ref(0)
const runs = ref(1)
const items = ref([])
let debounceTimer = null

function onInput() {
  selectedBp.value = null
  clearTimeout(debounceTimer)
  if (query.value.trim().length < 2) {
    results.value = []
    showDropdown.value = false
    return
  }
  debounceTimer = setTimeout(async () => {
    loading.value = true
    try {
      const { data } = await searchBlueprints(query.value.trim())
      results.value = data.results
      showDropdown.value = results.value.length > 0
    } finally {
      loading.value = false
    }
  }, 300)
}

function selectBlueprint(bp) {
  selectedBp.value = bp
  query.value = bp.product_name
  showDropdown.value = false
}

function addItem() {
  if (!selectedBp.value) return
  items.value.push({
    blueprint_type_id: selectedBp.value.blueprint_type_id,
    product_name: selectedBp.value.product_name,
    product_type_id: selectedBp.value.product_type_id,
    product_quantity: 1,
    me_level: meLevel.value,
    runs: runs.value,
  })
  query.value = ''
  selectedBp.value = null
  runs.value = 1
}

function removeItem(idx) {
  items.value.splice(idx, 1)
}

function updateMe(idx, event) {
  const val = parseInt(event.target.value)
  if (val >= 0 && val <= 10) {
    items.value[idx].me_level = val
  }
}

function updateRuns(idx, event) {
  const val = parseInt(event.target.value)
  if (val >= 1) {
    items.value[idx].runs = val
  }
}

// ── Import ──
const showImport = ref(false)
const importText = ref('')
const importError = ref('')

function doImport() {
  importError.value = ''
  const text = importText.value.trim()
  if (!text) return

  // Parse: extract product lines from shared plan or plain "name\tqty" format
  const productLines = []
  const lines = text.split('\n')
  let inProducts = false
  for (const line of lines) {
    const trimmed = line.trim()
    if (/^===.*===/.test(trimmed)) {
      // Section header — check if it's the products section
      inProducts = /最终产品|Final Product/i.test(trimmed)
      continue
    }
    if (inProducts && trimmed === '') { inProducts = false; continue }
    // If we're in products section, or if there's no section headers at all (plain format)
    const target = inProducts ? trimmed : (text.includes('===') ? null : trimmed)
    if (!target) continue
    // Parse "name\tqty\tMEn" or "name\tqty" or "name qty"
    const tabMatch = target.match(/^(.+?)\t(\d+)(?:\tME(\d+))?$/)
    if (tabMatch) {
      productLines.push({ name: tabMatch[1].trim(), runs: parseInt(tabMatch[2]), me: tabMatch[3] != null ? parseInt(tabMatch[3]) : null })
    } else {
      const spaceMatch = target.match(/^(.+?)\s+(\d+)$/)
      if (spaceMatch) {
        productLines.push({ name: spaceMatch[1].trim(), runs: parseInt(spaceMatch[2]), me: null })
      }
    }
  }

  if (!productLines.length) {
    importError.value = t('queue.importError')
    return
  }

  // Resolve names to type_ids and blueprint_ids
  const resolved = resolveItemNames(productLines.map(p => p.name))
  const newItems = []
  const errors = []
  for (let i = 0; i < resolved.length; i++) {
    if (!resolved[i].matched) {
      errors.push(productLines[i].name)
      continue
    }
    const typeId = resolved[i].type_id
    const source = getSourceForProduct(typeId)
    if (!source) {
      errors.push(productLines[i].name)
      continue
    }
    newItems.push({
      blueprint_type_id: source.bpTypeId,
      product_name: getTypeName(typeId),
      product_type_id: typeId,
      product_quantity: 1,
      me_level: productLines[i].me ?? meLevel.value,
      runs: productLines[i].runs,
    })
  }

  if (errors.length) {
    importError.value = `${t('queue.importError')}: ${errors.join(', ')}`
  }

  if (newItems.length) {
    items.value = newItems
    showImport.value = false
    importText.value = ''
    emitCalculate()
  }
}

function emitCalculate() {
  emit('calculate', items.value.map(item => ({
    blueprint_type_id: item.blueprint_type_id,
    product_type_id: item.product_type_id,
    product_name: item.product_name,
    me_level: item.me_level,
    runs: item.runs,
  })))
}


</script>

<style scoped>
.queue-container {
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}

.add-row {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.search-field {
  position: relative;
  flex: 1;
  min-width: 200px;
}

.search-box {
  position: relative;
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  font-size: 0.9em;
  background: #0d0d0d;
  border: 1px solid #2a2a2a;
  border-radius: 6px;
  color: #d0d0d0;
  outline: none;
}

.search-input:focus {
  border-color: #c8aa6e;
}

.search-input::placeholder {
  color: #555555;
}

.spinner {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  width: 14px;
  height: 14px;
  border: 2px solid #2a2a2a;
  border-top-color: #c8aa6e;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: translateY(-50%) rotate(360deg); }
}

.dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-top: none;
  border-radius: 0 0 6px 6px;
  list-style: none;
  max-height: 250px;
  overflow-y: auto;
  z-index: 100;
}

.dropdown-item {
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #2a2a2a;
}

.dropdown-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.type-icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  border-radius: 3px;
}

.name-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}

.dropdown-item:hover {
  background: #222222;
}

.dropdown-item:last-child {
  border-bottom: none;
}

.product-name {
  color: #d0d0d0;
  font-weight: 500;
}

.bp-name {
  color: #555555;
  font-size: 0.8em;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field label {
  font-size: 0.8em;
  color: #8a8a8a;
}

.small-input {
  width: 70px;
  padding: 8px 8px;
  background: #0d0d0d;
  border: 1px solid #2a2a2a;
  border-radius: 6px;
  color: #d0d0d0;
  outline: none;
  text-align: center;
}

.small-input:focus {
  border-color: #c8aa6e;
}

.btn-add {
  padding: 8px 20px;
  background: #2a2a2a;
  color: #d0d0d0;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-add:hover:not(:disabled) {
  background: #3a3a3a;
}

.btn-add:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.queue-table {
  background: #0d0d0d;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 12px;
}

.queue-table th {
  background: rgba(200, 170, 110, 0.08);
}

.num {
  text-align: right;
}

.inline-input {
  width: 70px;
  padding: 3px 6px;
  background: #0d0d0d;
  border: 1px solid #2a2a2a;
  border-radius: 4px;
  color: #d0d0d0;
  text-align: right;
  outline: none;
}

.inline-input:focus {
  border-color: #c8aa6e;
}

.btn-remove {
  background: transparent;
  border: 1px solid rgba(239, 83, 80, 0.3);
  border-radius: 3px;
  color: #ef5350;
  cursor: pointer;
  padding: 2px 8px;
  font-size: 0.85em;
  transition: all 0.2s;
}

.btn-remove:hover {
  background: rgba(255, 82, 82, 0.1);
  border-color: #ef5350;
}

.queue-actions {
  display: flex;
  gap: 8px;
}

.btn-primary {
  padding: 10px 24px;
  background: #c8aa6e;
  color: #0d0d0d;
  border: none;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover {
  background: #e0c882;
}

.btn-import {
  padding: 8px 16px;
  background: none;
  color: #8a8a8a;
  border: 1px solid #2a2a2a;
  border-radius: 6px;
  font-size: 0.85em;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-import:hover {
  border-color: #c8aa6e;
  color: #c8aa6e;
}

/* ── Import Modal ── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 12px;
  padding: 24px 28px;
  max-width: 500px;
  width: 90%;
  position: relative;
}

.modal-close {
  position: absolute;
  top: 10px;
  right: 14px;
  background: none;
  border: none;
  color: #555;
  font-size: 1.5em;
  cursor: pointer;
  transition: color 0.2s;
}

.modal-close:hover {
  color: #c8aa6e;
}

.modal-title {
  color: #c8aa6e;
  font-size: 1.1em;
  margin-bottom: 12px;
}

.import-textarea {
  width: 100%;
  padding: 10px;
  background: #0d0d0d;
  border: 1px solid #2a2a2a;
  border-radius: 6px;
  color: #d0d0d0;
  font-size: 0.85em;
  resize: vertical;
  outline: none;
  box-sizing: border-box;
}

.import-textarea:focus {
  border-color: #c8aa6e;
}

.import-error {
  color: #ef5350;
  font-size: 0.8em;
  margin-top: 8px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
</style>
