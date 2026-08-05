/**
 * Bill of Materials — direct port of industry/services/bom.py
 */

import { getIndustryData } from '../data/loader'
import {
  calculateMaterialQuantity,
  getSourceForProduct,
  getTypeName,
  getGroupName,
  MANUFACTURING_ACTIVITY_ID,
  REACTION_ACTIVITY_ID,
} from './calculator'

function getProductQuantity(blueprintTypeId, activityId) {
  const data = getIndustryData()
  const entry = data?.productsByBp?.[blueprintTypeId]?.[activityId]
  return entry ? entry[1] : 1
}

function getProductType(blueprintTypeId, activityId) {
  const data = getIndustryData()
  const entry = data?.productsByBp?.[blueprintTypeId]?.[activityId]
  if (!entry) return null
  return { typeId: entry[0], quantity: entry[1] }
}

export function buildBomTree(blueprintTypeId, meLevel, runs, activityId = MANUFACTURING_ACTIVITY_ID, buildItems = {}, depth = 0, maxDepth = 15) {
  if (depth > maxDepth) return null

  const data = getIndustryData()
  if (!data) return null

  const effectiveMe = activityId === MANUFACTURING_ACTIVITY_ID ? meLevel : 0
  const product = getProductType(blueprintTypeId, activityId)
  if (!product) return null

  const productQuantity = product.quantity * runs
  const mats = data.materials[blueprintTypeId]?.[activityId]
  if (!mats) return null

  const children = []
  for (const [matTypeId, baseQty] of mats) {
    const adjustedQty = calculateMaterialQuantity(runs, baseQty, effectiveMe)
    const source = getSourceForProduct(matTypeId)
    const hasSrc = source !== null
    const srcBpId = source?.bpTypeId ?? null
    const srcActivity = source?.activityId ?? null
    const isReaction = srcActivity === REACTION_ACTIVITY_ID

    const buildConfig = buildItems[String(matTypeId)] || {}
    const shouldBuild = buildConfig.build && hasSrc

    const childNode = {
      type_id: matTypeId,
      type_name: getTypeName(matTypeId),
      quantity: adjustedQty,
      is_manufacturable: hasSrc,
      is_reaction: isReaction,
      blueprint_type_id: srcBpId,
      source_activity: srcActivity,
      build: shouldBuild,
      children: [],
    }

    if (shouldBuild && srcBpId) {
      const subProductQty = getProductQuantity(srcBpId, srcActivity)
      const subRuns = Math.ceil(adjustedQty / subProductQty)
      const subMe = srcActivity === MANUFACTURING_ACTIVITY_ID ? (buildConfig.me_level || 0) : 0

      const subTree = buildBomTree(srcBpId, subMe, subRuns, srcActivity, buildItems, depth + 1, maxDepth)
      if (subTree) {
        childNode.children = subTree.children || []
        childNode.me_level = subMe
        childNode.sub_runs = subRuns
      }
    }

    children.push(childNode)
  }

  return {
    type_id: product.typeId,
    type_name: getTypeName(product.typeId),
    quantity: productQuantity,
    me_level: effectiveMe,
    activity_id: activityId,
    children,
  }
}

export function aggregateRawMaterials(tree) {
  const totals = {}

  function walk(node) {
    const children = node.children || []
    if (!children.length) {
      const tid = node.type_id
      if (!totals[tid]) totals[tid] = { type_name: '', total_quantity: 0 }
      totals[tid].type_name = node.type_name
      totals[tid].total_quantity += node.quantity
    } else {
      for (const child of children) {
        if (child.build && child.children?.length) {
          walk(child)
        } else {
          const tid = child.type_id
          if (!totals[tid]) totals[tid] = { type_name: '', total_quantity: 0 }
          totals[tid].type_name = child.type_name
          totals[tid].total_quantity += child.quantity
        }
      }
    }
  }

  walk(tree)
  return totals
}

