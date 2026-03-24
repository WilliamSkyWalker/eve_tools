<template>
  <div class="level-section">
    <h4 class="level-title">{{ levelLabel }}</h4>
    <table class="level-table">
      <thead>
        <tr>
          <th>材料</th>
          <th class="num">数量</th>
          <th>来源</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="mat in materials" :key="mat.type_id" :class="{ 'row-build': mat.build }">
          <td>
            <span class="copyable" :class="{ 'name-reaction': mat.is_reaction }" @click="copyName(mat.type_name)">{{ mat.type_name }}</span>
          </td>
          <td class="num">{{ formatNumber(mat.quantity) }}</td>
          <td>
            <span v-if="mat.is_reaction" class="tag tag-reaction">反应</span>
            <span v-else-if="mat.is_manufacturable" class="tag tag-mfg">制造</span>
            <span v-else class="tag tag-buy">购买</span>
          </td>
          <td>
            <button
              v-if="mat.is_manufacturable"
              @click="toggleBuild(mat)"
              class="toggle-btn"
              :class="{ active: mat.build }"
            >
              {{ mat.build ? '购买' : '制造' }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
const props = defineProps({
  level: { type: Number, required: true },
  materials: { type: Array, required: true },
})

const emit = defineEmits(['toggle-build'])

const levelLabels = ['一级材料', '二级材料', '三级材料', '四级材料', '五级材料']

const levelLabel = props.level < levelLabels.length
  ? levelLabels[props.level]
  : `${props.level + 1}级材料`

function formatNumber(n) {
  return n != null ? n.toLocaleString() : '-'
}

function copyName(name) {
  navigator.clipboard.writeText(name)
}

function toggleBuild(mat) {
  emit('toggle-build', mat.type_id, !mat.build, mat.is_reaction ? 0 : 0)
}
</script>

<style scoped>
.level-section {
  margin-bottom: 20px;
}

.level-title {
  color: #c8aa6e;
  margin-bottom: 8px;
  font-size: 1em;
  padding-left: 4px;
  border-left: 3px solid #c8aa6e;
}

.level-table {
  background: #1a1a1a;
  border-radius: 8px;
  overflow: hidden;
}

.num {
  text-align: right;
}

.row-build {
  background: rgba(200, 170, 110, 0.05);
}

.copyable {
  cursor: pointer;
  transition: color 0.2s;
}

.copyable:hover {
  color: #c8aa6e;
}

.copyable:active {
  color: #e0c882;
}

.name-reaction {
  color: #ff9800;
}

.name-reaction:hover {
  color: #ffb74d;
}

.tag {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.8em;
  font-weight: 600;
}

.tag-mfg {
  background: rgba(76, 175, 80, 0.15);
  color: #4caf50;
  border: 1px solid rgba(76, 175, 80, 0.3);
}

.tag-reaction {
  background: rgba(255, 152, 0, 0.15);
  color: #ff9800;
  border: 1px solid rgba(255, 152, 0, 0.3);
}

.tag-buy {
  background: rgba(138, 138, 138, 0.1);
  color: #8a8a8a;
}

.toggle-btn {
  padding: 2px 12px;
  border: 1px solid #2a2a2a;
  border-radius: 3px;
  background: transparent;
  color: #8a8a8a;
  font-size: 0.8em;
  cursor: pointer;
  transition: all 0.2s;
}

.toggle-btn:hover {
  border-color: #c8aa6e;
  color: #c8aa6e;
}

.toggle-btn.active {
  border-color: #4caf50;
  color: #4caf50;
}
</style>
