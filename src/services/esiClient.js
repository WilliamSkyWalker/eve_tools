/**
 * Direct ESI client — replaces the Django proxy.
 */

const ESI_URLS = {
  serenity: 'https://ali-esi.evepc.163.com',
  tranquility: 'https://esi.evetech.net',
}

const ESI_TIMEOUT = 30000

async function esiGet(datasource, path, params = {}) {
  const base = ESI_URLS[datasource] || ESI_URLS.serenity
  const url = new URL(`/latest${path}`, base)
  url.searchParams.set('datasource', datasource)
  for (const [k, v] of Object.entries(params)) {
    if (v != null) url.searchParams.set(k, v)
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ESI_TIMEOUT)
  try {
    const resp = await fetch(url.toString(), { signal: controller.signal })
    if (!resp.ok) throw new Error(`ESI ${resp.status}: ${path}`)
    const totalPages = parseInt(resp.headers.get('x-pages') || '1', 10)
    const data = await resp.json()
    return { data, totalPages }
  } finally {
    clearTimeout(timer)
  }
}

// ── Market prices (cached in memory with TTL) ──

const priceCache = {}  // datasource -> { data, timestamp }
const PRICE_TTL = 3600000  // 1 hour

export async function getMarketPrices(datasource = 'serenity') {
  const cached = priceCache[datasource]
  if (cached && Date.now() - cached.timestamp < PRICE_TTL) {
    return cached.data
  }
  const { data } = await esiGet(datasource, '/markets/prices/')
  // Build { type_id: { adjusted_price, average_price } }
  const map = {}
  for (const item of data) {
    map[item.type_id] = {
      adjusted_price: item.adjusted_price ?? null,
      average_price: item.average_price ?? null,
    }
  }
  priceCache[datasource] = { data: map, timestamp: Date.now() }
  return map
}

export async function getPricesForTypes(typeIds, datasource = 'serenity') {
  const all = await getMarketPrices(datasource)
  const result = {}
  for (const tid of typeIds) {
    if (all[tid]) result[tid] = all[tid]
  }
  return result
}

// ── Market orders ──

const DEFAULT_REGION_ID = 10000002  // The Forge (Jita)
const JITA_SYSTEM_ID = 30000142     // Jita system ID

export async function getMarketOrders(regionId, typeId, datasource = 'serenity') {
  const { data } = await esiGet(datasource, `/markets/${regionId}/orders/`, {
    type_id: typeId,
    order_type: 'all',
  })
  return data
}

const orderCache = {}  // `${datasource}:${regionId}:${typeId}` -> { data, timestamp }
const ORDER_TTL = 3600000  // 1 hour

async function fetchOrderPricesForType(regionId, typeId, datasource) {
  const key = `${datasource}:${regionId}:${typeId}`
  const cached = orderCache[key]
  if (cached && Date.now() - cached.timestamp < ORDER_TTL) {
    return cached.data
  }
  try {
    const orders = await getMarketOrders(regionId, typeId, datasource)
    
    // Filter orders to only include Jita system orders
    const jitaOrders = orders.filter(o => o.system_id === JITA_SYSTEM_ID)
    
    const buys = jitaOrders.filter(o => o.is_buy_order).map(o => o.price)
    const sells = jitaOrders.filter(o => !o.is_buy_order).map(o => o.price)
    const data = {
      buy_price: buys.length ? Math.max(...buys) : null,
      sell_price: sells.length ? Math.min(...sells) : null,
    }
    orderCache[key] = { data, timestamp: Date.now() }
    return data
  } catch {
    return { buy_price: null, sell_price: null }
  }
}

export async function getOrderPricesForTypes(typeIds, datasource = 'serenity', regionId = null) {
  if (!typeIds.length) return {}
  regionId = regionId || DEFAULT_REGION_ID

  // Concurrent with max 10 in-flight
  const result = {}
  const CONCURRENCY = 10
  const pending = [...typeIds]

  async function worker() {
    while (pending.length) {
      const tid = pending.shift()
      result[tid] = await fetchOrderPricesForType(regionId, tid, datasource)
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, typeIds.length) }, () => worker()))
  return result
}

// ── Public contracts ──

export async function getPublicContracts(regionId, page = 1, datasource = 'serenity') {
  const { data, totalPages } = await esiGet(datasource, `/contracts/public/${regionId}/`, { page })
  return { contracts: data, page, total_pages: totalPages }
}

const contractItemsCache = {}  // `${datasource}:${contractId}` -> data

export async function getPublicContractItems(contractId, datasource = 'serenity') {
  const key = `${datasource}:${contractId}`
  if (contractItemsCache[key]) return contractItemsCache[key]
  const { data } = await esiGet(datasource, `/contracts/public/items/${contractId}/`)
  contractItemsCache[key] = data
  return data
}
