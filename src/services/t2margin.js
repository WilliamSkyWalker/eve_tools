/**
 * T2 ship profit ranking.
 *
 * `industry-{server}.json` ships a precomputed `t2ships` list: each entry is
 * `[shipTypeId, [[rawTypeId, qty], ...]]` — the fully-expanded raw-material BOM
 * (minerals / moon goo / PI / salvage / fuel) at ME0 base quantities. The BOM is
 * static, so only Jita prices are fetched live here.
 *
 * Revenue = ship Jita BUY price (吉他收单). Cost = Σ raw × Jita SELL price (吉他卖单).
 * Margin = (revenue − cost) / cost. Rows are sorted by margin descending.
 */

import { getIndustryData } from '../data/loader'
import { getOrderPricesForTypes } from './esiClient'
import { locName } from './locale'
import { isSpecialEdition } from './blueprintLookup'

export async function computeT2Margins(datasource = 'serenity') {
  const d = getIndustryData()
  if (!d?.t2ships?.length) return { rows: [], esiUnavailable: false }

  // Ships: skip AT prize / special-edition hulls (not normally manufacturable —
  // their fake prices would dominate the ranking) and anything missing a type.
  const ships = d.t2ships.filter(([tid]) => {
    const t = d.types[tid]
    return t && !isSpecialEdition(t.n)
  })

  // Every type id needing a price (ships + all raw leaves).
  const ids = new Set()
  for (const [tid, raw] of ships) {
    ids.add(tid)
    for (const [m] of raw) ids.add(m)
  }

  const { prices, esiUnavailable } = await getOrderPricesForTypes([...ids], datasource)

  const rows = []
  for (const [tid, raw] of ships) {
    const t = d.types[tid]
    const revenue = prices[tid]?.buy_price   // 吉他收单
    const sell = prices[tid]?.sell_price
    if (!revenue) continue
    if (sell && revenue > sell) continue     // crossed / manipulated buy order — drop

    let cost = 0
    let missing = false
    for (const [m, q] of raw) {
      const p = prices[m]?.sell_price         // 原料按吉他卖单买入
      if (!p) { missing = true; continue }
      cost += p * q
    }
    if (!cost) continue

    const profit = revenue - cost
    rows.push({
      type_id: tid,
      name: locName(t),
      group: d.groups[t.g]?.n || '',
      revenue,
      cost,
      profit,
      margin: (profit / cost) * 100,
      missing,
    })
  }

  rows.sort((a, b) => b.margin - a.margin)
  return { rows, esiUnavailable }
}
