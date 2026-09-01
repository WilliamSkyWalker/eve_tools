<template>
  <div class="guide-page">
    <div class="page-head">
      <div class="titles">
        <h1>{{ t('guides.title') }} <PageHelp topic="guides" /></h1>
        <p class="sub">{{ t('guides.subtitle') }}</p>
      </div>
      <div v-if="data" class="toolbar">
        <span class="source-note">{{ t('guides.updated') }} <span class="num">{{ generatedDate }}</span></span>
      </div>
    </div>

    <div v-if="loading" class="state-msg">{{ t('guides.loading') }}</div>
    <div v-else-if="error" class="state-msg error-text">{{ t('guides.error') }}</div>

    <template v-else-if="data && selectedGuide">
      <router-link :to="`/${server}/guides`" class="btn ghost sm back-link">← {{ t('guides.back') }}</router-link>

      <article class="guide-detail">
        <div class="card guide-summary">
          <div class="guide-title-row">
            <div>
              <span class="type-badge" :class="`type-${selectedGuide.type}`">{{ typeLabel(selectedGuide.type) }}</span>
              <h2>{{ guideTitle(selectedGuide) }}</h2>
              <p v-if="locale === 'zh' && selectedGuide.zh?.title" class="english-name">{{ selectedGuide.title }}</p>
            </div>
            <a :href="selectedGuide.source.url" target="_blank" rel="noopener" class="btn ghost sm">
              {{ t('guides.openSource') }} ↗
            </a>
          </div>

          <div class="facts-grid">
            <div v-if="selectedGuide.level" class="fact">
              <span class="eyebrow">{{ t('guides.level') }}</span>
              <strong class="num">L{{ selectedGuide.level }}</strong>
            </div>
            <div v-if="selectedGuide.rating" class="fact">
              <span class="eyebrow">{{ t('guides.rating') }}</span>
              <strong>{{ selectedGuide.rating }}</strong>
            </div>
            <div v-if="selectedGuide.faction" class="fact">
              <span class="eyebrow">{{ t('guides.faction') }}</span>
              <strong>{{ selectedGuide.faction }}</strong>
            </div>
            <div v-if="selectedGuide.location" class="fact">
              <span class="eyebrow">{{ t('guides.location') }}</span>
              <strong>{{ selectedGuide.location }}</strong>
            </div>
            <div v-if="selectedGuide.shipSuggestion" class="fact">
              <span class="eyebrow">{{ t('guides.shipSuggestion') }}</span>
              <strong class="t-green">{{ selectedGuide.shipSuggestion }}</strong>
            </div>
            <div class="fact restriction-fact">
              <span class="eyebrow">{{ t('guides.shipLimit') }}</span>
              <strong class="restriction-badge" :class="`restriction-${restrictionStatus(selectedGuide)}`">
                {{ restrictionLabel(selectedGuide) }}
              </strong>
            </div>
            <div v-if="selectedGuide.damageToDeal" class="fact">
              <span class="eyebrow">{{ t('guides.damageToDeal') }}</span>
              <strong class="t-orange">{{ selectedGuide.damageToDeal }}</strong>
            </div>
            <div v-if="selectedGuide.damageToResist" class="fact">
              <span class="eyebrow">{{ t('guides.damageToResist') }}</span>
              <strong class="t-blue">{{ selectedGuide.damageToResist }}</strong>
            </div>
            <div v-if="selectedGuide.ewar" class="fact">
              <span class="eyebrow">{{ t('guides.ewar') }}</span>
              <strong class="t-red">{{ selectedGuide.ewar }}</strong>
            </div>
          </div>
        </div>

        <div v-if="selectedGuide.sections.length" class="card prose-card">
          <div class="panel-head">{{ t('guides.tactics') }}</div>
          <section v-for="(section, sectionIndex) in selectedGuide.sections" :key="section.heading" class="prose-section">
            <h3>{{ sectionHeading(selectedGuide, section, sectionIndex) }}</h3>
            <p>{{ sectionText(selectedGuide, section, sectionIndex) }}</p>
          </section>
        </div>

        <div v-if="selectedGuide.groups.length" class="card encounters-card">
          <div class="panel-head">
            {{ t('guides.encounters') }}
            <span class="more num">{{ selectedGuide.groups.length }}</span>
          </div>
          <details v-for="(group, index) in selectedGuide.groups" :key="`${group.name}-${index}`" :open="index === 0">
            <summary>
              <span>{{ group.name }}</span>
              <span class="num t-dim">{{ group.rows.length }}</span>
            </summary>
            <div class="table-scroll">
              <table class="data-table">
                <thead>
                  <tr>
                    <th class="c">{{ t('guides.quantity') }}</th>
                    <th>{{ t('guides.enemyClass') }}</th>
                    <th>{{ t('guides.enemy') }}</th>
                    <th>{{ t('guides.trigger') }}</th>
                    <th>{{ t('guides.ewar') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, rowIndex) in group.rows" :key="rowIndex">
                    <td class="c num">{{ row.quantity }}</td>
                    <td class="t-muted">{{ row.class }}</td>
                    <td>{{ row.name }}</td>
                    <td :class="{ 't-orange': row.trigger }">{{ row.trigger || row.note || '—' }}</td>
                    <td :class="{ 't-red': row.ewar }">{{ row.ewar || '—' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </details>
        </div>

        <p class="license-note">
          {{ t('guides.licensePrefix') }}
          <a :href="selectedGuide.source.url" target="_blank" rel="noopener">EVE University Wiki</a>
          · CC BY-SA 4.0 · rev. <span class="num">{{ selectedGuide.source.revisionId }}</span>
          <span v-if="locale === 'zh'"> · {{ t('guides.machineTranslated') }}</span>
        </p>
      </article>
    </template>

    <template v-else-if="data">
      <div class="card filters-card">
        <div class="filter-grid">
          <div class="field search-field">
            <label>{{ t('guides.search') }}</label>
            <input v-model="query" class="inp" :placeholder="t('guides.searchPlaceholder')" />
          </div>
          <div class="field">
            <label>{{ t('guides.category') }}</label>
            <select v-model="type" class="sel">
              <option value="">{{ t('guides.allCategories') }}</option>
              <option v-for="item in facets.types" :key="item" :value="item">{{ typeLabel(item) }}</option>
            </select>
          </div>
          <div class="field">
            <label>{{ t('guides.level') }}</label>
            <select v-model="level" class="sel">
              <option value="">{{ t('guides.allLevels') }}</option>
              <option v-for="value in 5" :key="value" :value="value">L{{ value }}</option>
            </select>
          </div>
          <div class="field">
            <label>{{ t('guides.faction') }}</label>
            <select v-model="faction" class="sel">
              <option value="">{{ t('guides.allFactions') }}</option>
              <option v-for="item in facets.factions" :key="item" :value="item">{{ item }}</option>
            </select>
          </div>
        </div>
        <div class="quick-filters">
          <button class="btn sm" :class="{ primary: type === 'mission' && level === 5 }" @click="showLevelFive">
            {{ t('guides.levelFive') }}
          </button>
          <button v-if="hasFilters" class="btn ghost sm" @click="clearFilters">{{ t('guides.clear') }}</button>
          <span class="result-count"><strong class="num">{{ filtered.length }}</strong> {{ t('guides.results') }}</span>
        </div>
      </div>

      <div v-if="filtered.length" class="card table-scroll guide-list-card">
        <table class="data-table guide-table">
          <thead>
            <tr>
              <th>{{ t('guides.name') }}</th>
              <th>{{ t('guides.category') }}</th>
              <th class="c">{{ t('guides.levelRating') }}</th>
              <th>{{ t('guides.faction') }}</th>
              <th>{{ t('guides.shipSuggestion') }}</th>
              <th>{{ t('guides.shipLimit') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="guide in filtered" :key="guide.slug">
              <td>
                <router-link :to="`/${server}/guides/${guide.slug}`" class="guide-link">{{ guideTitle(guide) }}</router-link>
                <span v-if="locale === 'zh' && guide.zh?.title" class="english-name list-english">{{ guide.title }}</span>
              </td>
              <td><span class="type-badge" :class="`type-${guide.type}`">{{ typeLabel(guide.type) }}</span></td>
              <td class="c num">{{ guide.level ? `L${guide.level}` : guide.rating || '—' }}</td>
              <td class="t-muted">{{ guide.faction || '—' }}</td>
              <td class="t-muted">{{ guide.shipSuggestion || '—' }}</td>
              <td>
                <span class="restriction-badge" :class="`restriction-${restrictionStatus(guide)}`">
                  {{ restrictionLabel(guide) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="state-msg">{{ t('guides.noResults') }}</div>

      <p class="license-note">
        {{ t('guides.catalogLicense') }}
        <a href="https://wiki.eveuniversity.org/" target="_blank" rel="noopener">EVE University Wiki</a>
        · CC BY-SA 4.0
        <span v-if="locale === 'zh'"> · {{ t('guides.machineTranslated') }}</span>
      </p>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from '../i18n'
import { useSettingsStore } from '../stores/settings'
import { loadGuideData } from '../data/loader'
import {
  filterGuides,
  guideFacets,
  shipRestrictionLabel,
  shipRestrictionStatus,
} from '../services/guides'
import PageHelp from '../components/layout/PageHelp.vue'

const route = useRoute()
const settings = useSettingsStore()
const { t, locale } = useI18n()

const data = ref(null)
const loading = ref(true)
const error = ref(false)
const query = ref('')
const type = ref('')
const level = ref('')
const faction = ref('')

const server = computed(() => settings.server)
const facets = computed(() => guideFacets(data.value?.guides || []))
const filtered = computed(() => filterGuides(data.value?.guides || [], {
  query: query.value,
  type: type.value,
  level: level.value,
  faction: faction.value,
}))
const selectedGuide = computed(() =>
  data.value?.guides.find(guide => guide.slug === route.params.slug) || null)
const generatedDate = computed(() =>
  data.value ? new Date(data.value.generatedAt).toLocaleDateString() : '')
const hasFilters = computed(() => Boolean(query.value || type.value || level.value || faction.value))

function typeLabel(value) {
  return t(`guides.type.${value}`)
}

function guideTitle(guide) {
  return locale.value === 'zh' ? guide.zh?.title || guide.title : guide.title
}

function sectionHeading(guide, section, index) {
  return locale.value === 'zh' ? guide.zh?.sections?.[index]?.heading || section.heading : section.heading
}

function sectionText(guide, section, index) {
  return locale.value === 'zh' ? guide.zh?.sections?.[index]?.text || section.text : section.text
}

function restrictionStatus(guide) {
  return shipRestrictionStatus(guide)
}

function restrictionLabel(guide) {
  return shipRestrictionLabel(guide, locale.value)
}

function showLevelFive() {
  type.value = 'mission'
  level.value = 5
}

function clearFilters() {
  query.value = ''
  type.value = ''
  level.value = ''
  faction.value = ''
}

onMounted(async () => {
  try {
    data.value = await loadGuideData()
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.guide-page { max-width: 1280px; margin: 0 auto; }
.source-note, .result-count, .license-note { color: var(--text-dim); font-size: var(--text-xs); }
.filters-card { padding: 16px; margin-bottom: 16px; }
.filter-grid { display: grid; grid-template-columns: minmax(260px, 2fr) repeat(3, minmax(150px, 1fr)); gap: 12px; }
.quick-filters { display: flex; align-items: center; gap: 8px; margin-top: 12px; }
.result-count { margin-left: auto; }
.guide-list-card { overflow: hidden; }
.guide-table td { vertical-align: middle; }
.guide-link { color: var(--text-primary); font-weight: 600; }
.guide-link:hover { color: var(--gold-hover); }
.type-badge { display: inline-flex; padding: 2px 7px; border-radius: var(--radius-sm); font-size: var(--text-xs); white-space: nowrap; }
.type-mission { color: var(--blue); background: var(--blue-bg); }
.type-anomaly { color: var(--green); background: var(--green-bg); }
.type-ded { color: var(--red); background: var(--red-bg); }
.type-unrated { color: var(--orange); background: var(--orange-bg); }
.type-expedition { color: var(--purple); background: var(--purple-bg); }
.restriction-badge { display: inline-flex; max-width: 360px; padding: 3px 8px; border-radius: var(--radius-sm); font-size: var(--text-xs); line-height: 1.4; }
.restriction-limited { color: var(--orange); background: var(--orange-bg); }
.restriction-unrestricted { color: var(--green); background: var(--green-bg); }
.restriction-unknown { color: var(--text-dim); background: var(--bg-elevated); }
.back-link { margin-bottom: 12px; }
.guide-detail { display: grid; gap: 14px; }
.guide-summary { padding: 18px; }
.guide-title-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.guide-title-row h2 { margin-top: 7px; font-size: 24px; }
.english-name { display: block; margin-top: 3px; color: var(--text-dim); font-size: var(--text-sm); font-weight: 400; }
.list-english { margin-top: 1px; font-size: var(--text-xs); }
.facts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 1px; margin-top: 18px; background: var(--border-default); border: 1px solid var(--border-default); border-radius: var(--radius-md); overflow: hidden; }
.fact { display: flex; flex-direction: column; gap: 4px; min-height: 72px; padding: 12px; background: var(--bg-panel-2); }
.fact strong { font-size: var(--text-base); }
.prose-card, .encounters-card { overflow: hidden; }
.prose-section { padding: 14px 16px; border-bottom: 1px solid var(--border-default); }
.prose-section:last-child { border-bottom: 0; }
.prose-section h3 { color: var(--gold); font-size: var(--text-base); margin-bottom: 5px; }
.prose-section p { color: var(--text-secondary); line-height: 1.7; white-space: pre-line; }
details { border-bottom: 1px solid var(--border-default); }
details:last-child { border-bottom: 0; }
summary { display: flex; justify-content: space-between; gap: 12px; padding: 11px 16px; cursor: pointer; color: var(--text-secondary); font-weight: 600; }
summary:hover { background: var(--bg-elevated); }
.license-note { text-align: center; padding: 4px 10px 0; }

@media (max-width: 800px) {
  .filter-grid { grid-template-columns: 1fr 1fr; }
  .search-field { grid-column: 1 / -1; }
  .guide-table th:nth-child(4), .guide-table td:nth-child(4),
  .guide-table th:nth-child(5), .guide-table td:nth-child(5) { display: none; }
}
@media (max-width: 520px) {
  .filter-grid { grid-template-columns: 1fr; }
  .search-field { grid-column: auto; }
  .guide-title-row { flex-direction: column; }
  .guide-table th:nth-child(2), .guide-table td:nth-child(2) { display: none; }
}
</style>
