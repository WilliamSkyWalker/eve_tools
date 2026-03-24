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
.system-search {
  position: relative;
}

.field-label {
  display: block;
  font-size: 0.85em;
  color: #8a8a8a;
  margin-bottom: 4px;
}

.search-box {
  position: relative;
}

.search-input {
  width: 100%;
  padding: 10px 14px;
  font-size: 0.95em;
  background: #0d0d0d;
  border: 1px solid #2a2a2a;
  border-radius: 6px;
  color: #d0d0d0;
  outline: none;
  transition: border-color 0.2s;
}

.search-input:focus {
  border-color: #c8aa6e;
}

.search-input::placeholder {
  color: #555555;
}

.spinner {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
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
  padding: 8px 14px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #2a2a2a;
}

.dropdown-item:hover {
  background: #222222;
}

.dropdown-item:last-child {
  border-bottom: none;
}

.system-name {
  color: #d0d0d0;
  font-weight: 500;
}

.system-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.security {
  font-weight: 600;
  font-size: 0.85em;
}

.sec-high {
  color: #4caf50;
}

.sec-low {
  color: #ff9800;
}

.sec-null {
  color: #ef5350;
}

.region {
  color: #555555;
  font-size: 0.8em;
}
</style>
