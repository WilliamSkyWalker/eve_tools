/**
 * EVE Online material calculation — direct port of industry/services/calculator.py
 */

import { getIndustryData } from '../data/loader'

export const MANUFACTURING_ACTIVITY_ID = 1
export const REACTION_ACTIVITY_ID = 11

/**
 * EVE material formula:
 * required = max(runs, ceil(round(runs * base_quantity * modifiers, 2)))
 * Reactions do NOT benefit from ME — caller should pass meLevel=0.
 */
export function calculateMaterialQuantity(runs, baseQuantity, meLevel = 0) {
  const meModifier = 1.0 - meLevel * 0.01
  const raw = runs * baseQuantity * meModifier
  // round to 2 decimals to prevent floating-point drift
  const rounded = Math.round(raw * 100) / 100
  const ceiled = Math.ceil(rounded)
  return Math.max(runs, ceiled)
}

/**
 * Given a product type_id, find how it can be produced.
 * Returns { bpTypeId, activityId } or null.
 * Checks manufacturing first, then reactions.
 */
export function getSourceForProduct(productTypeId) {
  const data = getIndustryData()
  if (!data) return null
  for (const activityId of [MANUFACTURING_ACTIVITY_ID, REACTION_ACTIVITY_ID]) {
    const entry = data.products[activityId]?.[productTypeId]
    if (entry) {
      return { bpTypeId: entry[0], activityId }
    }
  }
  return null
}

import { locName } from './locale'

/**
 * Get display name for a type_id, respecting current locale.
 */
export function getTypeName(typeId) {
  const data = getIndustryData()
  if (!data) return String(typeId)
  const t = data.types[typeId]
  if (!t) return String(typeId)
  return locName(t)
}

/**
 * Get group name for a type_id.
 */
export function getGroupName(typeId) {
  const data = getIndustryData()
  if (!data) return ''
  const t = data.types[typeId]
  if (!t || !t.g) return ''
  return data.groups[t.g]?.n || ''
}

/**
 * Calculate all materials needed for a blueprint at given ME and runs.
 */
export function calculateBlueprintMaterials(blueprintTypeId, meLevel, runs, activityId = MANUFACTURING_ACTIVITY_ID) {
  const data = getIndustryData()
  if (!data) return []

  const effectiveMe = activityId === MANUFACTURING_ACTIVITY_ID ? meLevel : 0
  const mats = data.materials[blueprintTypeId]?.[activityId]
  if (!mats) return []

  const result = []
  for (const [matTypeId, qty] of mats) {
    const adjustedQty = calculateMaterialQuantity(runs, qty, effectiveMe)
    const source = getSourceForProduct(matTypeId)
    result.push({
      type_id: matTypeId,
      type_name: getTypeName(matTypeId),
      base_quantity: qty,
      adjusted_quantity: adjustedQty,
      has_blueprint: source !== null,
      blueprint_type_id: source?.bpTypeId ?? null,
      source_activity: source?.activityId ?? null,
      is_reaction: source?.activityId === REACTION_ACTIVITY_ID,
      group_name: getGroupName(matTypeId),
    })
  }

  result.sort((a, b) => {
    const gc = a.group_name.localeCompare(b.group_name)
    return gc !== 0 ? gc : a.type_name.localeCompare(b.type_name)
  })
  return result
}
