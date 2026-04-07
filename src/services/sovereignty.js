/**
 * Sovereignty map service — fetches sov data from ESI, builds influence data.
 */

const ESI = {
  serenity: 'https://ali-esi.evepc.163.com/latest',
  tranquility: 'https://esi.evetech.net/latest',
}

async function fetchJson(url) {
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  return resp.json()
}

/**
 * Fetch sovereignty map from ESI.
 * Returns array of { alliance_id, faction_id, system_id }.
 */
export async function fetchSovereigntyMap(datasource) {
  const base = ESI[datasource]
  return fetchJson(`${base}/sovereignty/map/?datasource=${datasource}`)
}

/**
 * Resolve alliance IDs to names via ESI POST /universe/names/.
 */
export async function fetchAllianceNames(datasource, ids) {
  if (!ids.length) return {}
  const base = ESI[datasource]
  const unique = [...new Set(ids)]
  const map = {}
  for (let i = 0; i < unique.length; i += 1000) {
    const batch = unique.slice(i, i + 1000)
    try {
      const resp = await fetch(`${base}/universe/names/?datasource=${datasource}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batch),
      })
      if (!resp.ok) continue
      const data = await resp.json()
      for (const item of data) map[item.id] = item.name
    } catch { /* skip batch */ }
  }
  return map
}

/**
 * Build sovereignty data for rendering.
 * Returns { systems, regions, allianceCentroids }
 */
export function buildSovData(navData, sovData) {
  // Build sov lookup: system_id -> alliance_id
  const sovLookup = {}
  for (const entry of sovData) {
    if (entry.alliance_id) {
      sovLookup[entry.system_id] = entry.alliance_id
    }
  }

  // Flat list of nullsec systems with sov info
  const systems = []
  const regionMap = {}

  for (const [sysId, sys] of Object.entries(navData.systems)) {
    if (sys.s >= 0.0) continue
    const regionId = sys.r
    if (regionId >= 11000000) continue
    const region = navData.regions?.[regionId]
    if (!region) continue

    const allianceId = sovLookup[Number(sysId)] || null
    systems.push({
      id: Number(sysId),
      x: sys.x,
      z: sys.z,
      regionId,
      allianceId,
    })

    // Build region aggregation
    if (!regionMap[regionId]) {
      regionMap[regionId] = {
        id: regionId,
        name: region.n,
        nameZh: region.nz || '',
        systems: [],
        allianceCounts: {},
        totalSov: 0,
        dominant: null,
        centroid: { x: 0, z: 0 },
      }
    }
    regionMap[regionId].systems.push({ id: Number(sysId), x: sys.x, z: sys.z })
    if (allianceId) {
      regionMap[regionId].allianceCounts[allianceId] = (regionMap[regionId].allianceCounts[allianceId] || 0) + 1
      regionMap[regionId].totalSov++
    }
  }

  // Finalize regions
  for (const region of Object.values(regionMap)) {
    let maxCount = 0
    for (const [aid, count] of Object.entries(region.allianceCounts)) {
      if (count > maxCount) {
        maxCount = count
        region.dominant = { id: Number(aid), count }
      }
    }
    let cx = 0, cz = 0
    for (const sys of region.systems) {
      cx += sys.x
      cz += sys.z
    }
    region.centroid.x = cx / region.systems.length
    region.centroid.z = cz / region.systems.length
  }

  // Alliance centroids (for labeling)
  const allianceSystems = {}
  for (const sys of systems) {
    if (!sys.allianceId) continue
    if (!allianceSystems[sys.allianceId]) allianceSystems[sys.allianceId] = []
    allianceSystems[sys.allianceId].push(sys)
  }
  const allianceCentroids = {}
  for (const [aid, sysList] of Object.entries(allianceSystems)) {
    let cx = 0, cz = 0
    for (const s of sysList) { cx += s.x; cz += s.z }
    allianceCentroids[aid] = {
      x: cx / sysList.length,
      z: cz / sysList.length,
      count: sysList.length,
    }
  }

  return { systems, regions: regionMap, allianceCentroids }
}

/**
 * Generate RGB color for an alliance ID.
 */
export function allianceColorRGB(allianceId) {
  const h = ((allianceId * 2654435761) >>> 0) % 360
  // HSL to RGB conversion
  const s = 0.75, l = 0.55
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let r, g, b
  if (h < 60)       { r = c; g = x; b = 0 }
  else if (h < 120) { r = x; g = c; b = 0 }
  else if (h < 180) { r = 0; g = c; b = x }
  else if (h < 240) { r = 0; g = x; b = c }
  else if (h < 300) { r = x; g = 0; b = c }
  else              { r = c; g = 0; b = x }
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ]
}

export function allianceColorSolid(allianceId) {
  const [r, g, b] = allianceColorRGB(allianceId)
  return `rgb(${r},${g},${b})`
}
