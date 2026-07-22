<template>
  <div class="t2rank">
    <div class="page-head">
      <div class="titles">
        <h1>{{ t('industry.t2RankTitle') }} <span class="srv-chip" :class="settings.server">{{ serverLabel }}</span></h1>
        <p class="sub">{{ t('industry.t2RankHint') }}</p>
      </div>
    </div>

    <div v-if="loading" class="state-msg">{{ t('industry.t2RankLoading') }}</div>
    <div v-if="error" class="state-msg error-text">{{ error }}</div>
    <div v-if="esiDown" class="state-msg error-text">{{ t('market.esiDown') }}</div>

    <div v-if="!loading && rows.length" class="card table-scroll">
      <table class="data-table t2-table">
        <thead>
          <tr>
            <th class="rank">#</th>
            <th>{{ t('industry.t2ColShip') }}</th>
            <th>{{ t('industry.t2ColGroup') }}</th>
            <th class="r">{{ t('industry.t2ColRevenue') }}</th>
            <th class="r">{{ t('industry.t2ColCost') }}</th>
            <th class="r">{{ t('industry.t2ColProfit') }}</th>
            <th class="r">{{ t('industry.t2ColMargin') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, i) in rows" :key="r.type_id">
            <td class="rank">{{ i + 1 }}</td>
            <td>
              <div class="name-cell">
                <img class="type-icon" :src="typeIcon(r.type_id)" alt="" loading="lazy" @error="onTypeIconError">
                <span class="copyable txt" @click="copyName(r.name, $event)">{{ r.name }}</span>
                <small v-if="r.missing" class="t2-missing" :title="t('industry.t2Missing')">*</small>
              </div>
            </td>
            <td class="t-muted t2-group">{{ r.group }}</td>
            <td class="r num t-green">{{ formatPrice(r.revenue) }}</td>
            <td class="r num t-red">{{ formatPrice(r.cost) }}</td>
            <td class="r num" :class="r.profit >= 0 ? 't-green' : 't-red'">{{ formatPrice(r.profit) }}</td>
            <td class="r num margin" :class="r.margin >= 0 ? 't-green' : 't-red'">{{ r.margin.toFixed(1) }}%</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useSettingsStore } from '../stores/settings'
import { useI18n } from '../i18n'
import { loadIndustryData } from '../data/loader'
import { computeT2Margins } from '../services/t2margin'
import { typeIcon, onTypeIconError } from '../services/typeIcon'

const settings = useSettingsStore()
const { t, locale, serverLabel } = useI18n()

const rows = ref([])
const loading = ref(false)
const error = ref('')
const esiDown = ref(false)

async function load() {
  loading.value = true
  error.value = ''
  esiDown.value = false
  try {
    await loadIndustryData()
    const { rows: r, esiUnavailable } = await computeT2Margins(settings.datasource)
    rows.value = r
    esiDown.value = esiUnavailable
    if (!r.length && !esiUnavailable) error.value = t('industry.t2RankError')
  } catch {
    error.value = t('industry.t2RankError')
  } finally {
    loading.value = false
  }
}

onMounted(load)
// Ship names are baked via locName in computeT2Margins — recompute on locale change.
watch(() => locale.value, load)

function formatPrice(n) {
  if (n == null) return '—'
  const sign = n < 0 ? '-' : ''
  const a = Math.abs(n)
  if (a >= 1e9) return sign + (a / 1e9).toFixed(2) + 'B'
  if (a >= 1e6) return sign + (a / 1e6).toFixed(2) + 'M'
  if (a >= 1e3) return sign + (a / 1e3).toFixed(1) + 'K'
  return sign + a.toFixed(0)
}

function copyName(name, e) {
  navigator.clipboard.writeText(name)
  const prev = document.querySelector('.copyable.copied')
  if (prev) prev.classList.remove('copied')
  const el = e?.target
  if (el) {
    el.setAttribute('data-copied-tip', locale.value === 'zh' ? '已复制!' : 'Copied!')
    el.classList.add('copied')
  }
}
</script>

<style scoped>
.t2-table .type-icon { width: 24px; height: 24px; border-radius: 4px; flex: none; }
.t2-table td { padding: 8px 14px; }
.t2-group { font-size: 0.9em; }
.margin { font-weight: 600; }
.t2-missing { color: var(--orange); margin-left: 4px; }
</style>
