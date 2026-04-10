<template>
  <div class="stats-fitting">
    <StatBar :label="t('fit.cpu')" :used="stats.cpuUsed" :total="stats.cpuTotal" unit="tf" />
    <StatBar :label="t('fit.powergrid')" :used="stats.pgUsed" :total="stats.pgTotal" unit="MW" />
    <StatBar :label="t('fit.calibration')" :used="stats.calUsed" :total="stats.calTotal" />
  </div>
</template>

<script setup>
import { useI18n } from '../../i18n'
import StatBar from './StatBar.vue'

defineProps({
  stats: { type: Object, default: () => ({}) },
})
const { t } = useI18n()
</script>
