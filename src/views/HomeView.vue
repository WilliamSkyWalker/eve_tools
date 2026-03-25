<template>
  <div class="home">
    <h1 class="title">{{ t('home.title') }}</h1>

    <div class="server-cards">
      <div class="server-card">
        <div class="server-header">
          <span class="server-name clr-gf">{{ t('server.gf') }}</span>
          <span class="server-status" :class="serenity.online ? 'online' : 'offline'">
            {{ serenity.online ? t('home.online') : t('home.offline') }}
          </span>
        </div>
        <div class="server-players">
          <span class="player-count">{{ serenity.loading ? '...' : formatNumber(serenity.players) }}</span>
          <span class="player-label">{{ t('home.players') }}</span>
        </div>
        <div class="server-kills">
          <span class="kill-count">{{ serenity.loading ? '...' : formatNumber(serenity.shipKills) }}</span>
          <span class="kill-label">{{ t('home.killsLastHour') }}</span>
        </div>
      </div>

      <div class="server-card">
        <div class="server-header">
          <span class="server-name clr-of">{{ t('server.of') }}</span>
          <span class="server-status" :class="tranquility.online ? 'online' : 'offline'">
            {{ tranquility.online ? t('home.online') : t('home.offline') }}
          </span>
        </div>
        <div class="server-players">
          <span class="player-count">{{ tranquility.loading ? '...' : formatNumber(tranquility.players) }}</span>
          <span class="player-label">{{ t('home.players') }}</span>
        </div>
        <div class="server-kills">
          <span class="kill-count">{{ tranquility.loading ? '...' : formatNumber(tranquility.shipKills) }}</span>
          <span class="kill-label">{{ t('home.killsLastHour') }}</span>
        </div>
      </div>
    </div>

    <div class="hotzone-row">
      <div class="hotzone-section">
        <h2 class="section-title"><span class="clr-gf">{{ t('server.gf') }}</span> {{ t('home.hotPvp') }}</h2>
        <div v-if="serenityHotLoading" class="loading-text">{{ t('home.loading') }}</div>
        <table v-else-if="serenityPvpZones.length" class="hotzone-table">
          <thead>
            <tr>
              <th>#</th>
              <th>{{ t('home.region') }}</th>
              <th>{{ t('home.shipKills') }}</th>
              <th>{{ t('home.podKills') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(zone, i) in serenityPvpZones" :key="zone.regionEn">
              <td class="rank">{{ i + 1 }}</td>
              <td class="region-name">{{ regionName(zone) }}</td>
              <td class="kill-val ship">{{ formatNumber(zone.shipKills) }}</td>
              <td class="kill-val pod">{{ formatNumber(zone.podKills) }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="no-data">{{ t('home.noData') }}</p>
      </div>

      <div class="hotzone-section">
        <h2 class="section-title"><span class="clr-of">{{ t('server.of') }}</span> {{ t('home.hotPvp') }}</h2>
        <div v-if="tranquilityHotLoading" class="loading-text">{{ t('home.loading') }}</div>
        <table v-else-if="tranquilityPvpZones.length" class="hotzone-table">
          <thead>
            <tr>
              <th>#</th>
              <th>{{ t('home.region') }}</th>
              <th>{{ t('home.shipKills') }}</th>
              <th>{{ t('home.podKills') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(zone, i) in tranquilityPvpZones" :key="zone.regionEn">
              <td class="rank">{{ i + 1 }}</td>
              <td class="region-name">{{ regionName(zone) }}</td>
              <td class="kill-val ship">{{ formatNumber(zone.shipKills) }}</td>
              <td class="kill-val pod">{{ formatNumber(zone.podKills) }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="no-data">{{ t('home.noData') }}</p>
      </div>
    </div>

    <div class="hotzone-row">
      <div class="hotzone-section">
        <h2 class="section-title"><span class="clr-gf">{{ t('server.gf') }}</span> {{ t('home.hotNpc') }}</h2>
        <div v-if="serenityHotLoading" class="loading-text">{{ t('home.loading') }}</div>
        <table v-else-if="serenityNpcZones.length" class="hotzone-table">
          <thead>
            <tr>
              <th>#</th>
              <th>{{ t('home.region') }}</th>
              <th>{{ t('home.npcKills') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(zone, i) in serenityNpcZones" :key="zone.regionEn">
              <td class="rank">{{ i + 1 }}</td>
              <td class="region-name">{{ regionName(zone) }}</td>
              <td class="kill-val npc">{{ formatNumber(zone.npcKills) }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="no-data">{{ t('home.noData') }}</p>
      </div>

      <div class="hotzone-section">
        <h2 class="section-title"><span class="clr-of">{{ t('server.of') }}</span> {{ t('home.hotNpc') }}</h2>
        <div v-if="tranquilityHotLoading" class="loading-text">{{ t('home.loading') }}</div>
        <table v-else-if="tranquilityNpcZones.length" class="hotzone-table">
          <thead>
            <tr>
              <th>#</th>
              <th>{{ t('home.region') }}</th>
              <th>{{ t('home.npcKills') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(zone, i) in tranquilityNpcZones" :key="zone.regionEn">
              <td class="rank">{{ i + 1 }}</td>
              <td class="region-name">{{ regionName(zone) }}</td>
              <td class="kill-val npc">{{ formatNumber(zone.npcKills) }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="no-data">{{ t('home.noData') }}</p>
      </div>
    </div>
    <div class="hotzone-row">
      <div class="hotzone-section">
        <h2 class="section-title"><span class="clr-gf">{{ t('server.gf') }}</span> {{ t('home.sovCampaigns') }}</h2>
        <div v-if="serenitySovLoading" class="loading-text">{{ t('home.loading') }}</div>
        <table v-else-if="serenitySov.length" class="hotzone-table sov-table">
          <thead>
            <tr>
              <th>{{ t('home.sovSystem') }}</th>
              <th>{{ t('home.sovDefender') }}</th>
              <th>{{ t('home.sovProgress') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in serenitySov" :key="c.campaign_id">
              <td class="region-name">{{ c.systemName }}</td>
              <td class="sov-alliance">{{ c.defenderName }}</td>
              <td class="sov-progress">
                <div class="progress-bar">
                  <div class="progress-def" :style="{ width: (c.defender_score * 100) + '%' }"></div>
                  <div class="progress-atk" :style="{ width: (c.attackers_score * 100) + '%' }"></div>
                </div>
                <span class="progress-text">{{ Math.round(c.defender_score * 100) }}% / {{ Math.round(c.attackers_score * 100) }}%</span>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-else class="no-data">{{ t('home.sovNone') }}</p>
      </div>

      <div class="hotzone-section">
        <h2 class="section-title"><span class="clr-of">{{ t('server.of') }}</span> {{ t('home.sovCampaigns') }}</h2>
        <div v-if="tranquilitySovLoading" class="loading-text">{{ t('home.loading') }}</div>
        <table v-else-if="tranquilitySov.length" class="hotzone-table sov-table">
          <thead>
            <tr>
              <th>{{ t('home.sovSystem') }}</th>
              <th>{{ t('home.sovDefender') }}</th>
              <th>{{ t('home.sovProgress') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in tranquilitySov" :key="c.campaign_id">
              <td class="region-name">{{ c.systemName }}</td>
              <td class="sov-alliance">{{ c.defenderName }}</td>
              <td class="sov-progress">
                <div class="progress-bar">
                  <div class="progress-def" :style="{ width: (c.defender_score * 100) + '%' }"></div>
                  <div class="progress-atk" :style="{ width: (c.attackers_score * 100) + '%' }"></div>
                </div>
                <span class="progress-text">{{ Math.round(c.defender_score * 100) }}% / {{ Math.round(c.attackers_score * 100) }}%</span>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-else class="no-data">{{ t('home.sovNone') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useSettingsStore } from '../stores/settings'
import { useI18n } from '../i18n'
import { loadNavigationData } from '../data/loader'

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
.home {
  padding-top: 40px;
  max-width: 1100px;
  margin: 0 auto;
}

.title {
  color: #c8aa6e;
  font-size: 2em;
  text-align: center;
  margin-bottom: 32px;
}

/* ── Server Cards ── */
.server-cards {
  display: flex;
  gap: 20px;
  justify-content: center;
  margin-bottom: 40px;
}

.server-card {
  flex: 1;
  max-width: 400px;
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 10px;
  padding: 24px;
  transition: border-color 0.2s;
}

.server-card:hover {
  border-color: #333;
}

.server-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.server-name {
  font-size: 1.2em;
  font-weight: 700;
}

.server-status {
  font-size: 0.75em;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
}

.server-status.online {
  color: #4caf50;
  background: rgba(76, 175, 80, 0.12);
}

.server-status.offline {
  color: #ef5350;
  background: rgba(239, 83, 80, 0.12);
}

.server-players {
  margin-bottom: 10px;
}

.player-count {
  font-size: 2em;
  font-weight: 700;
  color: #e6e6e6;
}

.player-label {
  color: #555;
  font-size: 0.85em;
  margin-left: 8px;
}

.kill-count {
  font-size: 1.3em;
  font-weight: 600;
  color: #ef5350;
}

.kill-label {
  color: #555;
  font-size: 0.85em;
  margin-left: 8px;
}

.clr-gf { color: #ff9800; }
.clr-of { color: #4caf50; }

/* ── Hot Zones ── */
.hotzone-row {
  display: flex;
  gap: 20px;
}

.hotzone-section {
  flex: 1;
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 10px;
  padding: 24px;
}

.section-title {
  color: #c8aa6e;
  font-size: 1.1em;
  margin-bottom: 16px;
}

.loading-text {
  color: #555;
  text-align: center;
  padding: 20px;
}

.no-data {
  color: #555;
  text-align: center;
  padding: 20px;
}

.hotzone-table {
  width: 100%;
  border-collapse: collapse;
}

.hotzone-table th {
  color: #8a8a8a;
  font-size: 0.8em;
  font-weight: 600;
  text-align: right;
  padding: 6px 12px;
  border-bottom: 1px solid #2a2a2a;
}

.hotzone-table th:first-child,
.hotzone-table th:nth-child(2) {
  text-align: left;
}

.hotzone-table td {
  padding: 8px 12px;
  border-bottom: 1px solid #1a1a1a;
}

.rank {
  color: #555;
  font-size: 0.85em;
  width: 30px;
}

.region-name {
  color: #e6e6e6;
  font-weight: 500;
}

.kill-val {
  text-align: right;
  font-size: 0.9em;
  font-variant-numeric: tabular-nums;
}

.kill-val.ship { color: #ef5350; }
.kill-val.pod { color: #ff9800; }
.kill-val.npc { color: #8a8a8a; }

/* ── Sovereignty ── */
.hotzone-row + .hotzone-row {
  margin-top: 20px;
}

.sov-table th {
  text-align: left;
}

.sov-type {
  color: #c8aa6e;
  font-size: 0.85em;
}

.sov-alliance {
  color: #8a8a8a;
  font-size: 0.85em;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sov-progress {
  min-width: 120px;
}

.progress-bar {
  display: flex;
  height: 6px;
  border-radius: 3px;
  background: #2a2a2a;
  overflow: hidden;
  margin-bottom: 3px;
}

.progress-def {
  background: #4caf50;
  height: 100%;
}

.progress-atk {
  background: #ef5350;
  height: 100%;
}

.progress-text {
  color: #555;
  font-size: 0.75em;
  font-variant-numeric: tabular-nums;
}
</style>
