<template>
  <div class="detail-overlay" @click.self="$emit('close')">
    <div class="detail-panel">
      <div class="panel-header">
        <div class="mod-title">
          <img class="type-icon" :src="typeIcon(typeId)" alt="" loading="lazy" @error="onTypeIconError">
          <span class="mod-name">{{ displayName }}</span>
        </div>
        <button class="close-btn" @click="$emit('close')">&times;</button>
      </div>

      <div v-if="offline" class="offline-note">{{ t('fit.detailOffline') }}</div>

      <div class="attr-list">
        <div v-if="!rows.length" class="no-attr">{{ t('fit.noResult') }}</div>
        <div v-for="row in rows" :key="row.aid" class="attr-row" :class="{ changed: row.changed }">
          <span class="attr-name">{{ row.name }}</span>
          <span class="attr-val">
            <span v-if="row.changed" class="base-val">{{ row.baseText }}</span>
            <span class="cur-val" :class="row.changed ? (row.better ? 'up' : 'down') : ''">{{ row.valText }}</span>
          </span>
        </div>
      </div>
      <div class="detail-foot">{{ t('fit.detailFoot') }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { getDogmaData } from '../../data/loader'
import { useI18n } from '../../i18n'
import { locName } from '../../services/locale'
import { typeIcon, onTypeIconError } from '../../services/typeIcon'
import { useFittingStore } from '../../stores/fitting'
import { calculateFit } from '../../services/dogmaEngine'

const props = defineProps({
  slotType: { type: String, required: true },
  slotIndex: { type: Number, required: true },
})
defineEmits(['close'])

const { t } = useI18n()
const store = useFittingStore()

const typeId = computed(() => store.getSlotArray(props.slotType)?.value[props.slotIndex] || null)
const offline = computed(() => store.isOffline(props.slotType, props.slotIndex))

const displayName = computed(() => {
  const data = getDogmaData()
  const td = data?.types[typeId.value]
  return td ? locName(td) : String(typeId.value)
})

// Attribute-unit formatting. Only well-known numeric units get a suffix;
// resonance units are shown as resist %. Unknown units render as raw numbers.
function fmt(v) {
  if (v == null || Number.isNaN(v)) return '-'
  const a = Math.abs(v)
  const d = a >= 100 ? 0 : a >= 1 ? 2 : 3
  return Number(v).toLocaleString(undefined, { maximumFractionDigits: d })
}
function signed(v) { return (v > 0 ? '+' : '') + fmt(v) }

const UNIT = {
  1: v => fmt(v) + ' m',
  2: v => fmt(v) + ' kg',
  3: v => fmt(v) + ' s',
  9: v => fmt(v) + ' m³',
  11: v => fmt(v) + ' m/s',
  101: v => fmt(v) + ' ms',
  102: v => fmt(v) + ' mm',
  104: v => fmt(v) + ' x',
  106: v => fmt(v) + ' tf',
  107: v => fmt(v) + ' MW',
  108: v => fmt((1 - v) * 100) + ' %',   // damage resonance → resist %
  111: v => fmt((1 - v) * 100) + ' %',
  109: v => signed((v - 1) * 100) + ' %', // modifier percent
  126: v => fmt(v) + ' ly',               // jump drive range (light years)
  144: v => fmt(v) + ' AU/s',             // warp speed
}
function formatAttr(uid, v) {
  const f = UNIT[uid]
  return f ? f(v) : fmt(v)
}

// Module attributes with ship/skill bonuses applied.
const rows = computed(() => {
  const data = getDogmaData()
  const tid = typeId.value
  if (!data || !tid) return []
  const td = data.types[tid]
  if (!td?.a) return []

  // Computed (bonused) attrs from the full fit, matched to this exact slot.
  let calcAttrs = null
  if (!offline.value) {
    const fit = calculateFit(store, data)
    const m = fit.modules?.find(x => x.slotType === props.slotType && x.slotIndex === props.slotIndex)
    calcAttrs = m?.attrs || null
  }

  const out = []
  for (const [aid, baseVal] of td.a) {
    const def = data.attrs[aid]
    if (!def?.dn) continue  // only show meaningful (display-named) attributes
    const cur = calcAttrs?.get(aid) ?? baseVal
    const changed = Math.abs(cur - baseVal) > 1e-6
    // Better = moved in the "good" direction (highIsGood). Resonance (lower=better)
    // is inverted, but highIsGood already encodes that for the raw attr.
    const better = def.hi ? cur > baseVal : cur < baseVal
    out.push({
      aid,
      name: def.dn,
      baseText: formatAttr(def.uid, baseVal),
      valText: formatAttr(def.uid, cur),
      changed,
      better,
    })
  }
  out.sort((a, b) => a.name.localeCompare(b.name))
  return out
})
</script>

<style scoped>
.detail-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 1000;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 8vh;
}

.detail-panel {
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 8px;
  width: 420px;
  max-height: 78vh;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid #2a2a2a;
}

.mod-title { display: flex; align-items: center; gap: 8px; min-width: 0; }
.type-icon { width: 28px; height: 28px; border-radius: 3px; flex-shrink: 0; }
.mod-name { color: #c8aa6e; font-size: 0.95em; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.close-btn { background: none; border: none; color: #8a8a8a; font-size: 1.4em; cursor: pointer; padding: 0 4px; flex-shrink: 0; }
.close-btn:hover { color: #d0d0d0; }

.offline-note {
  color: #ff9800;
  font-size: 0.75em;
  padding: 6px 14px 0;
}

.attr-list {
  overflow-y: auto;
  padding: 8px 0;
  flex: 1;
}

.no-attr { color: #555; text-align: center; padding: 16px; font-size: 0.85em; }

.attr-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 4px 14px;
  font-size: 0.82em;
}
.attr-row:hover { background: rgba(200, 170, 110, 0.05); }

.attr-name { color: #a0a0a0; }
.attr-val { display: flex; align-items: baseline; gap: 8px; white-space: nowrap; }
.base-val { color: #666; text-decoration: line-through; font-size: 0.9em; }
.cur-val { color: #d0d0d0; }
.cur-val.up { color: #4caf50; }
.cur-val.down { color: #ef5350; }

.detail-foot {
  padding: 8px 14px;
  border-top: 1px solid #2a2a2a;
  color: #666;
  font-size: 0.72em;
}
</style>
