<template>
  <div class="stats-panel">
    <div class="stats-section">
      <div class="section-title">{{ t('fit.fitting') }}</div>
      <StatsFitting :stats="stats" />
    </div>
    <div class="stats-section">
      <div class="section-title">{{ t('fit.defense') }}</div>
      <StatsDefense :stats="stats" />
    </div>
    <div class="stats-section">
      <div class="section-title">{{ t('fit.offense') }}</div>
      <StatsOffense :stats="stats" />
    </div>
    <div class="stats-section">
      <div class="section-title">{{ t('fit.navigation') }}</div>
      <StatsNavigation :stats="stats" />
    </div>
    <div class="stats-section">
      <div class="section-title">{{ t('fit.capacitor') }}</div>
      <StatsCapacitor :stats="stats" />
    </div>
    <div class="stats-section">
      <div class="section-title">{{ t('fit.targeting') }}</div>
      <StatsTargeting :stats="stats" />
    </div>
  </div>
</template>

<script setup>
import { useI18n } from '../../i18n'
import StatsFitting from './StatsFitting.vue'
import StatsDefense from './StatsDefense.vue'
import StatsOffense from './StatsOffense.vue'
import StatsNavigation from './StatsNavigation.vue'
import StatsCapacitor from './StatsCapacitor.vue'
import StatsTargeting from './StatsTargeting.vue'

defineProps({
  stats: { type: Object, default: () => ({}) },
})

const { t } = useI18n()
</script>

<style scoped>
.stats-panel {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stats-section {
  background: #141414;
  border: 1px solid #222;
  border-radius: 6px;
  padding: 10px 12px;
}

.section-title {
  color: #c8aa6e;
  font-size: 0.78em;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
  padding-bottom: 4px;
  border-bottom: 1px solid #2a2a2a;
}
</style>
