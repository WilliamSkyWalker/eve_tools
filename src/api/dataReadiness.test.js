import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'

vi.mock('../services/esiClient', () => ({
  getPublicContractItems: async () => [{ type_id: 34, quantity: 2 }],
  getOrderPricesForTypes: async () => ({ prices: {} }),
  getPublicContracts: vi.fn(),
}))

const navigation = {
  regions: { 10000002: { n: 'The Forge', nz: '伏尔戈' } },
  systems: {
    30000142: { n: 'Jita', nz: '吉他', r: 10000002, s: 0.9 },
    31000001: { n: 'J000001', r: 10000002, s: -1 },
  },
}
const wormhole = { systems: { 31000001: { c: 1, e: '', s: [] } }, types: {} }
let requests

beforeEach(async () => {
  vi.resetModules()
  const { useSettingsStore } = await import('../stores/settings')
  useSettingsStore().setServer('gf')
  useSettingsStore().setLocale('zh')
  requests = new Map()
  vi.stubGlobal('fetch', vi.fn(url => new Promise(resolve => requests.set(url, resolve))))
})
afterEach(() => vi.unstubAllGlobals())

function respond(file, data) {
  requests.get(`/data/${file}.json`)({ ok: true, json: async () => data })
}

it('waits for navigation data before returning system and region searches', async () => {
  const { searchSystems } = await import('./navigation')
  const { searchRegions } = await import('./contracts')
  const done = vi.fn()
  const systems = searchSystems('Jita').then(done)
  const regions = searchRegions('The Forge')
  await flushPromises()
  expect(done).not.toHaveBeenCalled()
  expect(fetch).toHaveBeenCalledTimes(1)
  respond('navigation', navigation)
  await systems
  expect(done).toHaveBeenCalledWith({ data: { results: [expect.objectContaining({ solar_system_id: 30000142 })] } })
  expect((await regions).data.results[0].region_id).toBe(10000002)
})

it('waits for both wormhole and navigation data before searching or opening details', async () => {
  const { searchWormholeSystems, getWormholeSystemDetail } = await import('./wormhole')
  const done = vi.fn()
  const search = searchWormholeSystems('J000001').then(done)
  const detail = getWormholeSystemDetail(31000001)
  respond('wormhole', wormhole)
  await flushPromises()
  expect(done).not.toHaveBeenCalled()
  respond('navigation', navigation)
  await search
  expect(done.mock.calls[0][0].data.results[0].solar_system_name).toBe('J000001')
  expect((await detail).data.class_display).toBe('C1')
})

it('waits for industry data before resolving contract item names', async () => {
  const { getContractItems } = await import('./contracts')
  const done = vi.fn()
  const result = getContractItems(1).then(done)
  await flushPromises()
  expect(done).not.toHaveBeenCalled()
  respond('industry-serenity', { types: { 34: { n: 'Tritanium', nz: '三钛合金' } } })
  await result
  expect(done.mock.calls[0][0].data.items[0].type_name).toBe('三钛合金')
})
