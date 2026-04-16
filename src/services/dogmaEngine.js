/**
 * Dogma calculation engine for ship fitting simulation.
 * Assumes All Skills Level V.
 *
 * Returns ship-level attributes AND per-module calculated attributes
 * so that fittingStats can compute DPS, cap usage, CPU/PG etc.
 */

const SKILL_LEVEL_ATTR = 280

const STACKING_COEFF = 2.22292081
function stackingPenalty(index) {
  return Math.pow(0.5, Math.pow(index / STACKING_COEFF, 2))
}

const OP_PRE_MUL = 0
const OP_PRE_DIV = 1
const OP_MOD_ADD = 2
const OP_MOD_SUB = 3
const OP_POST_MUL = 4
const OP_POST_DIV = 5
const OP_POST_PERCENT = 6
const OP_POST_ASSIGN = 7

// Effect IDs for identification
const EFF_TURRET_FITTED = 42
const EFF_LAUNCHER_FITTED = 40
const EFF_USE_MISSILES = 101
const EFF_PROJECTILE_FIRED = 34
const EFF_HI_POWER = 12
const EFF_MED_POWER = 13
const EFF_LO_POWER = 11

/**
 * @param {Object} store - fitting store
 * @param {Object} data - dogma data
 * @returns {{ shipAttrs, modules, drones }}
 */
