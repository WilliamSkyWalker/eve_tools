import { beforeEach, expect, it, vi } from 'vitest'
import { getContractItems } from './contracts'
import { getPublicContractItems, getOrderPricesForTypes } from './esiClient'

vi.mock('../data/loader', () => ({
  getIndustryData: () => ({ types: { 34: { n: 'Tritanium', nz: '三钛合金' } } }),
  getNavigationData: () => null,
}))
vi.mock('./esiClient', () => ({
  getPublicContracts: vi.fn(),
  getPublicContractItems: vi.fn(),
  getOrderPricesForTypes: vi.fn(),
}))

beforeEach(() => vi.resetAllMocks())

it('reports item-list and unique price requests without changing contract valuation', async () => {
  getPublicContractItems.mockResolvedValue([
    { type_id: 34, quantity: 2, is_included: true },
    { type_id: 34, quantity: 3, is_included: true },
    { type_id: 35, quantity: 4, is_included: false },
  ])
  getOrderPricesForTypes.mockImplementation(async (ids, datasource, region, { onProgress }) => {
    expect(ids).toEqual([34, 35])
    expect(datasource).toBe('serenity')
    expect(region).toBe(10000002)
    onProgress({ completed: 0, total: 2 })
    onProgress({ completed: 1, total: 2 })
    onProgress({ completed: 2, total: 2 })
    return { prices: { 34: { buy_price: 5, sell_price: 6 } } }
  })
  const onProgress = vi.fn()
  const result = await getContractItems(10, 'serenity', { onProgress })
  expect(onProgress.mock.calls.map(([value]) => value)).toEqual([
    { completed: 1, total: 3 },
    { completed: 1, total: 3 },
    { completed: 2, total: 3 },
    { completed: 3, total: 3 },
  ])
  expect(result).toMatchObject({ total_jita_buy: 25, total_jita_value: 30 })
  expect(result.items).toHaveLength(3)
})

it('completes an empty contract after its item-list request', async () => {
  getPublicContractItems.mockResolvedValue([])
  const onProgress = vi.fn()
  expect(await getContractItems(11, 'serenity', { onProgress })).toEqual({
    items: [], total_jita_buy: 0, total_jita_value: 0,
  })
  expect(onProgress).toHaveBeenCalledWith({ completed: 1, total: 1 })
  expect(getOrderPricesForTypes).not.toHaveBeenCalled()
})
