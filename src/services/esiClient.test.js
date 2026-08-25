import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getOrderPricesForTypes } from './esiClient'

// Minimal order rows; only Jita (30000142) rows should be considered.
function orders(price) {
  return [
    { system_id: 30000142, is_buy_order: true, price: price - 100 },
    { system_id: 30000142, is_buy_order: false, price },
    { system_id: 30002187, is_buy_order: false, price: 1 },  // Amarr — must be ignored
  ]
}

describe('getOrderPricesForTypes', () => {
  beforeEach(() => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      headers: { get: () => '1' },
      json: async () => orders(500),
    }))
  })

  function urlsFor() {
    return global.fetch.mock.calls.map(c => c[0])
  }

  it('routes PLEX to the global market region instead of The Forge', async () => {
    // Distinct typeIDs per test avoid the module-level 1h order cache.
    const { prices } = await getOrderPricesForTypes([44992], 'tranquility')
    expect(urlsFor()[0]).toContain('/markets/19000001/orders/')
    expect(urlsFor()[0]).toContain('type_id=44992')
    expect(prices[44992]).toEqual({ buy_price: 400, sell_price: 500 })
  })

  it('keeps ordinary types on The Forge', async () => {
    await getOrderPricesForTypes([34], 'tranquility')
    expect(urlsFor()[0]).toContain('/markets/10000002/orders/')
  })

  it('routes PLEX globally even when an explicit region is passed', async () => {
    await getOrderPricesForTypes([44992, 35], 'serenity', 10000002)
    const urls = urlsFor()
    expect(urls.find(u => u.includes('type_id=44992'))).toContain('/markets/19000001/')
    expect(urls.find(u => u.includes('type_id=35'))).toContain('/markets/10000002/')
  })
})
