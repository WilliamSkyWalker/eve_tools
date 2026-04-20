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

    <!-- Turret -->
    <div class="stat-row">
      <span class="stat-label">{{ t('fit.turretDps') }}</span>
      <span class="stat-value">{{ fmt(stats.turretDps) }}</span>
    </div>
    <template v-if="stats.turretDps > 0">
      <div class="stat-row sub">
        <span class="stat-label">{{ t('fit.turretOptimal') }}</span>
        <span class="stat-value">{{ fmtKm(stats.turretOptimal) }}</span>
      </div>
      <div class="stat-row sub">
        <span class="stat-label">{{ t('fit.turretFalloff') }}</span>
        <span class="stat-value">{{ fmtKm(stats.turretFalloff) }}</span>
      </div>
      <div class="stat-row sub">
        <span class="stat-label">{{ t('fit.turretTracking') }}</span>
        <span class="stat-value">{{ stats.turretTracking?.toFixed(4) || '-' }} rad/s</span>
      </div>
    </template>

    <!-- Missile -->
    <div class="stat-row">
      <span class="stat-label">{{ t('fit.missileDps') }}</span>
      <span class="stat-value">{{ fmt(stats.missileDps) }}</span>
    </div>
    <template v-if="stats.missileDps > 0">
      <div class="stat-row sub">
        <span class="stat-label">{{ t('fit.missileRange') }}</span>
        <span class="stat-value">{{ fmtKm(stats.missileRange) }}</span>
      </div>
      <div class="stat-row sub">
        <span class="stat-label">{{ t('fit.missileExpRadius') }}</span>
        <span class="stat-value">{{ stats.missileExpRadius?.toFixed(0) || '-' }} m</span>
      </div>
      <div class="stat-row sub">
        <span class="stat-label">{{ t('fit.missileExpVelocity') }}</span>
        <span class="stat-value">{{ stats.missileExpVelocity?.toFixed(0) || '-' }} m/s</span>
      </div>
    </template>

    <!-- Drone -->
    <div class="stat-row">
      <span class="stat-label">{{ t('fit.droneDps') }}</span>
      <span class="stat-value">{{ fmt(stats.droneDps) }}</span>
    </div>
    <div v-if="stats.droneBwTotal > 0" class="stat-row sub">
      <span class="stat-label">{{ t('fit.droneBandwidth') }}</span>
      <span class="stat-value">{{ stats.droneBwUsed || 0 }}/{{ stats.droneBwTotal }} Mbit/s</span>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from '../../i18n'
defineProps({ stats: { type: Object, default: () => ({}) } })
const { t } = useI18n()
function fmt(n) { return n != null ? n.toFixed(1) : '-' }
function fmtKm(n) { return n != null && n > 0 ? (n / 1000).toFixed(1) + ' km' : '-' }
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

.stat-row.sub {
  padding: 2px 0 2px 12px;
}

.stat-row.sub .stat-label {
  font-size: 0.78em;
  color: #666;
}

.stat-row.sub .stat-value {
  font-size: 0.8em;
  color: #999;
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
