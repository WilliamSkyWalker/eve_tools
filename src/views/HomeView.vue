<template>
  <div class="home">
    <div class="page-head">
      <div class="titles">
        <h1>{{ t('home.title') }}<PageHelp topic="home" /></h1>
        <p class="sub">{{ t('home.hotPvp') }} · {{ t('home.hotNpc') }} · {{ t('home.sovCampaigns') }}</p>
      </div>
    </div>

    <!-- Server KPI tiles -->
    <div class="kpi-row">
      <div class="card kpi" v-for="s in [{ st: serenity, key: 'gf' }, { st: tranquility, key: 'of' }]" :key="s.key">
        <div class="kpi-badge" :class="s.key">
          <span class="dot" :class="{ live: s.st.online, dead: !s.st.online && !s.st.loading }"></span>
          {{ t('server.' + s.key) }}
          <span class="kpi-status" :class="s.st.online ? 'online' : 'offline'">
            {{ s.st.loading ? '…' : (s.st.online ? t('home.online') : t('home.offline')) }}
          </span>
        </div>
        <div class="kpi-stats">
          <div class="stat-block">
            <span class="v num">{{ s.st.loading ? '…' : formatNumber(s.st.players) }}</span>
            <span class="l">{{ t('home.players') }}</span>
          </div>
          <div class="stat-block">
            <span class="v num kills">{{ s.st.loading ? '…' : formatNumber(s.st.shipKills) }}</span>
            <span class="l">{{ t('home.killsLastHour') }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- PvP hot zones -->
    <div class="grid-2">
      <div class="card" v-for="col in [
        { key: 'gf', loading: serenityHotLoading, zones: serenityPvpZones },
        { key: 'of', loading: tranquilityHotLoading, zones: tranquilityPvpZones }
      ]" :key="'pvp-' + col.key">
        <div class="panel-head"><span class="srv-chip" :class="col.key">{{ t('server.' + col.key) }}</span>{{ t('home.hotPvp') }}</div>
        <div v-if="col.loading" class="state-msg">{{ t('home.loading') }}</div>
        <table v-else-if="col.zones.length" class="data-table">
          <thead><tr><th class="rank">#</th><th>{{ t('home.region') }}</th><th class="r">{{ t('home.shipKills') }}</th><th class="r">{{ t('home.podKills') }}</th></tr></thead>
          <tbody>
            <tr v-for="(zone, i) in col.zones" :key="zone.regionEn">
              <td class="rank">{{ i + 1 }}</td>
              <td class="cell-name">{{ regionName(zone) }}</td>
              <td class="r num t-red">{{ formatNumber(zone.shipKills) }}</td>
              <td class="r num t-orange">{{ formatNumber(zone.podKills) }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="state-msg">{{ t('home.noData') }}</p>
      </div>
    </div>

    <!-- NPC hot zones -->
    <div class="grid-2">
      <div class="card" v-for="col in [
        { key: 'gf', loading: serenityHotLoading, zones: serenityNpcZones },
        { key: 'of', loading: tranquilityHotLoading, zones: tranquilityNpcZones }
      ]" :key="'npc-' + col.key">
        <div class="panel-head"><span class="srv-chip" :class="col.key">{{ t('server.' + col.key) }}</span>{{ t('home.hotNpc') }}</div>
        <div v-if="col.loading" class="state-msg">{{ t('home.loading') }}</div>
        <table v-else-if="col.zones.length" class="data-table">
          <thead><tr><th class="rank">#</th><th>{{ t('home.region') }}</th><th class="r">{{ t('home.npcKills') }}</th></tr></thead>
          <tbody>
            <tr v-for="(zone, i) in col.zones" :key="zone.regionEn">
              <td class="rank">{{ i + 1 }}</td>
              <td class="cell-name">{{ regionName(zone) }}</td>
              <td class="r num t-muted">{{ formatNumber(zone.npcKills) }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="state-msg">{{ t('home.noData') }}</p>
      </div>
    </div>

    <!-- Sovereignty campaigns -->
    <div class="grid-2">
      <div class="card" v-for="col in [
        { key: 'gf', loading: serenitySovLoading, sov: serenitySov },
        { key: 'of', loading: tranquilitySovLoading, sov: tranquilitySov }
      ]" :key="'sov-' + col.key">
        <div class="panel-head"><span class="srv-chip" :class="col.key">{{ t('server.' + col.key) }}</span>{{ t('home.sovCampaigns') }}</div>
        <div v-if="col.loading" class="state-msg">{{ t('home.loading') }}</div>
        <table v-else-if="col.sov.length" class="data-table">
          <thead><tr><th>{{ t('home.sovSystem') }}</th><th>{{ t('home.sovDefender') }}</th><th style="width:40%">{{ t('home.sovProgress') }}</th></tr></thead>
          <tbody>
            <tr v-for="c in col.sov" :key="c.campaign_id">
              <td class="cell-name">{{ c.systemName }}</td>
              <td class="sov-alliance t-muted">{{ c.defenderName }}</td>
              <td>
                <div class="progress-bar">
                  <div class="progress-def" :style="{ width: (c.defender_score * 100) + '%' }"></div>
                  <div class="progress-atk" :style="{ width: (c.attackers_score * 100) + '%' }"></div>
                </div>
                <span class="num progress-text">{{ Math.round(c.defender_score * 100) }}% / {{ Math.round(c.attackers_score * 100) }}%</span>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-else class="state-msg">{{ t('home.sovNone') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useSettingsStore } from '../stores/settings'
import { useI18n } from '../i18n'
import { loadNavigationData } from '../data/loader'
import PageHelp from '../components/layout/PageHelp.vue'

const settings = useSettingsStore()
const { t, locale } = useI18n()

function regionName(zone) {
  return (locale.value === 'zh' && zone.regionZh) ? zone.regionZh : zone.regionEn
}

const ESI = {
  serenity: 'https://ali-esi.evepc.163.com/latest',
  tranquility: 'https://esi.evetech.net/latest',
}

const serenity = reactive({ players: 0, online: false, shipKills: 0, loading: true })
const tranquility = reactive({ players: 0, online: false, shipKills: 0, loading: true })
const serenityPvpZones = ref([])
const serenityNpcZones = ref([])
const tranquilityPvpZones = ref([])
const tranquilityNpcZones = ref([])
const serenityHotLoading = ref(true)
const tranquilityHotLoading = ref(true)
const serenitySov = ref([])
const tranquilitySov = ref([])
const serenitySovLoading = ref(true)
const tranquilitySovLoading = ref(true)

function formatNumber(n) {
  return n != null ? n.toLocaleString() : '—'
}

async function fetchJson(url) {
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  return resp.json()
}

async function fetchServerStatus(datasource, state) {
  try {
    const data = await fetchJson(`${ESI[datasource]}/status/?datasource=${datasource}`)
    state.players = data.players || 0
    state.online = true
  } catch {
    state.online = false
  }
}

async function fetchKills(datasource, state) {
  try {
    const data = await fetchJson(`${ESI[datasource]}/universe/system_kills/?datasource=${datasource}`)
    state.shipKills = data.reduce((sum, s) => sum + (s.ship_kills || 0), 0)
    return data
  } catch {
    state.shipKills = 0
    return []
  }
}

async function buildHotZones(killData, navData) {
  const regionMap = {}
  for (const sys of killData) {
    const sysInfo = navData?.systems?.[sys.system_id]
    const regionId = sysInfo?.r
    if (!regionId) continue
    if (!regionMap[regionId]) {
      const region = navData.regions?.[regionId]
      regionMap[regionId] = {
        regionEn: region?.n || String(regionId),
        regionZh: region?.nz || '',
        shipKills: 0,
        podKills: 0,
        npcKills: 0,
      }
    }
    regionMap[regionId].shipKills += sys.ship_kills || 0
    regionMap[regionId].podKills += sys.pod_kills || 0
    regionMap[regionId].npcKills += sys.npc_kills || 0
  }

  const regions = Object.values(regionMap)
  return {
    pvp: [...regions].sort((a, b) => b.shipKills - a.shipKills).slice(0, 10),
    npc: [...regions].sort((a, b) => b.npcKills - a.npcKills).slice(0, 10),
  }
}

async function fetchNames(datasource, ids) {
  if (!ids.length) return {}
  const base = ESI[datasource]
  try {
    const resp = await fetch(`${base}/universe/names/?datasource=${datasource}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([...new Set(ids)]),
    })
    if (!resp.ok) return {}
    const data = await resp.json()
    const map = {}
    for (const item of data) map[item.id] = item.name
    return map
  } catch { return {} }
}

async function fetchSovCampaigns(datasource, navData) {
  try {
    const data = await fetchJson(`${ESI[datasource]}/sovereignty/campaigns/?datasource=${datasource}`)
    if (!data.length) return []

    // Collect IDs to resolve
    const systemIds = data.map(c => c.solar_system_id)
    const allianceIds = data.map(c => c.defender_id).filter(Boolean)
    const names = await fetchNames(datasource, [...systemIds, ...allianceIds])

    return data.map(c => {
      // Try navData for system name first (supports zh)
      const sys = navData?.systems?.[c.solar_system_id]
      const sysNameEn = sys?.n || names[c.solar_system_id] || String(c.solar_system_id)
      const sysNameZh = sys?.nz || ''
      return {
        ...c,
        systemName: (locale.value === 'zh' && sysNameZh) ? sysNameZh : sysNameEn,
        defenderName: names[c.defender_id] || '—',
      }
    })
  } catch { return [] }
}

onMounted(async () => {
  let navData = null
  try {
    navData = await loadNavigationData()
  } catch { /* ignore */ }

  // Fetch both servers in parallel
  const [, , gfKills, ofKills] = await Promise.all([
    fetchServerStatus('serenity', serenity).finally(() => { serenity.loading = false }),
    fetchServerStatus('tranquility', tranquility).finally(() => { tranquility.loading = false }),
    fetchKills('serenity', serenity).finally(() => { serenity.loading = false }),
    fetchKills('tranquility', tranquility).finally(() => { tranquility.loading = false }),
  ])

  const gfZones = await buildHotZones(gfKills, navData)
  serenityPvpZones.value = gfZones.pvp
  serenityNpcZones.value = gfZones.npc
  serenityHotLoading.value = false

  const ofZones = await buildHotZones(ofKills, navData)
  tranquilityPvpZones.value = ofZones.pvp
  tranquilityNpcZones.value = ofZones.npc
  tranquilityHotLoading.value = false

  // Fetch sovereignty campaigns
  fetchSovCampaigns('serenity', navData).then(d => { serenitySov.value = d }).finally(() => { serenitySovLoading.value = false })
  fetchSovCampaigns('tranquility', navData).then(d => { tranquilitySov.value = d }).finally(() => { tranquilitySovLoading.value = false })
})
</script>

<style scoped>
.home { max-width: 1160px; margin: 0 auto; }

/* ── KPI tiles ── */
.kpi-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
.kpi { display: flex; align-items: center; gap: 24px; padding: 18px 22px; flex-wrap: wrap; }
.kpi-badge {
  display: flex; align-items: center; gap: 9px;
  font-size: 15px; font-weight: 700; min-width: 130px;
}
.kpi-badge.gf { color: var(--gf); }
.kpi-badge.of { color: var(--of); }
.dot { width: 8px; height: 8px; border-radius: 50%; background: var(--text-dim); flex: none; }
.dot.live { background: var(--green); box-shadow: 0 0 0 3px var(--green-bg); }
.dot.dead { background: var(--red); box-shadow: 0 0 0 3px var(--red-bg); }
.kpi-status { font-size: 11px; font-weight: 600; color: var(--text-dim); }
.kpi-status.online { color: var(--green); }
.kpi-status.offline { color: var(--red); }
.kpi-stats { display: flex; gap: 32px; margin-left: auto; }
.stat-block { display: flex; flex-direction: column; }
.stat-block .v { font-size: 26px; font-weight: 700; line-height: 1.15; color: var(--text-primary); }
.stat-block .v.kills { color: var(--red); }
.stat-block .l { font-size: 11.5px; color: var(--text-dim); }

/* ── Hot-zone grid ── */
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
.sov-alliance { max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.9em; }

.progress-bar { display: flex; height: 5px; border-radius: 3px; background: var(--bg-elevated); overflow: hidden; margin-bottom: 4px; }
.progress-def { background: var(--green); height: 100%; }
.progress-atk { background: var(--red); height: 100%; }
.progress-text { color: var(--text-dim); font-size: 0.72em; }

@media (max-width: 760px) {
  .kpi-row, .grid-2 { grid-template-columns: 1fr; }
  .kpi-stats { margin-left: 0; }
}
</style>
