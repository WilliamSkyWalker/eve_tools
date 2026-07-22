<template>
  <div class="inventory-toggle">
    <button class="toggle-btn" @click="showInventory = !showInventory">
      {{ showInventory ? '▼' : '▶' }} {{ t('summary.pasteInventory') }}
    </button>
  </div>
  <div v-if="showInventory" class="inventory-section">
    <textarea
      v-model="inventoryText"
      class="inventory-input"
      :placeholder="t('summary.inventoryPlaceholder')"
      rows="5"
      @input="parseInventory"
      @keydown="handleTabKeydown"
    ></textarea>
  </div>
  <table class="summary-table">
    <thead>
      <tr>
        <th>{{ t('summary.rawMaterial') }}</th>
        <th class="num">{{ t('summary.totalQty') }}</th>
        <th v-if="hasInventory" class="num">{{ t('summary.haveQty') }}</th>
        <th v-if="hasInventory" class="num">{{ t('summary.needQty') }}</th>
        <th class="num">{{ t('summary.estPrice') }}</th>
        <th class="num">{{ t('summary.subtotal') }}</th>
      </tr>
      <tr class="total-row">
        <td :colspan="hasInventory ? 5 : 3" class="total-label">{{ t('summary.totalCost') }}</td>
        <td class="num total-value">{{ formatPrice(totalCost) }}</td>
      </tr>
    </thead>
    <tbody>
      <tr v-for="mat in materials" :key="mat.type_id">
        <td class="name-cell"><img class="type-icon" :src="typeIcon(mat.type_id)" alt="" loading="lazy" @error="onTypeIconError"><span class="copyable" @click="copyName(mat.type_name, $event)">{{ mat.type_name }}</span></td>
        <td class="num">{{ formatNumber(mat.total_quantity) }}</td>
        <td v-if="hasInventory" class="num have-qty">{{ formatNumber(getHave(mat.type_name)) }}</td>
        <td v-if="hasInventory" class="num" :class="getNeedClass(mat)">{{ formatNumber(getNeed(mat)) }}</td>
        <td class="num">{{ formatPrice(getPrice(mat.type_id)) }}</td>
        <td class="num highlight">{{ formatPrice(getSubtotal(mat)) }}</td>
      </tr>
    </tbody>
  </table>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from '../../i18n'
import { useTabInput } from '../../composables/useTabInput'
import { typeIcon, onTypeIconError } from '../../services/typeIcon'

const { t } = useI18n()
const { handleTabKeydown } = useTabInput()

const props = defineProps({
  materials: { type: Array, required: true },
  prices: { type: Object, default: () => ({}) },
})

const showInventory = ref(false)
const inventoryText = ref('')
const inventoryMap = ref({}) // type_name -> quantity

function parseInventory() {
  const map = {}
  for (const line of inventoryText.value.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue

    let name, qtyStr
    if (trimmed.includes('\t')) {
      const parts = trimmed.split('\t')
      name = parts[0].trim()
      qtyStr = parts[1]?.trim() || ''
    } else {
      const match = trimmed.match(/^(.+?)\s+([\d,]+(?:\.\d+)?)\s*$/)
      if (match) {
        name = match[1].trim()
        qtyStr = match[2]
      } else {
        name = trimmed
        qtyStr = ''
      }
    }

    const qty = qtyStr ? parseInt(qtyStr.replace(/,/g, '').split('.')[0], 10) : 0
    if (name && !isNaN(qty)) {
      // Accumulate if same name appears multiple times
      map[name] = (map[name] || 0) + qty
    }
  }
  inventoryMap.value = map
}

const hasInventory = computed(() => Object.keys(inventoryMap.value).length > 0)

function getHave(typeName) {
  return inventoryMap.value[typeName] || 0
}

function getNeed(mat) {
  const have = getHave(mat.type_name)
  return Math.max(0, mat.total_quantity - have)
}

function getNeedClass(mat) {
  const need = getNeed(mat)
  if (need === 0) return 'need-zero'
  return 'need-short'
}

function getPrice(typeId) {
  const p = props.prices[typeId]
  return p?.adjusted_price ?? p?.average_price ?? null
}

function getSubtotal(mat) {
  const price = getPrice(mat.type_id)
  if (price == null) return null
  return mat.total_quantity * price
}

const totalCost = computed(() => {
  let total = 0
  let hasAny = false
  for (const mat of props.materials) {
    const sub = getSubtotal(mat)
    if (sub != null) {
      total += sub
      hasAny = true
    }
  }
  return hasAny ? total : null
})

function clearCopied() {
  const prev = document.querySelector('.copyable.copied')
  if (prev) prev.classList.remove('copied')
}

function copyName(name, e) {
  e.stopPropagation()
  navigator.clipboard.writeText(name)
  clearCopied()
  const el = e?.target
  if (el) {
    el.setAttribute('data-copied-tip', t('industry.copied'))
    el.classList.add('copied')
  }
}

function formatNumber(n) {
  return n != null ? n.toLocaleString() : '-'
}

function formatPrice(n) {
  if (n == null) return '-'
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ISK'
}
</script>

<style scoped>
.inventory-toggle {
  margin-bottom: 10px;
}

.toggle-btn {
  background: none;
  border: 1px solid var(--border-default);
  border-radius: 6px;
  color: var(--text-muted);
  padding: 6px 14px;
  font-size: 0.85em;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s;
}

.toggle-btn:hover {
  color: var(--gold);
  border-color: var(--gold);
}

.inventory-section {
  margin-bottom: 12px;
}

.inventory-input {
  width: 100%;
  background: var(--bg-input);
  border: 1px solid var(--border-default);
  border-radius: 6px;
  color: var(--text-primary);
  padding: 10px 14px;
  font-size: 0.9em;
  font-family: inherit;
  resize: vertical;
  box-sizing: border-box;
}

.inventory-input::placeholder {
  color: var(--text-dim);
}

.inventory-input:focus {
  outline: none;
  border-color: var(--gold);
}

.have-qty {
  color: var(--text-muted);
}

.need-zero {
  color: var(--green);
  font-weight: 600;
}

.need-short {
  color: var(--orange);
  font-weight: 600;
}

.summary-table {
  background: var(--bg-panel);
  border-radius: 8px;
  overflow: hidden;
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

.num {
  text-align: right;
}

.highlight {
  color: var(--gold);
}

.total-row td {
  border-bottom: 2px solid var(--border-default);
  background: var(--gold-bg-light);
}

.total-label {
  text-align: right;
  font-weight: 700;
  color: var(--gold);
}

.total-value {
  font-weight: 700;
  color: var(--green);
  font-size: 1.05em;
}
</style>
