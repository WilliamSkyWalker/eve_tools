<template>
  <table class="material-table">
    <thead>
      <tr>
        <th>材料</th>
        <th class="num">基础数量</th>
        <th class="num">需求量 (ME{{ meLevel }})</th>
        <th>来源</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="mat in materials" :key="mat.type_id">
        <td><span class="copyable" @click="copyName(mat.type_name, $event)">{{ mat.type_name }}</span></td>
        <td class="num">{{ formatNumber(mat.base_quantity) }}</td>
        <td class="num highlight">{{ formatNumber(mat.adjusted_quantity) }}</td>
        <td>
          <span v-if="mat.is_reaction" class="tag tag-reaction">反应</span>
          <span v-else-if="mat.has_blueprint" class="tag tag-mfg">制造</span>
          <span v-else class="tag tag-buy">购买</span>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script setup>
defineProps({
  materials: { type: Array, required: true },
  meLevel: { type: Number, default: 0 },
  runs: { type: Number, default: 1 },
})

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
</script>

<style scoped>
.material-table {
  background: #1a1a1a;
  border-radius: 8px;
  overflow: hidden;
}

.num {
  text-align: right;
}

.highlight {
  color: #c8aa6e;
  font-weight: 600;
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
  background: rgba(239, 83, 80, 0.1);
  color: #8a8a8a;
}
</style>
