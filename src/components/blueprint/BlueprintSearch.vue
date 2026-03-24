<template>
  <div class="search-container">
    <div class="search-box">
      <input
        v-model="query"
        type="text"
        placeholder="Search blueprints by product name..."
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
        <span class="product-name">{{ bp.product_name }}</span>
        <span class="bp-name">{{ bp.blueprint_name }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { searchBlueprints } from '../../api/blueprints'

const router = useRouter()
const query = ref('')
const results = ref([])
const showDropdown = ref(false)
const loading = ref(false)
let debounceTimer = null

function onInput() {
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
  showDropdown.value = false
  query.value = bp.product_name
  router.push({ name: 'blueprint', params: { typeId: bp.blueprint_type_id } })
}
</script>

<style scoped>
.search-container {
  position: relative;
  max-width: 500px;
  margin: 0 auto;
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
  width: 18px;
  height: 18px;
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
  border-radius: 0 0 8px 8px;
  list-style: none;
  max-height: 300px;
  overflow-y: auto;
  z-index: 100;
}

.dropdown-item {
  padding: 10px 16px;
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

.product-name {
  color: #d0d0d0;
  font-weight: 500;
}

.bp-name {
  color: #555555;
  font-size: 0.85em;
}
</style>
