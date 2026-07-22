<template>
  <div class="charge-overlay" @click.self="$emit('close')">
    <div class="charge-panel">
      <div class="panel-header">
        <h3>{{ t('fit.charge') }}</h3>
        <button class="close-btn" @click="$emit('close')">&times;</button>
      </div>
      <input
        ref="inputRef"
        v-model="query"
        type="text"
        class="search-input"
        :placeholder="t('fit.searchModule')"
        @keydown.escape="$emit('close')"
      >
      <ul class="results">
        <li v-for="ch in filtered" :key="ch.typeId" class="result-item" @click="$emit('select', ch.typeId)">
          <img class="type-icon" :src="typeIcon(ch.typeId)" alt="" loading="lazy" @error="onTypeIconError">
          <div class="ch-info">
            <span class="ch-name">{{ ch.display }}</span>
            <span class="ch-dmg">{{ ch.dmgText }}</span>
          </div>
        </li>
        <li v-if="!filtered.length" class="no-result">{{ t('fit.noResult') }}</li>
      </ul>
      <button class="unload-btn" @click="$emit('select', null)">{{ t('fit.remove') }} {{ t('fit.charge') }}</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useFittingStore } from '../../stores/fitting'
import { useI18n } from '../../i18n'
import { locName } from '../../services/locale'
import { typeIcon, onTypeIconError } from '../../services/typeIcon'

const props = defineProps({
  weaponTypeId: { type: Number, required: true },
})
defineEmits(['select', 'close'])
const store = useFittingStore()
const { t } = useI18n()

const query = ref('')
const inputRef = ref(null)

onMounted(() => inputRef.value?.focus())

const allCharges = computed(() => {
  return store.getCompatibleCharges(props.weaponTypeId).map(ch => {
    const em = ch.type.a?.find(([a]) => a === 114)?.[1] || 0
    const th = ch.type.a?.find(([a]) => a === 118)?.[1] || 0
    const ki = ch.type.a?.find(([a]) => a === 117)?.[1] || 0
    const ex = ch.type.a?.find(([a]) => a === 116)?.[1] || 0
    const total = em + th + ki + ex
    const parts = []
    if (em) parts.push(`EM:${em}`)
    if (th) parts.push(`Th:${th}`)
    if (ki) parts.push(`Ki:${ki}`)
    if (ex) parts.push(`Ex:${ex}`)
    return {
      typeId: ch.typeId,
      display: locName(ch.type),
      nameEn: ch.type.n?.toLowerCase() || '',
      nameZh: ch.type.nz?.toLowerCase() || '',
      dmgText: parts.join(' '),
      total,
    }
  }).sort((a, b) => b.total - a.total)
})

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return allCharges.value
  return allCharges.value.filter(c => c.nameEn.includes(q) || c.nameZh.includes(q))
})
</script>

<style scoped>
.charge-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 1000;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 10vh;
}

.charge-panel {
  background: var(--bg-panel);
  border: 1px solid var(--border-default);
  border-radius: 8px;
  width: 400px;
  max-height: 60vh;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border-default);
}

.panel-header h3 { color: var(--gold); font-size: 0.95em; margin: 0; }
.close-btn { background: none; border: none; color: var(--text-muted); font-size: 1.4em; cursor: pointer; padding: 0 4px; }
.close-btn:hover { color: var(--text-primary); }

.search-input {
  margin: 10px 14px;
  background: var(--bg-input);
  border: 1px solid var(--border-default);
  border-radius: 6px;
  color: var(--text-primary);
  padding: 7px 10px;
  font-size: 0.85em;
}
.search-input:focus { outline: none; border-color: var(--gold); }

.results {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  flex: 1;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  cursor: pointer;
  transition: background 0.12s;
}
.result-item:hover { background: var(--gold-bg); }

.type-icon { width: 26px; height: 26px; border-radius: 3px; flex-shrink: 0; }
.ch-info { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.ch-name { color: var(--text-primary); font-size: 0.85em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ch-dmg { color: var(--text-dim); font-size: 0.7em; }

.no-result { color: var(--text-dim); text-align: center; padding: 16px; font-size: 0.85em; }

.unload-btn {
  margin: 8px 14px;
  background: var(--border-default);
  border: none;
  color: var(--text-muted);
  padding: 6px;
  border-radius: 4px;
  font-size: 0.8em;
  cursor: pointer;
}
.unload-btn:hover { background: var(--border-strong); color: var(--red); }
</style>