export function calculateFit(store, data) {
  if (!store.shipTypeId || !data) return {}

  const shipType = data.types[store.shipTypeId]
  if (!shipType) return {}

  // ── Build items ──
  const shipItem = buildItem(store.shipTypeId, data, 'ship')

  const moduleItems = []
  for (const mod of store.allFittedModules) {
    if (mod.offline) continue  // skip offline modules
    const modItem = buildItem(mod.typeId, data, 'module')
    modItem.slotType = mod.slotType
    modItem.slotIndex = mod.index

    // Identify weapon type
    const effs = new Set(modItem.effectIds)
    modItem.isTurret = effs.has(EFF_TURRET_FITTED)
    modItem.isLauncher = effs.has(EFF_LAUNCHER_FITTED) || effs.has(EFF_USE_MISSILES)

    // Charge
    if (mod.chargeTypeId) {
      modItem.charge = buildItem(mod.chargeTypeId, data, 'charge')
    }

    moduleItems.push(modItem)
  }

  const droneItems = []
  for (const drone of store.drones) {
    const d = buildItem(drone.typeId, data, 'drone')
    d.count = drone.count
    droneItems.push(d)
  }

  // ── Implants ──
  const implantItems = []
  if (store.implants) {
    for (const tid of store.implants) {
      if (tid && data.types[tid]) implantItems.push(buildItem(tid, data, 'implant'))
    }
  }

  // Include all skills (category 16) at level V so skill-based bonuses (e.g., Drone
  // Interfacing, ship-racial skills) are applied. Skill attrs are pre-processed so
  // per-level bonus attrs (like 292) are scaled by skill level before other effects
  // read them via OwnerRequiredSkillModifier.
  const skillItems = getAllSkillItems(data)

  // Pre-apply skill-to-ship modifiers (ItemModifier d=shipID) to shipItem.attrs
  // directly. E.g., Gallente Battleship skill multiplies Dominix attr 561 by 5,
  // Caldari Cruiser multiplies attr 658 by 5 on Stratios. This way when the ship's
  // own bonus effect reads those attrs later, it gets the resolved per-level × level
  // value rather than the raw per-level base.
  applySkillToShipAttrs(shipItem, skillItems, data)

  const allItems = [shipItem, ...moduleItems, ...droneItems, ...implantItems, ...skillItems]
  // Add charges as items for effect collection
  for (const m of moduleItems) {
    if (m.charge) allItems.push(m.charge)
  }

  // ── Collect modifiers ──
  const shipMods = []   // modifiers targeting ship attrs
  const moduleMods = [] // modifiers targeting module/item attrs

  for (const item of allItems) {
    if (!item.effectIds) continue
    for (const eid of item.effectIds) {
      const effect = data.effects[eid]
      if (!effect) continue
      const ec = effect.ec
      if (ec === 2 || ec === 3 || ec === 7) continue  // skip target, area, dungeon

      // Effect 1730 (droneDmgBonus): marker on drone skills (Light/Medium/Heavy Drone Op,
      // Drone Specializations). Synthesize an OwnerRequiredSkillModifier applying attr 292
      // (post-processed, already ×skillLevel) as +% damage to items with this skill as req.
      if (eid === 1730 && item.role === 'skill') {
        const bonus = item.attrs.get(292)
        if (bonus != null && bonus !== 0) {
          const virtualMi = { d: 'charID', f: 'OwnerRequiredSkillModifier', ma: 64, ya: 292, op: OP_POST_PERCENT, sk: item.typeId }
          moduleMods.push({ source: item, mi: virtualMi, modValue: bonus })
        }
        continue
      }

      if (!effect.mi) continue

      for (const mi of effect.mi) {
        const modValue = getModifierValue(item, mi, data)
        if (modValue == null) continue
        const entry = { source: item, mi, modValue }

        // Route modifier to ship or module bucket
        if (mi.f === 'ItemModifier' && mi.d === 'shipID' && item.role === 'skill') {
          // Already pre-applied to shipItem.attrs via applySkillToShipAttrs
          continue
        } else if (mi.f === 'ItemModifier' && mi.d === 'shipID' && item.role !== 'ship') {
          shipMods.push(entry)
        } else if (mi.f === 'ItemModifier' && item.role === 'ship') {
          shipMods.push(entry)
        } else if (mi.f === 'LocationModifier' && mi.d === 'shipID') {
          // Affects all items in location - route to both
          shipMods.push(entry)
          moduleMods.push(entry)
        } else if (mi.f === 'LocationRequiredSkillModifier') {
          if (item.role === 'ship') {
            shipMods.push(entry)  // ship bonuses
          }
          moduleMods.push(entry)  // skill effects on modules
        } else if (mi.f === 'LocationGroupModifier') {
          moduleMods.push(entry)
        } else if (mi.f === 'OwnerRequiredSkillModifier') {
          moduleMods.push(entry)
        }
      }
    }
  }

  // ── Apply ship modifiers ──
  const shipAttrs = applyModifiers(shipItem.attrs, shipMods, null, data)

  // ── Apply module-level modifiers (for CPU/PG reduction, damage bonuses, etc.) ──
  const modules = moduleItems.map(modItem => {
    // Collect modifiers that apply to this specific module
    const applicableMods = moduleMods.filter(m => modifierAppliesToItem(m, modItem, data))
    const calcAttrs = applyModifiers(modItem.attrs, applicableMods, modItem, data)

    // Also apply charge attributes to the module (merge damage values)
    let chargeAttrs = null
    if (modItem.charge) {
      chargeAttrs = new Map(modItem.charge.attrs)
    }

    return {
      typeId: modItem.typeId,
      attrs: calcAttrs,
      chargeAttrs,
      isTurret: modItem.isTurret,
      isLauncher: modItem.isLauncher,
      slotType: modItem.slotType,
    }
  })

  // ── Drones ──
  // Apply modifiers targeting drones: ship bonuses with matching required skill
  // (OwnerRequiredSkillModifier / LocationRequiredSkillModifier / LocationGroupModifier)
  // plus skill-based drone bonuses (Drone Interfacing, etc.) via skill items.
  const drones = droneItems.map(d => {
    const applicableMods = moduleMods.filter(m => modifierAppliesToItem(m, d, data))
    const calcAttrs = applyModifiers(d.attrs, applicableMods, d, data)
    return {
      typeId: d.typeId,
      attrs: calcAttrs,
      count: d.count,
    }
  })

  return { shipAttrs, modules, drones }
}

function buildItem(typeId, data, role) {
  const td = data.types[typeId]
  const attrs = new Map()
  if (td?.a) for (const [aid, val] of td.a) attrs.set(aid, val)
  return {
    typeId, attrs,
    effectIds: td?.e || [],
    role,
    groupId: td?.g,
    categoryId: td?.cg,
    count: 1,
    // requiredSkills: extract from attrs 182, 183, 184
    requiredSkills: extractRequiredSkills(attrs),
  }
}

