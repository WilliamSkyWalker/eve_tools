import { searchBlueprints as _search, getBlueprintDetail as _detail } from '../services/blueprintLookup'
import { calculateBlueprintMaterials } from '../services/calculator'
import { buildBomTree, aggregateRawMaterials, flattenBomToLevels, buildBatchBom } from '../services/bom'

const wrap = (data) => ({ data })

export function searchBlueprints(query, limit = 20) {
  return Promise.resolve(wrap({ results: _search(query, limit) }))
}

export function getBlueprintDetail(typeId) {
  return Promise.resolve(wrap(_detail(typeId)))
}

export function calculateMaterials(blueprintTypeId, meLevel, runs) {
  return Promise.resolve(wrap({ materials: calculateBlueprintMaterials(blueprintTypeId, meLevel, runs) }))
}

export function getBom(blueprintTypeId, meLevel, runs, buildItems = {}) {
  const tree = buildBomTree(blueprintTypeId, meLevel, runs, 1, buildItems)
  if (!tree) return Promise.resolve(wrap(null))
  const levels = flattenBomToLevels([tree])
  const rawTotals = aggregateRawMaterials(tree)
  const summary = Object.entries(rawTotals)
    .map(([tid, info]) => ({ type_id: parseInt(tid), type_name: info.type_name, total_quantity: info.total_quantity }))
    .sort((a, b) => a.type_id - b.type_id)
  return Promise.resolve(wrap({ tree, levels, summary }))
}

export function getBatchBom(items, buildItems = {}) {
  return Promise.resolve(wrap(buildBatchBom(items, buildItems)))
}
