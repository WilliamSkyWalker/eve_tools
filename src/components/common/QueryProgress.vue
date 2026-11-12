<template>
  <span
    class="query-progress"
    role="progressbar"
    :aria-label="label || t('common.loading')"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-valuenow="percent"
  >
    <span class="query-progress-spinner" aria-hidden="true"></span>
    <span v-if="label" class="query-progress-label">{{ label }}</span>
    <span class="query-progress-percent">{{ percent }}%</span>
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from '../../i18n'

const props = defineProps({
  progress: { type: Number, default: 0 },
  label: { type: String, default: '' },
})
const { t } = useI18n()
const percent = computed(() => Number.isFinite(props.progress)
  ? Math.min(100, Math.max(0, Math.floor(props.progress))) : 0)
</script>

<style scoped>
.query-progress {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--text-muted);
  font-size: var(--text-sm);
  vertical-align: middle;
}
.query-progress-spinner {
  flex: 0 0 auto;
  width: 16px;
  height: 16px;
  border: 2px solid var(--border-strong);
  border-top-color: var(--gold);
  border-radius: 50%;
  animation: query-progress-spin 0.8s linear infinite;
}
.query-progress-percent {
  min-width: 4ch;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
:global(button .query-progress) { color: inherit; }
:global(button .query-progress-spinner) { border-top-color: currentColor; }
@keyframes query-progress-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  .query-progress-spinner { animation: none; }
}
</style>
