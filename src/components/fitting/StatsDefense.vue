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

    <!-- Active Tank -->
    <div v-if="stats.shieldBoostPerSec > 0 || stats.armorRepPerSec > 0" class="active-tank">
      <div class="section-label">{{ t('fit.activeTank') }}</div>
      <div v-if="stats.shieldBoostPerSec > 0" class="tank-row">
        <span class="tank-label">{{ t('fit.shieldBoostPerSec') }}</span>
        <span class="tank-value shield">{{ stats.shieldBoostPerSec.toFixed(1) }} HP/s</span>
      </div>
      <div v-if="stats.armorRepPerSec > 0" class="tank-row">
        <span class="tank-label">{{ t('fit.armorRepPerSec') }}</span>
        <span class="tank-value armor">{{ stats.armorRepPerSec.toFixed(1) }} HP/s</span>
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
  color: var(--text-muted);
  font-size: 0.72em;
}

.hp-value {
  font-size: 0.95em;
  font-weight: 600;
}

.hp-value.shield { color: var(--blue); }
.hp-value.armor { color: var(--orange); }
.hp-value.hull { color: var(--text-muted); }
.hp-value.ehp { color: var(--green); }

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

.resist-type.em { color: var(--blue); }
.resist-type.th { color: var(--red); }
.resist-type.ki { color: var(--text-muted); }
.resist-type.ex { color: var(--orange); }

.layer-label {
  color: var(--text-muted);
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
  color: var(--text-primary);
}

.resist-high { background: var(--green-bg); color: var(--green); }
.resist-mid { background: var(--gold-bg-medium); color: var(--gold); }
.resist-low { background: var(--orange-bg); color: var(--orange); }
.resist-none { background: var(--red-bg); color: var(--red); }

.active-tank {
  margin-top: 14px;
  padding-top: 10px;
  border-top: 1px solid var(--border-default);
}

.section-label {
  color: var(--text-muted);
  font-size: 0.72em;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
}

.tank-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 3px;
}

.tank-label {
  color: var(--text-muted);
  font-size: 0.82em;
}

.tank-value {
  font-size: 0.85em;
  font-weight: 600;
}

.tank-value.shield { color: var(--blue); }
.tank-value.armor { color: var(--orange); }
</style>
