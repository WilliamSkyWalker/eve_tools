<template>
  <div class="stats-offense">
    <div class="stat-row main">
      <span class="stat-label">{{ t('fit.dps') }}</span>
      <span class="stat-value dps">{{ fmt(stats.totalDps) }}</span>
    </div>
    <div class="stat-row main">
      <span class="stat-label">{{ t('fit.volley') }}</span>
      <span class="stat-value">{{ fmt(stats.totalVolley) }}</span>
    </div>
    <div class="divider"></div>
    <div class="stat-row">
      <span class="stat-label">{{ t('fit.turretDps') }}</span>
      <span class="stat-value">{{ fmt(stats.turretDps) }}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">{{ t('fit.missileDps') }}</span>
      <span class="stat-value">{{ fmt(stats.missileDps) }}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">{{ t('fit.droneDps') }}</span>
      <span class="stat-value">{{ fmt(stats.droneDps) }}</span>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from '../../i18n'
defineProps({ stats: { type: Object, default: () => ({}) } })
const { t } = useI18n()
function fmt(n) { return n != null ? n.toFixed(1) : '-' }
</script>

<style scoped>
.stat-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
}

.stat-row.main {
  padding: 6px 0;
}

.stat-label {
  color: #8a8a8a;
  font-size: 0.85em;
}

.stat-value {
  color: #d0d0d0;
  font-size: 0.9em;
}

.stat-value.dps {
  color: #ef5350;
  font-size: 1.1em;
  font-weight: 600;
}

.divider {
  border-top: 1px solid #2a2a2a;
  margin: 4px 0;
}
</style>