function extractRequiredSkills(attrs) {
  const skills = []
  // 182=requiredSkill1, 183=requiredSkill2, 184=requiredSkill3
  for (const aid of [182, 183, 184]) {
    const v = attrs.get(aid)
    if (v) skills.push(v)
  }
  return skills
}

function getModifierValue(item, mi, data) {
  const modifyingAttrId = mi.ya
  if (modifyingAttrId == null) return null
  if (modifyingAttrId === SKILL_LEVEL_ATTR) return 5
  let val = item.attrs.get(modifyingAttrId)
  if (val == null) val = data.attrs[modifyingAttrId]?.dv
  if (val == null) return null

  return val
}

/**
 * Pre-apply skill-to-ship ItemModifier modifiers to shipItem.attrs in place.
 * This resolves per-level bonus attrs (like Dominix attr 561) to their skill-V value
 * before the ship's own bonus effects read them via ya.
 */
function applySkillToShipAttrs(shipItem, skillItems, data) {
  // Group all ship-targeted ItemModifier modifiers by target attr
  const grouped = new Map()
  for (const skill of skillItems) {
    for (const eid of skill.effectIds) {
      const effect = data.effects[eid]
      if (!effect?.mi) continue
      const ec = effect.ec
      if (ec === 2 || ec === 3 || ec === 7) continue
      for (const mi of effect.mi) {
        if (mi.f !== 'ItemModifier' || mi.d !== 'shipID' || mi.ma == null) continue
        const modValue = getModifierValue(skill, mi, data)
        if (modValue == null) continue
        if (!grouped.has(mi.ma)) {
          grouped.set(mi.ma, { preMul: [], preDivs: [], adds: [], subs: [], postMul: [], postDiv: [], postPct: [], postAssign: [] })
        }
        const g = grouped.get(mi.ma)
        const entry = { val: modValue, stackable: true }  // skills don't stack penalize
        switch (mi.op) {
          case OP_PRE_MUL: g.preMul.push(entry); break
          case OP_PRE_DIV: g.preDivs.push(entry); break
          case OP_MOD_ADD: g.adds.push(entry); break
          case OP_MOD_SUB: g.subs.push(entry); break
          case OP_POST_MUL: g.postMul.push(entry); break
          case OP_POST_DIV: g.postDiv.push(entry); break
          case OP_POST_PERCENT: g.postPct.push(entry); break
          case OP_POST_ASSIGN: g.postAssign.push(entry); break
        }
      }
    }
  }
  for (const [aid, m] of grouped) {
    let val = shipItem.attrs.get(aid) ?? data.attrs[aid]?.dv ?? 0
    for (const e of m.preMul) val *= e.val
    for (const e of m.preDivs) if (e.val !== 0) val /= e.val
    for (const e of m.adds) val += e.val
    for (const e of m.subs) val -= e.val
    for (const e of m.postMul) val *= e.val
    for (const e of m.postDiv) if (e.val !== 0) val /= e.val
    for (const e of m.postPct) val *= (1 + e.val / 100)
    if (m.postAssign.length) val = m.postAssign[m.postAssign.length - 1].val
    shipItem.attrs.set(aid, val)
  }
}

let _skillItemsCache = null
let _skillItemsCacheData = null

/** Build skill items for all skills (category 16) at level V. Cached per data ref. */
function getAllSkillItems(data) {
  if (_skillItemsCacheData === data && _skillItemsCache) return _skillItemsCache
  const items = []
  for (const [tid, t] of Object.entries(data.types)) {
    if (t.cg === 16) items.push(buildSkillItem(Number(tid), data))
  }
  _skillItemsCacheData = data
  _skillItemsCache = items
  return items
}

/**
 * Build a skill item at level V. Pre-applies the common skill-level self-multiplier
 * pattern (ItemModifier d=itemID ya=280 op=0) so that per-level bonus attrs like 292
 * are already scaled by skillLevel when another effect's modifier reads them via ya.
 */
