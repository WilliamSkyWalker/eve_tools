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

// Wormhole effect multipliers by class (C1-C6)
// Values represent the multiplier applied (e.g., 0.85 = -15%, 1.30 = +30%)
const EFFECT_MULTIPLIERS = {
  'Black Hole': [
    { attr: 'missileVelocity',    values: [1.15, 1.22, 1.30, 1.37, 1.44, 1.51] },
    { attr: 'missileExpVelocity',  values: [1.15, 1.22, 1.30, 1.37, 1.44, 1.51] },
    { attr: 'shipVelocity',       values: [1.30, 1.44, 1.58, 1.72, 1.86, 2.00] },
    { attr: 'stasisWebStr',       values: [0.85, 0.78, 0.70, 0.63, 0.56, 0.49] },
    { attr: 'inertia',            values: [1.30, 1.44, 1.58, 1.72, 1.86, 2.00] },
    { attr: 'targetingRange',     values: [1.30, 1.44, 1.58, 1.72, 1.86, 2.00] },
  ],
  'Cataclysmic Variable': [
    { attr: 'localArmorRep',      values: [0.85, 0.78, 0.70, 0.63, 0.56, 0.49] },
    { attr: 'localShieldBoost',   values: [0.85, 0.78, 0.70, 0.63, 0.56, 0.49] },
    { attr: 'shieldTransfer',     values: [1.30, 1.44, 1.58, 1.72, 1.86, 2.00] },
    { attr: 'remoteArmorRep',     values: [1.30, 1.44, 1.58, 1.72, 1.86, 2.00] },
    { attr: 'capCapacity',        values: [1.30, 1.44, 1.58, 1.72, 1.86, 2.00] },
    { attr: 'capRechargeTime',    values: [1.15, 1.22, 1.30, 1.37, 1.44, 1.51] },
    { attr: 'remoteCapTransfer',  values: [0.85, 0.78, 0.70, 0.63, 0.56, 0.49] },
  ],
  'Magnetar': [
    { attr: 'damage',             values: [1.30, 1.44, 1.58, 1.72, 1.86, 2.00] },
    { attr: 'missileExpRadius',   values: [1.15, 1.22, 1.30, 1.37, 1.44, 1.51] },
    { attr: 'droneTracking',      values: [0.85, 0.78, 0.70, 0.63, 0.56, 0.49] },
    { attr: 'targetingRange',     values: [0.85, 0.78, 0.70, 0.63, 0.56, 0.49] },
    { attr: 'trackingSpeed',      values: [0.85, 0.78, 0.70, 0.63, 0.56, 0.49] },
    { attr: 'targetPainterStr',   values: [1.15, 1.22, 1.30, 1.37, 1.44, 1.51] },
  ],
  'Pulsar': [
    { attr: 'shieldHP',           values: [1.30, 1.44, 1.58, 1.72, 1.86, 2.00] },
    { attr: 'armorResist',        values: [0.85, 0.78, 0.70, 0.63, 0.56, 0.49] },
    { attr: 'capRechargeTime',    values: [0.85, 0.78, 0.70, 0.63, 0.56, 0.49] },
    { attr: 'signatureRadius',    values: [1.30, 1.44, 1.58, 1.72, 1.86, 2.00] },
    { attr: 'nosNeutDrain',       values: [1.30, 1.44, 1.58, 1.72, 1.86, 2.00] },
  ],
  'Red Giant': [
    { attr: 'heatDamage',         values: [1.15, 1.22, 1.30, 1.37, 1.44, 1.51] },
    { attr: 'overloadBonus',      values: [1.30, 1.44, 1.58, 1.72, 1.86, 2.00] },
    { attr: 'smartBombRange',     values: [1.30, 1.44, 1.58, 1.72, 1.86, 2.00] },
    { attr: 'smartBombDamage',    values: [1.30, 1.44, 1.58, 1.72, 1.86, 2.00] },
    { attr: 'bombDamage',         values: [1.30, 1.44, 1.58, 1.72, 1.86, 2.00] },
  ],
  'Wolf-Rayet': [
    { attr: 'armorHP',            values: [1.30, 1.44, 1.58, 1.72, 1.86, 2.00] },
    { attr: 'shieldResist',       values: [0.85, 0.78, 0.70, 0.63, 0.56, 0.49] },
    { attr: 'smallWeaponDmg',     values: [1.30, 1.44, 1.58, 1.72, 1.86, 2.00] },
    { attr: 'signatureRadius',    values: [0.85, 0.78, 0.70, 0.63, 0.56, 0.49] },
  ],
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

  // Resolve effect multipliers for this system's class
  if (whSys.e && whSys.c >= 1 && whSys.c <= 6) {
    const effectDef = EFFECT_MULTIPLIERS[whSys.e]
    if (effectDef) {
      data.effect_details = effectDef.map(({ attr, values }) => ({
        attr,
        value: values[whSys.c - 1],
      }))
    }
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
