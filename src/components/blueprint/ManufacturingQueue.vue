<template>
  <div class="queue-card card">
    <!-- Add item row -->
    <div class="add-row">
      <div class="search-field">
        <input
          v-model="query"
          type="text"
          :placeholder="t('queue.searchPlaceholder')"
          @input="onInput"
          @focus="showDropdown = results.length > 0"
          @keydown.escape="showDropdown = false"
          class="inp search-input"
        />
        <span v-if="loading" class="spinner"></span>
        <ul v-if="showDropdown && results.length" class="dropdown">
          <li
            v-for="bp in results"
            :key="bp.blueprint_type_id"
            @click="selectBlueprint(bp)"
            class="dropdown-item"
          >
            <span class="dropdown-left">
              <img class="type-icon" :src="typeIcon(bp.product_type_id)" alt="" loading="lazy" @error="onTypeIconError">
              <span class="product-name">{{ bp.product_name }}</span>
            </span>
            <span class="bp-name">{{ bp.blueprint_name }}</span>
          </li>
        </ul>
      </div>
      <div class="field">
        <label>{{ t('queue.me') }}</label>
        <input type="number" v-model.number="meLevel" min="0" max="10" class="inp mini num" />
      </div>
      <div class="field">
        <label>{{ t('queue.runs') }}</label>
        <input type="number" v-model.number="runs" min="1" class="inp mini num" />
      </div>
      <button @click="addItem" class="btn primary" :disabled="!selectedBp">{{ t('queue.add') }}</button>
      <button @click="showImport = true" class="btn ghost">{{ t('queue.import') }}</button>
    </div>

    <!-- Import Modal -->
    <Teleport to="body">
      <div v-if="showImport" class="modal-overlay" @click.self="showImport = false">
        <div class="modal-content" style="max-width:500px">
          <button class="modal-close" @click="showImport = false">&times;</button>
          <h2 class="modal-title">{{ t('queue.importTitle') }}</h2>
          <textarea
            v-model="importText"
            class="ta"
            style="width:100%"
            :placeholder="t('queue.importPlaceholder')"
            rows="10"
            @keydown="handleTabKeydown"
          ></textarea>
          <p v-if="importError" class="import-error">{{ importError }}</p>
          <div class="modal-actions">
            <button class="btn primary" @click="doImport">{{ t('queue.import') }}</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Queue table -->
    <div v-if="items.length" class="table-scroll queue-table-wrap">
      <table class="data-table queue-table">
        <thead>
          <tr>
            <th>{{ t('queue.product') }}</th>
            <th class="r">{{ t('queue.me') }}</th>
            <th class="r">{{ t('queue.runs') }}</th>
            <th class="r">{{ t('queue.action') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, idx) in items" :key="idx">
            <td class="name-cell"><img class="type-icon" :src="typeIcon(item.product_type_id)" alt="" loading="lazy" @error="onTypeIconError"><span class="txt">{{ item.product_name }}</span></td>
            <td class="r">
              <input type="number" :value="item.me_level" @change="updateMe(idx, $event)" min="0" max="10" class="inp mini num inline-input" />
            </td>
            <td class="r">
              <input type="number" :value="item.runs" @change="updateRuns(idx, $event)" min="1" class="inp mini num inline-input" />
            </td>
            <td class="r">
              <button @click="removeItem(idx)" class="btn-remove" :aria-label="t('queue.action')">✕</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="items.length" class="queue-actions">
      <button @click="emitCalculate" class="btn primary">{{ t('queue.calculate') }}</button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { searchBlueprints } from '../../api/blueprints'
import { useI18n } from '../../i18n'
import { useSettingsStore } from '../../stores/settings'
import { resolveItemNames, parseMaterialText } from '../../services/market'
import { getSourceForProduct, getTypeName } from '../../services/calculator'
import { useTabInput } from '../../composables/useTabInput'
import { typeIcon, onTypeIconError } from '../../services/typeIcon'

const { t } = useI18n()
const settings = useSettingsStore()
const { handleTabKeydown } = useTabInput()

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

// product_name is captured at the moment a blueprint is added; relabel each
// queued item when the user toggles the UI language so the table doesn't keep
// showing the previous locale's names.
watch(() => settings.locale, () => {
  for (const item of items.value) {
    item.product_name = getTypeName(item.product_type_id)
  }
})

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

  // Two input formats:
  //   1) Shared plan: "=== 最终产品 ===" sections with "name\tqty\tMEn" lines
  //   2) Inventory paste (any format parseMaterialText accepts: tab-separated EVE
  //      asset/contract dumps, "name x2", "name 100", etc.)
  let productLines = []
  if (text.includes('===')) {
    let inProducts = false
    for (const line of text.split('\n')) {
      const trimmed = line.trim()
      if (/^===.*===/.test(trimmed)) {
        inProducts = /最终产品|Final Product/i.test(trimmed)
        continue
      }
      if (!inProducts || !trimmed) continue
      const m = trimmed.match(/^(.+?)\t(\d+)(?:\tME(\d+))?$/)
      if (m) {
        productLines.push({ name: m[1].trim(), runs: parseInt(m[2]), me: m[3] != null ? parseInt(m[3]) : null })
      }
    }
  }
  if (!productLines.length) {
    productLines = parseMaterialText(text)
      .filter(p => p.quantity != null && p.quantity > 0)
      .map(p => ({ name: p.name, runs: p.quantity, me: null }))
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
.queue-card { padding: 16px; margin-bottom: 20px; }

.add-row { display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; }
.add-row .btn { align-self: flex-end; }

.search-field { position: relative; flex: 1; min-width: 220px; align-self: flex-end; }
.search-input { width: 100%; }

.spinner {
  position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
  width: 14px; height: 14px;
  border: 2px solid var(--border-default); border-top-color: var(--gold);
  border-radius: 50%; animation: spin 0.6s linear infinite;
}
@keyframes spin { to { transform: translateY(-50%) rotate(360deg); } }

.dropdown {
  position: absolute; top: calc(100% + 4px); left: 0; right: 0;
  background: var(--bg-panel);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-pop);
  list-style: none; max-height: 280px; overflow-y: auto; z-index: 100;
  padding: 4px;
}
.dropdown-item {
  padding: 8px 10px; cursor: pointer;
  display: flex; justify-content: space-between; align-items: center; gap: 10px;
  border-radius: var(--radius-sm);
}
.dropdown-item:hover { background: var(--bg-elevated); }
.dropdown-left { display: flex; align-items: center; gap: 8px; min-width: 0; }
.type-icon { width: 24px; height: 24px; flex-shrink: 0; border-radius: 4px; }
.product-name { color: var(--text-primary); font-weight: 500; }
.bp-name { color: var(--text-dim); font-size: 0.8em; white-space: nowrap; }

.queue-table-wrap { margin-top: 16px; margin-bottom: 12px; border: 1px solid var(--border-default); border-radius: var(--radius-md); overflow: hidden; }
.queue-table .type-icon { width: 22px; height: 22px; }
.inline-input { width: 68px; height: 28px; }

.btn-remove {
  background: transparent;
  border: 1px solid var(--red-bg);
  border-radius: var(--radius-sm);
  color: var(--red);
  padding: 3px 9px; font-size: 0.85em;
  transition: background .15s, border-color .15s;
}
.btn-remove:hover { background: var(--red-bg); border-color: var(--red); }

.queue-actions { display: flex; gap: 8px; }
.import-error { color: var(--red); font-size: 0.8em; margin-top: 8px; }
.modal-actions { display: flex; justify-content: flex-end; margin-top: 12px; }
</style>
