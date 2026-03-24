/**
 * Wormhole system search — port of navigation/services/wormhole_search.py
 */

import { getNavigationData, getWormholeData } from '../data/loader'
import { locName } from './locale'

const CLASS_DISPLAY = {
  1: 'C1', 2: 'C2', 3: 'C3', 4: 'C4', 5: 'C5', 6: 'C6',
  12: 'Thera', 13: 'Shattered',
  14: 'Sentinel', 15: 'Barbican', 16: 'Vidette',
  17: 'Conflux', 18: 'Redoubt',
}

const CLASS_LOOKUP = {}
for (const [k, v] of Object.entries(CLASS_DISPLAY)) {
  CLASS_LOOKUP[v.toLowerCase()] = parseInt(k)
  CLASS_LOOKUP[`c${k}`] = parseInt(k)
}

function serializeSystem(sysId, whSys) {
  const navData = getNavigationData()
  const sys = navData?.systems[sysId]
  if (!sys) return null

  const region = navData.regions[sys.r]
  return {
    solar_system_id: parseInt(sysId),
    solar_system_name: sys.n,
    solar_system_name_zh: sys.nz,
    region_name: locName(region),
    security: Math.round(sys.s * 100) / 100,
    wormhole_class: whSys.c,
    class_display: CLASS_DISPLAY[whSys.c] || `C${whSys.c}`,
    effect: whSys.e,
    statics: whSys.s,
  }
}

export function searchWormholeSystems(query, whClass = null, effect = null, limit = 50) {
  const whData = getWormholeData()
  const navData = getNavigationData()
  if (!whData || !navData) return []

  let entries = Object.entries(whData.systems)

  // Filter by class
  if (whClass != null) {
    entries = entries.filter(([, wh]) => wh.c === whClass)
  }

  // Filter by effect
  if (effect) {
    const eff = effect.toLowerCase()
    entries = entries.filter(([, wh]) => wh.e.toLowerCase() === eff)
  }

  // Text search
  if (query) {
    const qLower = query.trim().toLowerCase()
    // Check if query is a class reference
    if (qLower in CLASS_LOOKUP && whClass == null) {
      const cls = CLASS_LOOKUP[qLower]
      entries = entries.filter(([, wh]) => wh.c === cls)
    } else {
      entries = entries.filter(([sid]) => {
        const sys = navData.systems[sid]
        if (!sys) return false
        return sys.n.toLowerCase().startsWith(qLower) ||
               (sys.nz && sys.nz.startsWith(query))
      })
    }
  }

  // Sort and limit
  entries.sort(([a], [b]) => {
    const sysA = navData.systems[a]
    const sysB = navData.systems[b]
    return (sysA?.n || '').localeCompare(sysB?.n || '')
  })

  return entries.slice(0, limit)
    .map(([sid, wh]) => serializeSystem(sid, wh))
    .filter(Boolean)
}

export function getWormholeSystem(systemId) {
  const whData = getWormholeData()
  if (!whData) return null

  const whSys = whData.systems[systemId]
  if (!whSys) return null

  const data = serializeSystem(systemId, whSys)
  if (!data) return null

  // Resolve static wormhole type details
  if (whSys.s?.length) {
    data.static_details = whSys.s.map(designation => {
      const info = { designation }
      const whType = whData.types[designation]
      if (whType) {
        info.target_class = whType.tc
        info.target_class_display = CLASS_DISPLAY[whType.tc] || `C${whType.tc}`
        info.max_stable_time = whType.st
        info.max_stable_mass = whType.sm
        info.max_jump_mass = whType.jm
        info.mass_regen = whType.mr
      }
      return info
    })
  }

  return data
}

export function listWormholeTypes() {
  const whData = getWormholeData()
  if (!whData) return []

  return Object.entries(whData.types)
    .map(([designation, wt]) => ({
      type_id: wt.id,
      designation,
      target_class: wt.tc,
      target_class_display: CLASS_DISPLAY[wt.tc] || `C${wt.tc}`,
      max_stable_time: wt.st,
      max_stable_mass: wt.sm,
      max_jump_mass: wt.jm,
      mass_regen: wt.mr,
    }))
    .sort((a, b) => a.target_class - b.target_class || a.designation.localeCompare(b.designation))
}
