/**
 * Contracts service — port of esi/services/contracts.py
 */

import { getIndustryData, getNavigationData } from '../data/loader'
import { getPublicContracts as esiGetContracts, getPublicContractItems as esiGetItems, getOrderPricesForTypes } from './esiClient'
import { locName } from './locale'

const JITA_REGION_ID = 10000002

export async function getPublicContracts(regionId, contractType = null, page = 1, datasource = 'serenity') {
  const result = await esiGetContracts(regionId, page, datasource)
  let contracts = result.contracts || []

  if (contractType) {
    contracts = contracts.filter(c => c.type === contractType)
  }

  // Enrich with defaults
  for (const c of contracts) {
    c.title = c.title || ''
    c.price = c.price || 0
    c.reward = c.reward || 0
    c.volume = c.volume || 0
    c.collateral = c.collateral || 0
  }

  return { contracts, page, total_pages: result.total_pages }
}

export async function getContractItems(contractId, datasource = 'serenity') {
  let items
  try {
    items = await esiGetItems(contractId, datasource)
  } catch {
    return { items: [], total_jita_value: 0, total_jita_buy: 0 }
  }

  // Resolve type names from local data
  const indData = getIndustryData()
  const typeIds = [...new Set(items.filter(i => i.type_id).map(i => i.type_id))]

  // Fetch Jita prices
  const jitaPrices = typeIds.length ? await getOrderPricesForTypes(typeIds, datasource, JITA_REGION_ID) : {}

  let totalJitaSell = 0
  let totalJitaBuy = 0

  for (const item of items) {
    const tid = item.type_id
    if (tid && indData?.types[tid]) {
      const t = indData.types[tid]
      item.type_name = locName(t)
      item.type_name_zh = t.nz
    }
    const prices = tid ? (jitaPrices[tid] || {}) : {}
    item.jita_sell = prices.sell_price ?? null
    item.jita_buy = prices.buy_price ?? null
    const qty = item.quantity || 0
    if (item.is_included !== false) {
      if (item.jita_sell) totalJitaSell += item.jita_sell * qty
      if (item.jita_buy) totalJitaBuy += item.jita_buy * qty
    }
  }

  return {
    items,
    total_jita_value: Math.round(totalJitaSell * 100) / 100,
    total_jita_buy: Math.round(totalJitaBuy * 100) / 100,
  }
}

export function searchRegions(query, limit = 10) {
  if (!query || query.length < 1) return []
  const navData = getNavigationData()
  if (!navData) return []

  const q = query.toLowerCase().trim()
  const results = []

  for (const [ridStr, reg] of Object.entries(navData.regions)) {
    const rid = parseInt(ridStr)
    if (rid >= 11000000) continue  // exclude wormhole/abyssal

    const matchEn = reg.n.toLowerCase().startsWith(q)
    const matchZh = reg.nz && reg.nz.startsWith(query)
    if (!matchEn && !matchZh) continue

    results.push({
      region_id: rid,
      region_name: reg.n,
      region_name_zh: reg.nz,
    })

    if (results.length >= limit) break
  }

  results.sort((a, b) => a.region_name.localeCompare(b.region_name))
  return results
}
