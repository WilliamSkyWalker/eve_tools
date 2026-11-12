import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { getOrderPricesForTypes } from '../services/esiClient'
import { loadIndustryData, loadLpStoreData } from '../data/loader'
import { useSettingsStore } from '../stores/settings'
import LpStoreView from './LpStoreView.vue'
import T2RankView from './T2RankView.vue'

vi.mock('../services/esiClient', () => ({ getOrderPricesForTypes: vi.fn() }))
vi.mock('../data/loader', () => ({
  loadIndustryData: vi.fn(),
  loadLpStoreData: vi.fn(),
  getIndustryData: () => ({
    t2ships: [[587, [[34, 2]]]],
    types: { 587: { n: 'Test Ship', g: 25 }, 34: { n: 'Tritanium' } },
    groups: { 25: { n: 'Frigate' } },
  }),
  getLpStoreData: () => ({
    corps: { 1: { n: 'Test Corp' } },
    offers: { 1: [{ t: 587, q: 1, lp: 100, isk: 0, req: [[34, 2]] }] },
    types: { 587: { n: 'Test Ship' }, 34: { n: 'Tritanium' } },
  }),
}))

beforeEach(() => {
  vi.resetAllMocks()
  useSettingsStore().setLocale('en')
  loadIndustryData.mockResolvedValue({})
  loadLpStoreData.mockResolvedValue({})
})

describe.each([
  ['LP offers', LpStoreView],
  ['T2 ranking', T2RankView],
])('%s query progress', (_name, component) => {
  it('shows completed price work while waiting, then removes the indicator', async () => {
    let report, resolvePrices
    getOrderPricesForTypes.mockImplementation((_ids, _server, _region, options) => {
      report = options.onProgress
      return new Promise(resolve => { resolvePrices = resolve })
    })
    const wrapper = mount(component)
    try {
      await flushPromises()
      if (component === LpStoreView) {
        await wrapper.get('.corp-search').trigger('focus')
        await wrapper.get('.corp-option').trigger('click')
        await wrapper.get('.calc-btn').trigger('click')
      }
      expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('0')
      report({ completed: 1, total: 2 })
      await flushPromises()
      expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('50')
      expect(wrapper.find('.query-progress-spinner').exists()).toBe(true)
      resolvePrices({ prices: { 587: { buy_price: 100, sell_price: 110 }, 34: { sell_price: 5 } }, esiUnavailable: false })
      await flushPromises()
      expect(wrapper.find('[role="progressbar"]').exists()).toBe(false)
      expect(wrapper.text()).toContain('Test Ship')
    } finally {
      wrapper.unmount()
    }
  })
})
