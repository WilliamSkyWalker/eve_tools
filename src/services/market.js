/**
 * Market services — text parsing + name resolution (local) + ESI order prices.
 * Port of esi/services/market.py
 */

import { getIndustryData } from '../data/loader'
import { getOrderPricesForTypes } from './esiClient'
import { locName } from './locale'

/**
 * Parse pasted material list text into (name, quantity) pairs.
 */
export function parseMaterialText(text) {
  const results = []
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim()
    if (!line) continue

    let name, qtyStr
    if (line.includes('\t')) {
      const parts = line.split('\t')
      name = parts[0].trim()
      qtyStr = parts[1]?.trim() || ''
    } else {
      const match = line.match(/^(.+?)\s+([\d,]+(?:\.\d+)?)\s*$/)
      if (match) {
        name = match[1].trim()
        qtyStr = match[2]
      } else {
        name = line
        qtyStr = ''
      }
    }

    let quantity = null
    if (qtyStr) {
      const n = parseInt(qtyStr.replace(/,/g, '').split('.')[0], 10)
      if (!isNaN(n)) quantity = n
    }

    if (name) results.push({ name, quantity })
  }
  return results
}

/**
 * Resolve item names to type_ids using local industry data.
 */
export function resolveItemNames(names) {
  const data = getIndustryData()
  if (!data) return names.map(name => ({ name, type_id: null, type_name: null, matched: false }))

  // Build reverse lookup: name/nz -> type_id (lazy, one-time)
  if (!data._nameLookup) {
    data._nameLookup = new Map()
    for (const [tidStr, t] of Object.entries(data.types)) {
      const tid = parseInt(tidStr)
      if (t.n) data._nameLookup.set(t.n.toLowerCase(), { tid, t })
      if (t.nz) data._nameLookup.set(t.nz, { tid, t })
    }
  }

  return names.map(name => {
    const entry = data._nameLookup.get(name.toLowerCase()) || data._nameLookup.get(name)
    return {
      name,
      type_id: entry?.tid ?? null,
      type_name: entry ? locName(entry.t) : null,
      matched: entry != null,
    }
  })
}

/**
 * Full market compare: parse text, resolve names, fetch order prices.
 * Equivalent to the Django market_compare endpoint.
 */
export async function marketCompare(text, datasource = 'serenity') {
  const parsed = parseMaterialText(text)
  if (!parsed.length) return { items: [] }

  const names = parsed.map(p => p.name)
  const resolved = resolveItemNames(names)

  const typeIds = resolved.filter(r => r.matched).map(r => r.type_id)
  const orderPrices = typeIds.length ? await getOrderPricesForTypes(typeIds, datasource) : {}

  const items = resolved.map((res, i) => {
    const op = res.type_id ? (orderPrices[res.type_id] || {}) : {}
    return {
      name: res.name,
      type_id: res.type_id,
      type_name: res.type_name,
      quantity: parsed[i].quantity,
      matched: res.matched,
      buy_price: op.buy_price ?? null,
      sell_price: op.sell_price ?? null,
    }
  })

  return { items }
}
