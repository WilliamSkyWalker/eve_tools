<template>
  <div class="stats-cap">
    <div class="stat-row main">
      <span class="stat-label">{{ t('fit.capacitor') }}</span>
      <span class="stat-value" :class="{ stable: stats.capStable, unstable: stats.capStable === false }">
        <template v-if="stats.capStable">{{ t('fit.stable') }} ({{ pctFmt(stats.capStablePct) }})</template>
        <template v-else-if="stats.capLastsSec">{{ fmtTime(stats.capLastsSec * 1000) }}</template>
        <template v-else>-</template>
      </span>
    </div>
    <div class="stat-row">
      <span class="stat-label">{{ t('fit.capacitor') }}</span>
      <span class="stat-value">{{ fmt(stats.capTotal) }} GJ</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">{{ t('fit.capRecharge') }}</span>
      <span class="stat-value">{{ fmtTime(stats.capRecharge) }}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">{{ locale === 'zh' ? '峰值回充' : 'Peak Recharge' }}</span>
      <span class="stat-value">{{ fmtDec(stats.peakRecharge) }} GJ/s</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">{{ locale === 'zh' ? '总耗电' : 'Usage' }}</span>
      <span class="stat-value">{{ fmtDec(stats.capUsagePerSec) }} GJ/s</span>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from '../../i18n'
defineProps({ stats: { type: Object, default: () => ({}) } })
const { t, locale } = useI18n()

function fmt(n) { return n != null ? Math.round(n).toLocaleString() : '-' }
function fmtDec(n) { return n != null ? n.toFixed(1) : '-' }
function pctFmt(n) { return n != null ? (n * 100).toFixed(0) + '%' : '-' }
function fmtTime(ms) {
  if (ms == null) return '-'
  const sec = ms / 1000
  if (sec < 60) return sec.toFixed(0) + 's'
  const min = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${min}m ${s}s`
}
</script>

<style scoped>
.stat-row { display: flex; justify-content: space-between; padding: 5px 0; }
.stat-row.main { padding: 6px 0; }
.stat-label { color: #8a8a8a; font-size: 0.85em; }
.stat-value { color: #d0d0d0; font-size: 0.9em; }
.stat-value.stable { color: #4caf50; font-weight: 600; }
.stat-value.unstable { color: #ef5350; }
</style>
