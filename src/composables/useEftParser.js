import { getDogmaData } from '../data/loader'
import { locName } from '../services/locale'

let _nameLookup = null

function buildNameLookup() {
  if (_nameLookup) return _nameLookup
  const data = getDogmaData()
  if (!data) return null
  _nameLookup = new Map()
  for (const [tidStr, t] of Object.entries(data.types)) {
    const tid = parseInt(tidStr)
    if (t.n) _nameLookup.set(t.n.toLowerCase(), tid)
    if (t.nz) _nameLookup.set(t.nz.toLowerCase(), tid)
  }
  return _nameLookup
}

export function lookupTypeByName(name) {
  const lookup = buildNameLookup()
  if (!lookup) return null
  return lookup.get(name.toLowerCase()) ?? lookup.get(name) ?? null
}

/**
 * Parse EFT format text into a structured fit.
 * Returns { shipTypeId, fitName, modules: [{ slotType, typeId, chargeTypeId }], drones: [{ typeId, count }] }
 */
export function parseEft(text) {
  const data = getDogmaData()
  if (!data) return null

  const lines = text.split('\n')
  if (!lines.length) return null

  // First line: [ShipType, Fit Name]
  const headerMatch = lines[0].trim().match(/^\[(.+?)(?:,\s*(.+))?\]$/)
  if (!headerMatch) return null

  const shipName = headerMatch[1].trim()
  const fitName = headerMatch[2]?.trim() || ''
  const shipTypeId = lookupTypeByName(shipName)

  const modules = []  // { slotType, typeId, chargeTypeId }
  const droneMap = {} // typeId -> count

  // Track slot counts per type to infer slot assignment
  const slotQueues = { hi: [], med: [], lo: [], rig: [], sub: [] }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line || line.startsWith('[')) continue

    // Check for "x5" suffix (drones, charges in cargo)
    let itemName = line
    let qty = 1
    const xMatch = line.match(/^(.+?)\s+x(\d+)\s*$/i)
    if (xMatch) {
      itemName = xMatch[1].trim()
      qty = parseInt(xMatch[2], 10) || 1
    }

    // Split on comma: module, charge/script
    const commaParts = itemName.split(',')
    const moduleName = commaParts[0].trim()
    const chargeName = commaParts.length > 1 ? commaParts[1].trim() : null

    // Skip empty slot placeholders
    if (/^\[Empty (High|Med|Low|Rig|Subsystem) slot\]$/i.test(moduleName)) continue

    const moduleTypeId = lookupTypeByName(moduleName)
    const chargeTypeId = chargeName ? lookupTypeByName(chargeName) : null

    if (moduleTypeId) {
      const modType = data.types[moduleTypeId]
      if (modType) {
        // Check if it's a drone (category 18)
        if (modType.cg === 18) {
          droneMap[moduleTypeId] = (droneMap[moduleTypeId] || 0) + qty
        } else if (modType.sl) {
          // Module with known slot type
          modules.push({ slotType: modType.sl, typeId: moduleTypeId, chargeTypeId })
        } else {
          // Charge or unknown - treat as module without slot
          modules.push({ slotType: null, typeId: moduleTypeId, chargeTypeId })
        }
      }
    }
  }

  const drones = Object.entries(droneMap).map(([typeId, count]) => ({
    typeId: parseInt(typeId),
    count,
  }))

  return { shipTypeId, fitName, modules, drones }
}

/**
 * Export a fit to EFT format text.
 */
export function exportEft(store) {
  const data = getDogmaData()
  if (!data || !store.shipTypeId) return ''

  const shipType = data.types[store.shipTypeId]
  const shipName = shipType?.n || String(store.shipTypeId)
  const lines = [`[${shipName}, ${store.fitName || 'Unnamed'}]`]

  const EMPTY_LABELS = { hi: 'High', med: 'Med', lo: 'Low', rig: 'Rig', sub: 'Subsystem' }

  for (const [slotType, slotRef] of [['lo', store.lowSlots], ['med', store.midSlots], ['hi', store.highSlots], ['rig', store.rigSlots], ['sub', store.subSlots]]) {
    if (!slotRef.length) continue
    lines.push('')
    for (let i = 0; i < slotRef.length; i++) {
      const typeId = slotRef[i]
      if (!typeId) {
        lines.push(`[Empty ${EMPTY_LABELS[slotType]} slot]`)
        continue
      }
      const modType = data.types[typeId]
      const modName = modType?.n || String(typeId)
      const chargeKey = `${slotType}-${i}`
      const chargeId = store.charges[chargeKey]
      if (chargeId) {
        const chargeType = data.types[chargeId]
        lines.push(`${modName}, ${chargeType?.n || chargeId}`)
      } else {
        lines.push(modName)
      }
    }
  }

  if (store.drones.length) {
    lines.push('')
    for (const drone of store.drones) {
      const droneType = data.types[drone.typeId]
      lines.push(`${droneType?.n || drone.typeId} x${drone.count}`)
    }
  }

  return lines.join('\n')
}
