/**
 * System search — port of navigation/services/system_search.py
 */

import { getNavigationData } from '../data/loader'
import { locName } from './locale'

export function searchSystems(query, limit = 10) {
  if (!query || query.length < 1) return []
  const data = getNavigationData()
  if (!data) return []

  const q = query.toLowerCase().trim()
  const results = []

  for (const [sidStr, sys] of Object.entries(data.systems)) {
    const matchEn = sys.n.toLowerCase().startsWith(q)
    const matchZh = sys.nz && sys.nz.startsWith(query)
    if (!matchEn && !matchZh) continue

    const region = data.regions[sys.r]
    results.push({
      solar_system_id: parseInt(sidStr),
      solar_system_name: sys.n,
      solar_system_name_zh: sys.nz,
      security: Math.round(sys.s * 10) / 10,
      region_name: locName(region),
    })

    if (results.length >= limit) break
  }

  results.sort((a, b) => a.solar_system_name.localeCompare(b.solar_system_name))
  return results
}
