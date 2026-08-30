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

const MATERIAL_SECTION_RE = /^(?:高能量槽|中能量槽|低能量槽|改装件插槽|弹药|无人机|货舱|植入体|增效剂|子系统|high power slots?|medium power slots?|low power slots?|rig slots?|charges?|drones?|cargo|implants?|boosters?|subsystems?)$/i

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
 *   - Fitting list prefix: "3x Mega Pulse Laser II"
 *   - Suffix format: "Tritanium x2", "Tritanium ×3"
 *   - Name only (quantity defaults to null)
 */
export function parseMaterialText(text) {
  const results = []
  for (const rawLine of text.split('\n')) {
    // Strip invisibles before anything else — a ZWSP between name and quantity
    // would otherwise defeat both the tab split and the "Name 100" regex.
    const line = rawLine.replace(INVISIBLE_RE, '').normalize('NFKC').trim()
    if (!line || MATERIAL_SECTION_RE.test(line)) continue

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
      // Fitting lists use "3x Item Name"; shopping lists often use "Item Name x3".
      const prefixMatch = line.match(/^([\d,.\s]+)\s*[x×]\s*(.+)$/i)
      if (prefixMatch) {
        name = prefixMatch[2].trim()
        quantity = parseQty(prefixMatch[1])
      } else {
        const suffixMatch = line.match(/^(.+?)\s+[x×]([\d,.\s]+)\s*$/i)
        if (suffixMatch) {
          name = suffixMatch[1].trim()
          quantity = parseQty(suffixMatch[2])
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
 * Resolve parsed rows and merge duplicates by type ID. Unmatched rows are
 * merged by their normalized pasted name so repeated typos do not flood the
 * result table. A row without an explicit quantity represents one item.
 */
export function mergeResolvedItems(parsed) {
  const resolved = resolveItemNames(parsed.map(item => item.name))
  const merged = new Map()

  for (let i = 0; i < resolved.length; i++) {
    const item = resolved[i]
    const key = item.matched ? `type:${item.type_id}` : `name:${lookupKey(item.name)}`
    const quantity = parsed[i].quantity ?? 1
    const existing = merged.get(key)

    if (existing) {
      existing.quantity += quantity
    } else {
      merged.set(key, { ...item, quantity })
    }
  }

  return [...merged.values()]
}

/**
 * Full market compare: parse text, resolve names, fetch order prices.
 * Equivalent to the Django market_compare endpoint.
 */
export async function marketCompare(text, datasource = 'serenity') {
  const parsed = parseMaterialText(text)
  if (!parsed.length) return { items: [] }

  const merged = mergeResolvedItems(parsed)

  const typeIds = merged.filter(item => item.matched).map(item => item.type_id)
  const { prices: orderPrices, esiUnavailable } = typeIds.length
    ? await getOrderPricesForTypes(typeIds, datasource)
    : { prices: {}, esiUnavailable: false }

  const items = merged.map(item => {
    const op = item.type_id ? (orderPrices[item.type_id] || {}) : {}
    return {
      ...item,
      buy_price: op.buy_price ?? null,
      sell_price: op.sell_price ?? null,
    }
  })

  return { items, esiUnavailable }
}
