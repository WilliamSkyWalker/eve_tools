import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getDogmaData } from '../data/loader'

const STORAGE_KEY = 'eve_fits'

export const useFittingStore = defineStore('fitting', () => {
  const shipTypeId = ref(null)
  const fitName = ref('')
  const highSlots = ref([])
  const midSlots = ref([])
  const lowSlots = ref([])
  const rigSlots = ref([])
  const subSlots = ref([])
  const charges = ref({})       // "hi-0" -> chargeTypeId
  const drones = ref([])        // [{ typeId, count }]
  const fighters = ref([])      // [{ typeId, count }]
  const offlineSlots = ref({})  // "hi-0" -> true (offline)

  const shipAttrs = computed(() => {
    if (!shipTypeId.value) return null
    const data = getDogmaData()
    return data?.types[shipTypeId.value] || null
  })

  function getShipAttr(attrId) {
    const t = shipAttrs.value
    if (!t?.a) return 0
    return t.a.find(([aid]) => aid === attrId)?.[1] ?? 0
  }

  const slotCounts = computed(() => ({
    hi: getShipAttr(14), med: getShipAttr(13), lo: getShipAttr(12),
    rig: getShipAttr(1137), sub: getShipAttr(1367),
  }))

  // Hardpoints: max turrets/launchers
  const turretHardpoints = computed(() => getShipAttr(102))
  const launcherHardpoints = computed(() => getShipAttr(101))

  // Count currently fitted turrets/launchers
  const fittedTurrets = computed(() => {
    const data = getDogmaData()
    if (!data) return 0
    return highSlots.value.filter(tid => {
      if (!tid) return false
      const t = data.types[tid]
      return t?.e?.includes(42)  // effect 42 = turretFitted
    }).length
  })

  const fittedLaunchers = computed(() => {
    const data = getDogmaData()
    if (!data) return 0
    return highSlots.value.filter(tid => {
      if (!tid) return false
      const t = data.types[tid]
      return t?.e?.includes(40)  // effect 40 = launcherFitted
    }).length
  })

  // Attrs for ship-type/group fitting restrictions
  const FIT_GROUP_ATTRS = [1298, 1299, 1300, 1301, 1872, 1879, 1880, 1881, 1944, 2065, 2103, 2396, 2463, 2486, 2487, 2488]
  const FIT_TYPE_ATTRS = [1302, 1303, 1304, 1305]

  /** Check if a module can be placed (hardpoint limit + ship compatibility) */
  function canFitModule(typeId) {
    const data = getDogmaData()
    if (!data) return true
    const t = data.types[typeId]
    if (!t) return true

    // Hardpoint check
    if (t.e?.includes(42) && fittedTurrets.value >= turretHardpoints.value) return false
    if (t.e?.includes(40) && fittedLaunchers.value >= launcherHardpoints.value) return false

    // Ship type/group restriction check
    if (!shipTypeId.value || !t.a) return true
    const shipType = data.types[shipTypeId.value]
    if (!shipType) return true

    const allowedGroups = []
    const allowedTypes = []
    for (const [aid, val] of t.a) {
      if (FIT_GROUP_ATTRS.includes(aid)) allowedGroups.push(val)
      else if (FIT_TYPE_ATTRS.includes(aid)) allowedTypes.push(val)
    }

    // If no restrictions, module fits anywhere
    if (!allowedGroups.length && !allowedTypes.length) return true

    // Check if ship matches any allowed group or type
    if (allowedTypes.includes(shipTypeId.value)) return true
    if (allowedGroups.includes(shipType.g)) return true

    return false
  }

  /** Get compatible charges for a weapon module */
  function getCompatibleCharges(weaponTypeId) {
    const data = getDogmaData()
    if (!data) return []
    const weapon = data.types[weaponTypeId]
    if (!weapon?.a) return []

    // Get weapon's accepted charge groups and size
    const chargeGroups = new Set()
    for (const aid of [604, 605, 606, 609]) {
      const v = weapon.a.find(([a]) => a === aid)?.[1]
      if (v) chargeGroups.add(v)
    }
    const chargeSize = weapon.a.find(([a]) => a === 128)?.[1]

    if (!chargeGroups.size) return []

    const matches = []
    for (const [tidStr, t] of Object.entries(data.types)) {
      if (t.cg !== 8) continue  // charges only
      if (!chargeGroups.has(t.g)) continue  // group must match
      if (chargeSize != null) {
        const cs = t.a?.find(([a]) => a === 128)?.[1]
        if (cs != null && cs !== chargeSize) continue  // size must match
      }
      matches.push({ typeId: parseInt(tidStr), type: t })
    }
    return matches
  }

  function setShip(typeId) {
    shipTypeId.value = typeId
    fitName.value = ''
    charges.value = {}
    drones.value = []
    fighters.value = []
    offlineSlots.value = {}
    const sc = slotCounts.value
    highSlots.value = Array(sc.hi).fill(null)
    midSlots.value = Array(sc.med).fill(null)
    lowSlots.value = Array(sc.lo).fill(null)
    rigSlots.value = Array(sc.rig).fill(null)
    subSlots.value = Array(sc.sub).fill(null)
  }

  function getSlotArray(slotType) {
    const map = { hi: highSlots, med: midSlots, lo: lowSlots, rig: rigSlots, sub: subSlots }
    return map[slotType]
  }

  function setModule(slotType, index, typeId) {
    const arr = getSlotArray(slotType)
    if (!arr || index < 0 || index >= arr.value.length) return false
    // Validate hardpoints for high slot turrets/launchers
    if (typeId && slotType === 'hi') {
      const existing = arr.value[index]
      // If replacing same type of weapon, no extra check needed
      if (existing !== typeId && !canFitModule(typeId)) return false
    }
    arr.value[index] = typeId
    const key = `${slotType}-${index}`
    if (!typeId) {
      delete charges.value[key]
      delete offlineSlots.value[key]
    }
    return true
  }

  function removeModule(slotType, index) { setModule(slotType, index, null) }

  function setCharge(slotType, index, chargeTypeId) {
    const key = `${slotType}-${index}`
    if (chargeTypeId) charges.value[key] = chargeTypeId
    else delete charges.value[key]
  }

  function toggleOffline(slotType, index) {
    const key = `${slotType}-${index}`
    if (offlineSlots.value[key]) delete offlineSlots.value[key]
    else offlineSlots.value[key] = true
  }

  function isOffline(slotType, index) {
    return !!offlineSlots.value[`${slotType}-${index}`]
  }

  function addDrone(typeId, count = 1) {
    const e = drones.value.find(d => d.typeId === typeId)
    if (e) e.count += count
    else drones.value.push({ typeId, count })
  }

  function removeDrone(typeId) {
    const i = drones.value.findIndex(d => d.typeId === typeId)
    if (i >= 0) drones.value.splice(i, 1)
  }

  function setDroneCount(typeId, count) {
    const e = drones.value.find(d => d.typeId === typeId)
    if (e) { if (count <= 0) removeDrone(typeId); else e.count = count }
  }

  function addFighter(typeId, count = 1) {
    const e = fighters.value.find(f => f.typeId === typeId)
    if (e) e.count += count
    else fighters.value.push({ typeId, count })
  }

  function removeFighter(typeId) {
    const i = fighters.value.findIndex(f => f.typeId === typeId)
    if (i >= 0) fighters.value.splice(i, 1)
  }

  function setFighterCount(typeId, count) {
    const e = fighters.value.find(f => f.typeId === typeId)
    if (e) { if (count <= 0) removeFighter(typeId); else e.count = count }
  }

  function clearFit() {
    shipTypeId.value = null; fitName.value = ''
    highSlots.value = []; midSlots.value = []; lowSlots.value = []
    rigSlots.value = []; subSlots.value = []
    charges.value = {}; drones.value = []; fighters.value = []; offlineSlots.value = {}
  }

  const allFittedModules = computed(() => {
    const mods = []
    const add = (arr, st) => arr.forEach((tid, i) => {
      if (tid) mods.push({
        typeId: tid, slotType: st, index: i,
        chargeTypeId: charges.value[`${st}-${i}`] || null,
        offline: !!offlineSlots.value[`${st}-${i}`],
      })
    })
    add(highSlots.value, 'hi')
    add(midSlots.value, 'med')
    add(lowSlots.value, 'lo')
    add(rigSlots.value, 'rig')
    add(subSlots.value, 'sub')
    return mods
  })

  // ── localStorage save/load ──
  function getSavedFits() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') }
    catch { return [] }
  }

  function saveFit(name) {
    if (!shipTypeId.value) return
    const fit = {
      name: name || fitName.value || 'Unnamed',
      shipTypeId: shipTypeId.value,
      hi: [...highSlots.value], med: [...midSlots.value], lo: [...lowSlots.value],
      rig: [...rigSlots.value], sub: [...subSlots.value],
      charges: { ...charges.value },
      drones: drones.value.map(d => ({ ...d })),
      fighters: fighters.value.map(f => ({ ...f })),
      offline: { ...offlineSlots.value },
      ts: Date.now(),
    }
    const fits = getSavedFits()
    // Replace if same name exists
    const idx = fits.findIndex(f => f.name === fit.name)
    if (idx >= 0) fits[idx] = fit; else fits.push(fit)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fits))
    return fits
  }

  function loadFit(fit) {
    shipTypeId.value = fit.shipTypeId
    fitName.value = fit.name || ''
    highSlots.value = fit.hi || []
    midSlots.value = fit.med || []
    lowSlots.value = fit.lo || []
    rigSlots.value = fit.rig || []
    subSlots.value = fit.sub || []
    charges.value = fit.charges || {}
    drones.value = (fit.drones || []).map(d => ({ ...d }))
    fighters.value = (fit.fighters || []).map(f => ({ ...f }))
    offlineSlots.value = fit.offline || {}
  }

  function deleteSavedFit(name) {
    const fits = getSavedFits().filter(f => f.name !== name)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fits))
    return fits
  }

  // ── URL encoding ──
  function toUrlHash() {
    if (!shipTypeId.value) return ''
    const obj = {
      s: shipTypeId.value,
      n: fitName.value,
      h: highSlots.value, m: midSlots.value, l: lowSlots.value,
      r: rigSlots.value, u: subSlots.value,
      c: charges.value,
      d: drones.value,
      f: fighters.value,
      o: offlineSlots.value,
    }
    return btoa(JSON.stringify(obj))
  }

  function fromUrlHash(hash) {
    try {
      const obj = JSON.parse(atob(hash))
      shipTypeId.value = obj.s
      fitName.value = obj.n || ''
      highSlots.value = obj.h || []
      midSlots.value = obj.m || []
      lowSlots.value = obj.l || []
      rigSlots.value = obj.r || []
      subSlots.value = obj.u || []
      charges.value = obj.c || {}
      drones.value = (obj.d || []).map(d => ({ ...d }))
      fighters.value = (obj.f || []).map(f => ({ ...f }))
      offlineSlots.value = obj.o || {}
      return true
    } catch { return false }
  }

  return {
    shipTypeId, fitName,
    highSlots, midSlots, lowSlots, rigSlots, subSlots,
    charges, drones, fighters, offlineSlots,
    shipAttrs, slotCounts, allFittedModules,
    turretHardpoints, launcherHardpoints, fittedTurrets, fittedLaunchers,
    canFitModule, getCompatibleCharges,
    setShip, setModule, removeModule, setCharge,
    toggleOffline, isOffline,
    addDrone, removeDrone, setDroneCount,
    addFighter, removeFighter, setFighterCount,
    clearFit, getSlotArray,
    getSavedFits, saveFit, loadFit, deleteSavedFit,
    toUrlHash, fromUrlHash,
  }
})
