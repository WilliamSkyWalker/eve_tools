<template>
  <div class="stats-nav">
    <div class="stat-row">
      <span class="stat-label">{{ t('fit.speed') }}</span>
      <span class="stat-value">{{ fmt(stats.maxVelocity) }} m/s</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">{{ t('fit.alignTime') }}</span>
      <span class="stat-value">{{ fmtDec(stats.alignTime) }} {{ t('fit.seconds') }}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">{{ t('fit.warpSpeed') }}</span>
      <span class="stat-value">{{ fmtDec(stats.warpSpeed) }} AU/s</span>
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
function fmtDec(n) { return n != null ? n.toFixed(2) : '-' }
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
