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
            <span class="copyable" :class="{ 'name-reaction': mat.is_reaction }" @click="copyName(mat.type_name, $event)">{{ mat.type_name }}</span>
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
    el.setAttribute('data-copied-tip', 'Copied!')
    el.classList.add('copied')
  }
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
  color: var(--gold);
  margin-bottom: 8px;
  font-size: 1em;
  padding-left: 4px;
  border-left: 3px solid var(--gold);
}

.level-table {
  background: var(--bg-panel);
  border-radius: 8px;
  overflow: hidden;
}

.num {
  text-align: right;
}

.row-build {
  background: var(--gold-bg-light);
}

.name-reaction {
  color: var(--orange);
}

.name-reaction:hover {
  color: var(--orange);
}

.tag {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.8em;
  font-weight: 600;
}

.tag-mfg {
  background: var(--green-bg);
  color: var(--green);
  border: 1px solid var(--green-bg);
}

.tag-reaction {
  background: var(--orange-bg);
  color: var(--orange);
  border: 1px solid var(--orange-bg);
}

.tag-buy {
  background: rgba(255,255,255,0.05);
  color: var(--text-muted);
}

.toggle-btn {
  padding: 2px 12px;
  border: 1px solid var(--border-default);
  border-radius: 3px;
  background: transparent;
  color: var(--text-muted);
  font-size: 0.8em;
  cursor: pointer;
  transition: all 0.2s;
}

.toggle-btn:hover {
  border-color: var(--gold);
  color: var(--gold);
}

.toggle-btn.active {
  border-color: var(--green);
  color: var(--green);
}
</style>
