<template>
  <div class="stats-targeting">
    <div class="stat-row">
      <span class="stat-label">{{ t('fit.maxRange') }}</span>
      <span class="stat-value">{{ fmtKm(stats.targetRange) }}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">{{ t('fit.scanRes') }}</span>
      <span class="stat-value">{{ fmt(stats.scanRes) }} mm</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">{{ t('fit.maxTargets') }}</span>
      <span class="stat-value">{{ fmt(stats.maxTargets) }}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">{{ t('fit.sigRadius') }}</span>
      <span class="stat-value">{{ fmt(stats.sigRadius) }} m</span>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from '../../i18n'
defineProps({ stats: { type: Object, default: () => ({}) } })
const { t } = useI18n()
function fmt(n) { return n != null ? Math.round(n).toLocaleString() : '-' }
function fmtKm(n) {
  if (n == null) return '-'
  if (n >= 1000000) return (n / 1000).toFixed(0).toLocaleString() + ' km'
  return Math.round(n).toLocaleString() + ' m'
}
</script>

<style scoped>
.stat-row {
  display: flex;
  justify-content: space-between;
  padding: 5px 0;
}
.stat-label { color: #8a8a8a; font-size: 0.85em; }
.stat-value { color: #d0d0d0; font-size: 0.9em; }
</style>
