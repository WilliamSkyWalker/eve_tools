/**
 * Blueprint search — port of industry/services/blueprint_lookup.py
 */

import { getIndustryData } from '../data/loader'
import { MANUFACTURING_ACTIVITY_ID, REACTION_ACTIVITY_ID, getSourceForProduct } from './calculator'

import { getTypeName } from './calculator'

/**
 * Search blueprints by product name (Chinese or English).
 */
export function searchBlueprints(query, limit = 20) {
  const data = getIndustryData()
  if (!data || !query) return []

  const q = query.toLowerCase()
  const mfgProducts = data.products[MANUFACTURING_ACTIVITY_ID]
  if (!mfgProducts) return []

  const results = []
  for (const [prodTidStr, [bpTid, qty]] of Object.entries(mfgProducts)) {
    const prodTid = parseInt(prodTidStr)
    const prodType = data.types[prodTid]
    if (!prodType || prodType.n?.startsWith('OLD ')) continue

    const matchEn = prodType.n?.toLowerCase().includes(q)
    const matchZh = prodType.nz?.includes(query)
    if (!matchEn && !matchZh) continue

    const bpInfo = data.blueprints[bpTid]
    results.push({
      blueprint_type_id: bpTid,
      blueprint_name: getTypeName(bpTid),
      product_type_id: prodTid,
      product_name: getTypeName(prodTid),
      product_name_en: prodType.n,
      max_production_limit: bpInfo?.ml ?? null,
    })

    if (results.length >= limit) break
  }

  return results
}

/**
 * Get full blueprint details.
 */
export function getBlueprintDetail(blueprintTypeId) {
  const data = getIndustryData()
  if (!data) return null

  const bpType = data.types[blueprintTypeId]
  if (!bpType) return null

  const productEntry = data.productsByBp[blueprintTypeId]?.[MANUFACTURING_ACTIVITY_ID]
  if (!productEntry) return null

  const [prodTid, prodQty] = productEntry
  const activity = data.activities[blueprintTypeId]?.[MANUFACTURING_ACTIVITY_ID]
  const bpInfo = data.blueprints[blueprintTypeId]

  const mats = data.materials[blueprintTypeId]?.[MANUFACTURING_ACTIVITY_ID] || []

  const materialList = mats.map(([matTid, qty]) => {
    const source = getSourceForProduct(matTid)
    return {
      type_id: matTid,
      type_name: getTypeName(matTid),
      quantity: qty,
      has_blueprint: source !== null,
      blueprint_type_id: source?.bpTypeId ?? null,
      source_activity: source?.activityId ?? null,
      is_reaction: source?.activityId === REACTION_ACTIVITY_ID,
    }
  })

  return {
    blueprint_type_id: blueprintTypeId,
    blueprint_name: getTypeName(blueprintTypeId),
    product: {
      type_id: prodTid,
      type_name: getTypeName(prodTid),
      quantity: prodQty,
    },
    manufacturing_time: activity ?? null,
    max_production_limit: bpInfo?.ml ?? null,
    materials: materialList,
  }
}
