<template>
  <div class="stat-bar">
    <div class="bar-header">
      <span class="bar-label">{{ label }}</span>
      <span class="bar-values" :class="{ over: used > total }">
        {{ fmt(used) }} / {{ fmt(total) }} {{ unit }}
      </span>
    </div>
    <div class="bar-track">
      <div class="bar-fill" :class="{ over: pct > 100 }" :style="{ width: Math.min(pct, 100) + '%' }"></div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  label: String,
  used: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  unit: { type: String, default: '' },
})

const pct = computed(() => props.total > 0 ? (props.used / props.total) * 100 : 0)

function fmt(n) {
  if (n == null) return '-'
  return n >= 1000 ? n.toLocaleString(undefined, { maximumFractionDigits: 1 }) : Number(n.toFixed(1))
}
</script>

<style scoped>
.stat-bar {
  margin-bottom: 10px;
}

.bar-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 3px;
}

.bar-label {
  color: var(--text-muted);
  font-size: 0.8em;
}

.bar-values {
  color: var(--text-primary);
  font-size: 0.8em;
}

.bar-values.over {
  color: var(--red);
}

.bar-track {
  height: 6px;
  background: var(--border-default);
  border-radius: 3px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: var(--gold);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.bar-fill.over {
  background: var(--red);
}
</style>
