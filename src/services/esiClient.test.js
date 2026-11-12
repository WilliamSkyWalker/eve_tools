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
  it('reports cache hits and failures as completed while waiting for the remaining prices', async () => {
    await getOrderPricesForTypes([90001], 'serenity')
    const responses = new Map()
    global.fetch.mockImplementation(url => new Promise(resolve => {
      responses.set(Number(new URL(url).searchParams.get('type_id')), resolve)
    }))
    const onProgress = vi.fn()
    const pending = getOrderPricesForTypes([90001, 90002, 90003], 'serenity', null, { onProgress })
    expect(onProgress).toHaveBeenNthCalledWith(1, { completed: 0, total: 3 })
    await vi.waitFor(() => expect(onProgress).toHaveBeenLastCalledWith({ completed: 1, total: 3 }))

    responses.get(90002)({ ok: false, status: 404 })
    await vi.waitFor(() => expect(onProgress).toHaveBeenLastCalledWith({ completed: 2, total: 3 }))
    responses.get(90003)({ ok: true, headers: { get: () => '1' }, json: async () => orders(900) })
    const result = await pending

    expect(onProgress.mock.calls.map(([progress]) => progress)).toEqual([
      { completed: 0, total: 3 },
      { completed: 1, total: 3 },
      { completed: 2, total: 3 },
      { completed: 3, total: 3 },
    ])
    expect(result).toEqual({
      prices: {
        90001: { buy_price: 400, sell_price: 500 },
        90002: { buy_price: null, sell_price: null },
        90003: { buy_price: 800, sell_price: 900 },
      },
      esiUnavailable: false,
    })
  })

  it('reports an empty batch without fetching', async () => {
    const onProgress = vi.fn()
    expect(await getOrderPricesForTypes([], 'serenity', null, { onProgress }))
      .toEqual({ prices: {}, esiUnavailable: false })
    expect(onProgress).toHaveBeenCalledExactlyOnceWith({ completed: 0, total: 0 })
    expect(global.fetch).not.toHaveBeenCalled()
  })

})
