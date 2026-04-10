<template>
  <div class="stats-panel">
    <div class="stats-tabs">
      <button v-for="tab in tabs" :key="tab.key" :class="['tab', { active: activeTab === tab.key }]" @click="activeTab = tab.key">
        {{ tab.label }}
      </button>
    </div>

    <div class="stats-content">
      <StatsFitting v-if="activeTab === 'fitting'" :stats="stats" />
      <StatsDefense v-else-if="activeTab === 'defense'" :stats="stats" />
      <StatsOffense v-else-if="activeTab === 'offense'" :stats="stats" />
      <StatsNavigation v-else-if="activeTab === 'navigation'" :stats="stats" />
      <StatsCapacitor v-else-if="activeTab === 'capacitor'" :stats="stats" />
      <StatsTargeting v-else-if="activeTab === 'targeting'" :stats="stats" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from '../../i18n'
import StatsFitting from './StatsFitting.vue'
import StatsDefense from './StatsDefense.vue'
import StatsOffense from './StatsOffense.vue'
import StatsNavigation from './StatsNavigation.vue'
import StatsCapacitor from './StatsCapacitor.vue'
import StatsTargeting from './StatsTargeting.vue'

const props = defineProps({
  stats: { type: Object, default: () => ({}) },
})

const { t } = useI18n()
const activeTab = ref('fitting')

const tabs = computed(() => [
  { key: 'fitting', label: t('fit.fitting') },
  { key: 'defense', label: t('fit.defense') },
  { key: 'offense', label: t('fit.offense') },
  { key: 'navigation', label: t('fit.navigation') },
  { key: 'capacitor', label: t('fit.capacitor') },
  { key: 'targeting', label: t('fit.targeting') },
])
</script>

<style scoped>
.stats-panel {
  background: #141414;
  border: 1px solid #222;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
}

.stats-tabs {
  display: flex;
  flex-direction: column;
  border-right: 1px solid #2a2a2a;
  flex-shrink: 0;
}

.tab {
  background: none;
  border: none;
  border-left: 2px solid transparent;
  color: #8a8a8a;
  padding: 10px 12px;
  font-size: 0.78em;
  cursor: pointer;
  white-space: nowrap;
  text-align: left;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}

.tab:hover {
  color: #c8aa6e;
  background: rgba(200, 170, 110, 0.03);
}

.tab.active {
  color: #c8aa6e;
  border-left-color: #c8aa6e;
  background: rgba(200, 170, 110, 0.05);
}

.stats-content {
  padding: 12px;
  flex: 1;
  min-width: 0;
}
</style>
