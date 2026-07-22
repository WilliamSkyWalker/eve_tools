<template>
  <div class="system-search">
    <label v-if="label" class="field-label">{{ label }}</label>
    <div class="search-box">
      <input
        v-model="query"
        type="text"
        :placeholder="placeholder"
        @input="onInput"
        @focus="showDropdown = results.length > 0"
        @keydown.escape="showDropdown = false"
        class="search-input"
      />
      <span v-if="loading" class="spinner"></span>
    </div>
    <ul v-if="showDropdown && results.length" class="dropdown">
      <li
        v-for="sys in results"
        :key="sys.solar_system_id"
        @click="selectSystem(sys)"
        class="dropdown-item"
      >
        <span class="system-name">
          <template v-if="sys.solar_system_name_zh">{{ sys.solar_system_name_zh }} / </template>{{ sys.solar_system_name }}
        </span>
        <span class="system-meta">
          <span class="security" :class="securityClass(sys.security)">{{ sys.security.toFixed(1) }}</span>
          <span class="region">{{ sys.region_name }}</span>
        </span>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { searchSystems } from '../../api/navigation'

const props = defineProps({
  label: { type: String, default: '' },
  placeholder: { type: String, default: '输入星系名称...' },
  modelValue: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue', 'select'])

const query = ref(props.modelValue)
const results = ref([])
const showDropdown = ref(false)
const loading = ref(false)
let debounceTimer = null

watch(() => props.modelValue, (val) => {
  if (val !== query.value) query.value = val
})

function onInput() {
  emit('update:modelValue', query.value)
  clearTimeout(debounceTimer)
  if (query.value.trim().length < 1) {
    results.value = []
    showDropdown.value = false
    return
  }
  debounceTimer = setTimeout(async () => {
    loading.value = true
    try {
      const { data } = await searchSystems(query.value.trim())
      results.value = data.results
      showDropdown.value = results.value.length > 0
    } finally {
      loading.value = false
    }
  }, 250)
}

function selectSystem(sys) {
  const displayName = sys.solar_system_name_zh
    ? `${sys.solar_system_name_zh} / ${sys.solar_system_name}`
    : sys.solar_system_name
  query.value = displayName
  emit('update:modelValue', sys.solar_system_name)
  emit('select', sys)
  showDropdown.value = false
}

function securityClass(sec) {
  if (sec >= 0.5) return 'sec-high'
  if (sec > 0.0) return 'sec-low'
  return 'sec-null'
}
</script>

<style scoped>
.system-search { position: relative; }
.field-label { display: block; font-size: var(--text-xs); text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-dim); margin-bottom: 4px; }
.search-box { position: relative; }
.search-input {
  width: 100%; height: 34px; padding: 0 12px;
  background: var(--bg-input); border: 1px solid var(--border-default);
  border-radius: var(--radius-md); color: var(--text-primary); font-size: var(--text-base);
  transition: border-color .15s;
}
.search-input:focus { outline: none; border-color: var(--gold-line); }

.spinner {
  position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
  width: 15px; height: 15px;
  border: 2px solid var(--border-default); border-top-color: var(--gold);
  border-radius: 50%; animation: spin 0.6s linear infinite;
}
@keyframes spin { to { transform: translateY(-50%) rotate(360deg); } }

.dropdown {
  position: absolute; top: calc(100% + 4px); left: 0; right: 0;
  background: var(--bg-panel); border: 1px solid var(--border-strong);
  border-radius: var(--radius-md); box-shadow: var(--shadow-pop);
  list-style: none; max-height: 280px; overflow-y: auto; z-index: 100; padding: 4px;
}
.dropdown-item {
  padding: 8px 10px; cursor: pointer;
  display: flex; justify-content: space-between; align-items: center; gap: 10px;
  border-radius: var(--radius-sm);
}
.dropdown-item:hover { background: var(--bg-elevated); }
.system-name { color: var(--text-primary); font-weight: 500; }
.system-meta { display: flex; align-items: center; gap: 8px; }
.security { font-weight: 600; font-size: 0.85em; font-family: var(--font-mono); }
.sec-high { color: var(--green); }
.sec-low { color: var(--orange); }
.sec-null { color: var(--red); }
.region { color: var(--text-dim); font-size: 0.8em; }
</style>
