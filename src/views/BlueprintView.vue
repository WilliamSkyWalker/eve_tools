<template>
  <div class="blueprint-view" v-if="blueprint">
    <div class="bp-header">
      <h2>{{ blueprint.blueprint_name }}</h2>
      <p class="product-info">
        Product: <strong>{{ blueprint.product.type_name }}</strong>
        ({{ blueprint.product.quantity }} per run)
        | Manufacturing Time: {{ formatTime(blueprint.manufacturing_time) }}
        | Max Runs: {{ blueprint.max_production_limit }}
      </p>
    </div>

    <MaterialForm
      :max-runs="blueprint.max_production_limit"
      @calculate="onCalculate"
      @calculate-bom="onCalculateBom"
    />

    <div v-if="materials.length" class="results">
      <h3>直接材料</h3>
      <MaterialTable :materials="materials" :me-level="currentMe" :runs="currentRuns" />
    </div>

    <div v-if="bomTree" class="results">
      <h3>材料清单 (递归展开)</h3>
      <div class="bom-controls">
        <label>
          <input type="checkbox" v-model="expandAll" @change="onExpandAllChange" />
          展开全部子组件
        </label>
      </div>
      <BomTree :tree="bomTree" :build-items="buildItems" @toggle-build="onToggleBuild" />

      <div v-if="bomSummary.length" class="summary-section">
        <h3>原材料汇总</h3>
        <MaterialSummary :materials="bomSummary" :prices="prices" />
      </div>
    </div>
  </div>
  <div v-else class="loading">Loading blueprint...</div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { getBlueprintDetail, calculateMaterials, getBom } from '../api/blueprints'
import { getPrices } from '../api/prices'
import MaterialForm from '../components/blueprint/MaterialForm.vue'
import MaterialTable from '../components/calculation/MaterialTable.vue'
import BomTree from '../components/calculation/BomTree.vue'
import MaterialSummary from '../components/calculation/MaterialSummary.vue'
import { loadIndustryData } from '../data/loader'

const props = defineProps({
  typeId: { type: Number, required: true },
})

const blueprint = ref(null)
const materials = ref([])
const bomTree = ref(null)
const bomSummary = ref([])
const buildItems = ref({})
const prices = ref({})
const currentMe = ref(10)
const currentRuns = ref(1)
const expandAll = ref(false)

onMounted(async () => {
  await loadIndustryData()
  const { data } = await getBlueprintDetail(props.typeId)
  blueprint.value = data
})

function formatTime(seconds) {
  if (!seconds) return 'N/A'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

async function onCalculate({ meLevel, runs }) {
  currentMe.value = meLevel
  currentRuns.value = runs
  const { data } = await calculateMaterials(props.typeId, meLevel, runs)
  materials.value = data.materials
  bomTree.value = null
  bomSummary.value = []
}

function collectManufacturableIds(tree) {
  const ids = {}
  function walk(node) {
    for (const child of node.children || []) {
      if (child.is_manufacturable) {
        ids[String(child.type_id)] = {
          me_level: 0,
          build: true,
        }
      }
      if (child.children?.length) walk(child)
    }
  }
  walk(tree)
  return ids
}

async function onCalculateBom({ meLevel, runs }) {
  currentMe.value = meLevel
  currentRuns.value = runs

  // If expandAll, iteratively expand until no new nodes appear
  if (expandAll.value) {
    // First pass: mark direct materials
    for (const mat of materials.value) {
      if (mat.has_blueprint) {
        buildItems.value[String(mat.type_id)] = {
          me_level: 0,
          build: true,
        }
      }
    }
    // Iteratively expand: keep fetching BOM until no new build items found
    let prevCount = 0
    for (let i = 0; i < 10; i++) {
      const { data } = await getBom(props.typeId, meLevel, runs, buildItems.value)
      const newIds = collectManufacturableIds(data.tree)
      Object.assign(buildItems.value, newIds)
      if (Object.keys(buildItems.value).length === prevCount) {
        bomTree.value = data.tree
        bomSummary.value = data.summary
        break
      }
      prevCount = Object.keys(buildItems.value).length
      bomTree.value = data.tree
      bomSummary.value = data.summary
    }
  } else {
    const { data } = await getBom(props.typeId, meLevel, runs, buildItems.value)
    bomTree.value = data.tree
    bomSummary.value = data.summary
  }

  // Fetch prices for summary materials
  const typeIds = bomSummary.value.map((m) => m.type_id)
  if (typeIds.length) {
    try {
      const priceResp = await getPrices(typeIds)
      prices.value = priceResp.data.prices
    } catch {
      // prices are optional
    }
  }
}

function onToggleBuild(typeId, build, meLevel = 0) {
  buildItems.value[String(typeId)] = { me_level: meLevel, build }
  // Re-calculate BOM
  onCalculateBom({ meLevel: currentMe.value, runs: currentRuns.value })
}

function onExpandAllChange() {
  if (!expandAll.value) {
    buildItems.value = {}
  }
  if (bomTree.value || materials.value.length) {
    onCalculateBom({ meLevel: currentMe.value, runs: currentRuns.value })
  }
}
</script>

<style scoped>
.blueprint-view {
  padding-top: 20px;
}

.bp-header h2 {
  color: #c8aa6e;
  margin-bottom: 4px;
}

.product-info {
  color: #8a8a8a;
  font-size: 0.9em;
  margin-bottom: 20px;
}

.results {
  margin-top: 24px;
}

.results h3 {
  color: #c8aa6e;
  margin-bottom: 12px;
  font-size: 1.1em;
}

.bom-controls {
  margin-bottom: 12px;
  color: #8a8a8a;
}

.bom-controls input {
  margin-right: 6px;
}

.summary-section {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #2a2a2a;
}

.loading {
  text-align: center;
  padding: 60px;
  color: #8a8a8a;
}
</style>