export function flattenBomToLevels(trees) {
  // Two independent tracks — manufacturing (分解) and reaction (逆反应) — so that
  // items of the same production stage group into one column no matter how deep
  // the *other* track's chain runs. Depth is counted separately per track: a
  // reaction product is placed by its depth inside the reaction sub-tree, NOT by
  // the manufacturing depth of whatever consumes it (which is what used to scatter
  // e.g. all Composites across several columns when a deep T2-capital chain was
  // mixed with a shallow T2 chain). Quantities are summed per (track, level) round,
  // so an item used in several rounds shows the amount needed in each ("按轮重复").
  const mfgMap = {}    // level -> { type_id -> info }
  const reactMap = {}
  const fuelMap = {}   // manufactured items consumed inside reaction chains (fuel blocks)

  function entryFor(map, level, tid) {
    if (!map[level]) map[level] = {}
    if (!map[level][tid]) {
      map[level][tid] = {
        type_name: '', quantity: 0, is_manufacturable: false, is_reaction: false,
        blueprint_type_id: null, source_activity: null, build: false,
      }
    }
    return map[level][tid]
  }

  const mapFor = ctx => (ctx === 'react' ? reactMap : ctx === 'fuel' ? fuelMap : mfgMap)
  function place(ctx, level, child, isBuild) {
    const entry = entryFor(mapFor(ctx), level, child.type_id)
    entry.type_name = child.type_name
    entry.quantity += child.quantity
    entry.is_manufacturable = child.is_manufacturable || false
    entry.is_reaction = child.is_reaction || false
    entry.blueprint_type_id = child.blueprint_type_id
    entry.source_activity = child.source_activity
    entry.build = isBuild
  }

  // Two independent tracks — manufacturing (分解) and reaction (逆反应) — so items of
  // the same production stage group into one column no matter how deep the *other*
  // track's chain runs (depth is counted per-track). A manufactured item consumed
  // inside a reaction chain (a fuel block) is not a reaction product, so it gets its
  // own `fuel` step shown after the reactions instead of inflating the reaction tiers.
  //
  // (ctx, nodeLevel) = where `node` itself sits. Its BUILD children go one step deeper
  // (or open a new track); its RAW / bought children are shown as 其他材料 in node's own
  // column — the materials consumed to make this step's products. Raw never creates a
  // deeper column, so each track's max level = its deepest *built* stage and the tier
  // labels line up with the vocabulary (一级/二级 …). Raw also lands in the raw summary
  // (aggregateRawMaterials) as the overall shopping total.
  function walk(node, ctx, nodeLevel) {
    for (const child of (node.children || [])) {
      if (!child.build) {
        place(ctx, Math.max(nodeLevel, 0), child, false)
        continue
      }
      let cctx, clevel
      if (ctx === 'mfg' && child.is_reaction) { cctx = 'react'; clevel = 0 }
      else if (ctx === 'react' && child.is_reaction) { cctx = 'react'; clevel = nodeLevel + 1 }
      else if (ctx === 'react' && !child.is_reaction) { cctx = 'fuel'; clevel = 0 }
      else if (ctx === 'fuel') { cctx = 'fuel'; clevel = nodeLevel + 1 }
      else { cctx = 'mfg'; clevel = nodeLevel + 1 }

      place(cctx, clevel, child, true)
      if (child.children?.length) walk(child, cctx, clevel)
    }
  }
  // Root (final product) sits at level -1 and isn't shown; its direct materials are
  // the first manufacturing round (mfg level 0), with raw clamped up to 0.
  for (const tree of trees) walk(tree, 'mfg', -1)

  const maxLevelOf = map => Object.keys(map).reduce((m, k) => Math.max(m, Number(k)), 0)
  const maxMfg = maxLevelOf(mfgMap)
  const maxReact = maxLevelOf(reactMap)
  const maxFuel = maxLevelOf(fuelMap)

  function buildCols(map, track, maxL) {
    return Object.keys(map).map(Number).sort((a, b) => a - b).map(level => {
      const materials = Object.entries(map[level]).map(([tid, info]) => ({
        type_id: parseInt(tid),
        type_name: info.type_name,
        quantity: info.quantity,
        is_manufacturable: info.is_manufacturable,
        is_reaction: info.is_reaction,
        blueprint_type_id: info.blueprint_type_id,
        source_activity: info.source_activity,
        build: info.build,
        group_name: getGroupName(parseInt(tid)),
      }))
      materials.sort((a, b) => {
        // build=true items first (待加工), then others (其他材料)
        if (a.build !== b.build) return a.build ? -1 : 1
        const gc = a.group_name.localeCompare(b.group_name)
        return gc !== 0 ? gc : a.type_name.localeCompare(b.type_name)
      })
      const hasBuild = materials.some(m => m.build)
      const hasOther = materials.some(m => !m.build)
      return {
        key: `${track}-${level}`,
        track,
        level,
        // Tier counted from raw (1 = closest to raw): deepest column = 一级 stage.
        tier: maxL - level + 1,
        materials,
        hasMixed: hasBuild && hasOther,
      }
    })
  }

  // Manufacturing columns first (shallow→deep), then reaction columns, then the
  // fuel-block step last — mirroring the reference layout (第N次分解 … 第N次逆反应 …)
  // and keeping fuel-block manufacturing as a distinct step after the reactions.
  return [
    ...buildCols(mfgMap, 'mfg', maxMfg),
    ...buildCols(reactMap, 'react', maxReact),
    ...buildCols(fuelMap, 'fuel', maxFuel),
  ]
}

export function buildBatchBom(items, buildItems = {}) {
  const trees = []
  for (const item of items) {
    const tree = buildBomTree(item.blueprint_type_id, item.me_level, item.runs, MANUFACTURING_ACTIVITY_ID, buildItems)
    if (tree) trees.push(tree)
  }

  const levels = flattenBomToLevels(trees)

  // Aggregate raw materials
  const allRaw = {}
  for (const tree of trees) {
    const raw = aggregateRawMaterials(tree)
    for (const [tid, info] of Object.entries(raw)) {
      if (!allRaw[tid]) allRaw[tid] = { type_name: '', total_quantity: 0 }
      allRaw[tid].type_name = info.type_name
      allRaw[tid].total_quantity += info.total_quantity
    }
  }

  const summary = Object.entries(allRaw)
    .map(([tid, info]) => ({
      type_id: parseInt(tid),
      type_name: info.type_name,
      total_quantity: info.total_quantity,
    }))
    .sort((a, b) => a.type_id - b.type_id)

  // `trees` is returned so callers can drive iterative auto-build discovery from
  // the tree (which still carries every manufacturable node), independent of the
  // build-only level columns.
  return { levels, summary, trees }
}