function buildSkillItem(typeId, data) {
  const item = buildItem(typeId, data, 'skill')
  item.attrs.set(SKILL_LEVEL_ATTR, 5)
  for (const eid of item.effectIds) {
    const effect = data.effects[eid]
    if (!effect?.mi) continue
    for (const mi of effect.mi) {
      if (mi.f === 'ItemModifier' && mi.d === 'itemID' &&
          mi.ya === SKILL_LEVEL_ATTR && mi.op === OP_PRE_MUL && mi.ma != null) {
        const cur = item.attrs.get(mi.ma) ?? data.attrs[mi.ma]?.dv ?? 0
        item.attrs.set(mi.ma, cur * 5)
      }
    }
  }
  return item
}

/** Check if a modifier applies to a specific module item */
function modifierAppliesToItem(mod, targetItem, data) {
  const { mi, source } = mod
  const func = mi.f

  if (func === 'LocationModifier' && mi.d === 'shipID') {
    return true  // affects all items in ship
  }

  if (func === 'LocationGroupModifier') {
    return mi.gid != null && targetItem.groupId === mi.gid
  }

  if (func === 'LocationRequiredSkillModifier') {
    return mi.sk != null && targetItem.requiredSkills.includes(mi.sk)
  }

  if (func === 'OwnerRequiredSkillModifier') {
    return mi.sk != null && targetItem.requiredSkills.includes(mi.sk)
  }

  return false
}

function applyModifiers(baseAttrs, modifiers, targetItem, data) {
  const result = new Map(baseAttrs)

  // Group by target attribute
  const grouped = new Map()
  for (const { source, mi, modValue } of modifiers) {
    const aid = mi.ma
    if (aid == null) continue
    if (!grouped.has(aid)) {
      grouped.set(aid, { preMul: [], preDivs: [], adds: [], subs: [], postMul: [], postDiv: [], postPct: [], postAssign: [] })
    }
    const g = grouped.get(aid)
    // Ship hull bonuses and skill bonuses are NOT stacking-penalized in EVE.
    // Module/rig bonuses on penalized attrs (st=0) are.
    const isPenaltyExempt = source?.role === 'ship' || source?.role === 'skill'
    const stackable = data.attrs[aid]?.st !== 0 || isPenaltyExempt
    const entry = { val: modValue, stackable }
    switch (mi.op) {
      case OP_PRE_MUL: g.preMul.push(entry); break
      case OP_PRE_DIV: g.preDivs.push(entry); break
      case OP_MOD_ADD: g.adds.push(entry); break
      case OP_MOD_SUB: g.subs.push(entry); break
      case OP_POST_MUL: g.postMul.push(entry); break
      case OP_POST_DIV: g.postDiv.push(entry); break
      case OP_POST_PERCENT: g.postPct.push(entry); break
      case OP_POST_ASSIGN: g.postAssign.push(entry); break
    }
  }

  for (const [aid, m] of grouped) {
    let val = result.get(aid) ?? data.attrs[aid]?.dv ?? 0
    for (const e of m.preMul) val *= e.val
    for (const e of m.preDivs) if (e.val !== 0) val /= e.val
    for (const e of m.adds) val += e.val
    for (const e of m.subs) val -= e.val
    for (const e of m.postMul) val *= e.val
    for (const e of m.postDiv) if (e.val !== 0) val /= e.val
    val = applyPostPercent(val, m.postPct)
    if (m.postAssign.length) val = m.postAssign[m.postAssign.length - 1].val
    result.set(aid, val)
  }

  return result
}

function applyPostPercent(baseVal, modifiers) {
  if (!modifiers.length) return baseVal
  const stackable = modifiers.filter(m => m.stackable)
  const nonStackable = modifiers.filter(m => !m.stackable)
  let val = baseVal
  for (const m of stackable) val *= (1 + m.val / 100)
  const positive = nonStackable.filter(m => m.val > 0).sort((a, b) => b.val - a.val)
  const negative = nonStackable.filter(m => m.val < 0).sort((a, b) => a.val - b.val)
  for (let i = 0; i < positive.length; i++) val *= (1 + positive[i].val * stackingPenalty(i) / 100)
  for (let i = 0; i < negative.length; i++) val *= (1 + negative[i].val * stackingPenalty(i) / 100)
  return val
}
