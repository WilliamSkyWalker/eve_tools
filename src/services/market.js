/**
 * Market services — text parsing + name resolution (local) + ESI order prices.
 * Port of esi/services/market.py
 */

import { getIndustryData } from '../data/loader'
import { getOrderPricesForTypes } from './esiClient'
import { locName } from './locale'

/**
 * Try to parse a string as an integer quantity.
 * Handles comma/dot/space as thousand separators: "1,000", "1.000", "1 000"
 */
function parseQty(s) {
  if (!s) return null
  const cleaned = s.replace(/[\s,.]/g, '')
  const n = parseInt(cleaned, 10)
  return isNaN(n) || n <= 0 ? null : n
}

/**
 * Parse pasted material list text into (name, quantity) pairs.
 *
 * Supported formats:
 *   - Tab-separated (EVE inventory/contract/asset copy): Name\tQty\tGroup\t...
 *     Quantity is found by scanning all columns after the first for a pure number.
 *   - Space-separated: "Tritanium 100000"
 *   - Suffix format: "Tritanium x2", "Tritanium ×3"
 *   - Name only (quantity defaults to null)
 */
export function parseMaterialText(text) {
  const results = []
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim()
    if (!line) continue

    let name = null
    let quantity = null

    if (line.includes('\t')) {
      // Tab-separated: first column is name, scan remaining columns for a number
      const parts = line.split('\t').map(s => s.trim())
      name = parts[0]
      for (let i = 1; i < parts.length; i++) {
        const q = parseQty(parts[i])
        if (q != null) { quantity = q; break }
      }
    } else {
      // Check for "Name x2" / "Name ×3" suffix
      const xMatch = line.match(/^(.+?)\s+[x×](\d+)\s*$/i)
      if (xMatch) {
        name = xMatch[1].trim()
        quantity = parseInt(xMatch[2], 10) || null
      } else {
        // Try "Name 100000" format
        const spaceMatch = line.match(/^(.+?)\s+([\d,.\s]+)\s*$/)
        if (spaceMatch) {
          name = spaceMatch[1].trim()
          quantity = parseQty(spaceMatch[2])
        } else {
          name = line
        }
      }
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
