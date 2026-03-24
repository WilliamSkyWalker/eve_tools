import { getPricesForTypes } from '../services/esiClient'
import { marketCompare as _marketCompare } from '../services/market'

export async function getPrices(typeIds, datasource = 'serenity') {
  const prices = await getPricesForTypes(typeIds, datasource)
  return { data: { prices } }
}

export async function marketCompare(text, datasource = 'serenity') {
  const result = await _marketCompare(text, datasource)
  return { data: result }
}
