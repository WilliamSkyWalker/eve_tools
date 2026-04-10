<template>
  <div class="stats-defense">
    <!-- HP Summary -->
    <div class="hp-row">
      <div class="hp-item">
        <span class="hp-label">{{ t('fit.shieldHp') }}</span>
        <span class="hp-value shield">{{ fmt(stats.shieldHp) }}</span>
      </div>
      <div class="hp-item">
        <span class="hp-label">{{ t('fit.armorHp') }}</span>
        <span class="hp-value armor">{{ fmt(stats.armorHp) }}</span>
      </div>
      <div class="hp-item">
        <span class="hp-label">{{ t('fit.hullHp') }}</span>
        <span class="hp-value hull">{{ fmt(stats.hullHp) }}</span>
      </div>
      <div class="hp-item">
        <span class="hp-label">{{ t('fit.ehp') }}</span>
        <span class="hp-value ehp">{{ fmt(stats.ehp) }}</span>
      </div>
    </div>

    <!-- Resistance Grid -->
    <div class="resist-grid">
      <div class="resist-header">
        <span></span>
        <span class="resist-type em">{{ t('fit.em') }}</span>
        <span class="resist-type th">{{ t('fit.thermal') }}</span>
        <span class="resist-type ki">{{ t('fit.kinetic') }}</span>
        <span class="resist-type ex">{{ t('fit.explosive') }}</span>
      </div>
      <div v-for="layer in ['shield', 'armor', 'hull']" :key="layer" class="resist-row">
        <span class="layer-label">{{ t('fit.' + layer) }}</span>
        <span v-for="dmg in ['em', 'th', 'ki', 'ex']" :key="dmg" class="resist-cell" :class="resistClass(stats[`${layer}${dmg.charAt(0).toUpperCase() + dmg.slice(1)}`])">
          {{ pctFmt(stats[`${layer}${dmg.charAt(0).toUpperCase() + dmg.slice(1)}`]) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from '../../i18n'

defineProps({
  stats: { type: Object, default: () => ({}) },
})
const { t } = useI18n()

function fmt(n) {
  if (n == null) return '-'
  return Math.round(n).toLocaleString()
}

function pctFmt(n) {
  if (n == null) return '-'
  return (n * 100).toFixed(1) + '%'
}

function resistClass(val) {
  if (val == null) return ''
  const pct = val * 100
  if (pct >= 70) return 'resist-high'
  if (pct >= 40) return 'resist-mid'
  if (pct >= 20) return 'resist-low'
  return 'resist-none'
}
</script>

<style scoped>
.hp-row {
  display: flex;
  gap: 12px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.hp-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 60px;
}

.hp-label {
  color: #8a8a8a;
  font-size: 0.72em;
}

.hp-value {
  font-size: 0.95em;
  font-weight: 600;
}

.hp-value.shield { color: #42a5f5; }
.hp-value.armor { color: #ff9800; }
.hp-value.hull { color: #8a8a8a; }
.hp-value.ehp { color: #4caf50; }

.resist-grid {
  font-size: 0.8em;
}

.resist-header, .resist-row {
  display: grid;
  grid-template-columns: 50px repeat(4, 1fr);
  gap: 4px;
  align-items: center;
}

.resist-header {
  margin-bottom: 4px;
}

.resist-type {
  text-align: center;
  font-weight: 600;
  font-size: 0.85em;
}

.resist-type.em { color: #42a5f5; }
.resist-type.th { color: #ef5350; }
.resist-type.ki { color: #aaa; }
.resist-type.ex { color: #ff9800; }

.layer-label {
  color: #8a8a8a;
  font-size: 0.85em;
}

.resist-row {
  margin-bottom: 3px;
}

.resist-cell {
  text-align: center;
  padding: 3px 4px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.03);
  color: #d0d0d0;
}

.resist-high { background: rgba(76, 175, 80, 0.15); color: #4caf50; }
.resist-mid { background: rgba(200, 170, 110, 0.1); color: #c8aa6e; }
.resist-low { background: rgba(255, 152, 0, 0.1); color: #ff9800; }
.resist-none { background: rgba(239, 83, 80, 0.08); color: #ef5350; }
</style>
