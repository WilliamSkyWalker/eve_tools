/**
 * Market services — text parsing + name resolution (local) + ESI order prices.
 * Port of esi/services/market.py
 */

import { getIndustryData } from '../data/loader'
import { getOrderPricesForTypes } from './esiClient'
import { locName } from './locale'

/**
 * Zero-width and formatting characters that survive copy/paste from the game
 * client or a web page but carry no meaning: ZWSP/ZWNJ/ZWJ, bidi marks, word
 * joiner, BOM, soft hyphen. Left in place they silently break name lookup
 * (e.g. "猎獒级" with a trailing ZWSP would never match "猎獒级").
 * Note: \t is NOT stripped — column splitting depends on it.
 */
const INVISIBLE_RE = /[\u00AD\u200B-\u200F\u2060\uFEFF]/g

/**
 * Normalize a pasted field: drop invisible characters, NFKC-fold (full-width
 * → half-width for digits/latin/punctuation, 　→ space), collapse runs of
 * whitespace, trim. `\s` already covers NBSP and 全角空格.
 */
function cleanField(s) {
  return s.replace(INVISIBLE_RE, '').normalize('NFKC').replace(/\s+/g, ' ').trim()
}

/**
 * Lookup key for name → typeID matching. Both sides of the comparison (SDE
 * names and user input) go through this, so it can only ever widen matching.
 */
function lookupKey(s) {
  return cleanField(s).toLowerCase()
}

/**
 * Try to parse a string as an integer quantity.
 * Handles comma/dot/space as thousand separators: "1,000", "1.000", "1 000"
 */
function parseQty(s) {
  if (!s) return null
  const cleaned = cleanField(s).replace(/[\s,.]/g, '')
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
    // Strip invisibles before anything else — a ZWSP between name and quantity
    // would otherwise defeat both the tab split and the "Name 100" regex.
    const line = rawLine.replace(INVISIBLE_RE, '').trim()
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

  // Build reverse lookup: name/nz -> type_id (lazy, one-time).
  // Keys go through lookupKey so pasted text with stray invisible characters,
  // full-width digits/punctuation or doubled spaces still resolves.
  if (!data._nameLookup) {
    data._nameLookup = new Map()
    for (const [tidStr, t] of Object.entries(data.types)) {
      const tid = parseInt(tidStr)
      if (t.n) data._nameLookup.set(lookupKey(t.n), { tid, t })
      if (t.nz) data._nameLookup.set(lookupKey(t.nz), { tid, t })
    }
  }

  return names.map(name => {
    const entry = data._nameLookup.get(lookupKey(name))
    return {
      name,
      type_id: entry?.tid ?? null,
      type_name: entry ? locName(entry.t) : null,
      volume: entry?.t?.v ?? null,
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
  const { prices: orderPrices, esiUnavailable } = typeIds.length
    ? await getOrderPricesForTypes(typeIds, datasource)
    : { prices: {}, esiUnavailable: false }

  const items = resolved.map((res, i) => {
    const op = res.type_id ? (orderPrices[res.type_id] || {}) : {}
    return {
      name: res.name,
      type_id: res.type_id,
      type_name: res.type_name,
      volume: res.volume,
      quantity: parsed[i].quantity,
      matched: res.matched,
      buy_price: op.buy_price ?? null,
      sell_price: op.sell_price ?? null,
    }
  })

  return { items, esiUnavailable }
}
