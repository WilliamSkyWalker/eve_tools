import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { useSettingsStore } from '../stores/settings'
import { getIndustryData, loadIndustryData } from '../data/loader'
import { getOrderPricesForTypes } from '../services/esiClient'
import MarketView from './MarketView.vue'

const route = vi.hoisted(() => ({ meta: { mtab: 'oreValue' } }))
vi.mock('vue-router', () => ({ useRoute: () => route }))
vi.mock('../data/loader', () => ({
  loadIndustryData: vi.fn(),
  getIndustryData: vi.fn(),
}))
vi.mock('../services/esiClient', () => ({ getOrderPricesForTypes: vi.fn() }))

const industryData = {
  types: { 1230: { n: 'Veldspar', nz: '凡晶石', g: 462, ps: 100, v: 0.1 } },
  groups: { 462: { n: 'Veldspar' } },
  reprocess: { 1230: [[34, 400]] },
}

beforeEach(() => {
  vi.resetAllMocks()
  route.meta.mtab = 'oreValue'
  useSettingsStore().setLocale('zh')
  getOrderPricesForTypes.mockResolvedValue({
    prices: { 34: { buy_price: 5, sell_price: 6 } },
    esiUnavailable: false,
  })
})

describe.each(['price', 'reprocess'])('%s query readiness', tab => {
  it('waits for current server data even if an older dataset is present', async () => {
    route.meta.mtab = tab
    const oldData = { types: {}, groups: {}, reprocess: {} }
    getIndustryData.mockReturnValue(oldData)
    let resolveData
    loadIndustryData.mockReturnValue(new Promise(resolve => { resolveData = resolve }))
    const wrapper = mount(MarketView)
    try {
      await wrapper.get('textarea').setValue('Veldspar 100')
      await wrapper.get('.query-btn').trigger('click')
      await flushPromises()
      expect(wrapper.get('.query-btn').attributes('disabled')).toBeDefined()
      expect(getOrderPricesForTypes).not.toHaveBeenCalled()
      expect(wrapper.find('tbody tr').exists()).toBe(false)

      getIndustryData.mockReturnValue(industryData)
      resolveData(industryData)
      await flushPromises()
      expect(wrapper.get('.query-btn').attributes('disabled')).toBeUndefined()
      expect(wrapper.text()).toContain('凡晶石')
      expect(getOrderPricesForTypes).toHaveBeenCalled()
      expect(wrapper.find('.error-msg').exists()).toBe(false)
    } finally {
      wrapper.unmount()
    }
  })
})

describe('ore value loading', () => {
  it.each(['serenity', 'tranquility'])('waits for %s data on a cold page load', async (datasource) => {
    useSettingsStore().setServer(datasource === 'serenity' ? 'gf' : 'of')
    let resolveData
    loadIndustryData.mockReturnValue(new Promise(resolve => { resolveData = resolve }))
    getIndustryData.mockReturnValue(null)
    const wrapper = mount(MarketView)

    try {
      await flushPromises()
      expect(wrapper.find('.loading-msg').exists()).toBe(true)
      expect(wrapper.find('.error-msg').exists()).toBe(false)
      expect(getOrderPricesForTypes).not.toHaveBeenCalled()

      resolveData(industryData)
      await flushPromises()

      expect(getOrderPricesForTypes).toHaveBeenCalledWith([34], datasource)
      expect(wrapper.find('.loading-msg').exists()).toBe(false)
      expect(wrapper.find('.error-msg').exists()).toBe(false)
      const row = wrapper.get('tbody tr')
      expect(row.text()).toContain('凡晶石')
      expect(row.findAll('td')[1].text()).toBe('160.00')
    } finally {
      wrapper.unmount()
    }
  })

  it('uses the loaded server dataset instead of the previous active dataset', async () => {
    getIndustryData.mockReturnValue({ types: {}, groups: {}, reprocess: {} })
    loadIndustryData.mockResolvedValue(industryData)
    const wrapper = mount(MarketView)
    try {
      await flushPromises()
      expect(wrapper.findAll('tbody tr')).toHaveLength(1)
      expect(wrapper.text()).toContain('凡晶石')
    } finally {
      wrapper.unmount()
    }
  })

  it('shows a handled error when the dataset fails to load', async () => {
    loadIndustryData.mockRejectedValue(new Error('Data download failed'))
    const wrapper = mount(MarketView)
    try {
      await flushPromises()
      expect(wrapper.get('.error-msg').text()).toBe('查询失败，请稍后重试')
      expect(wrapper.find('.loading-msg').exists()).toBe(false)
      expect(getOrderPricesForTypes).not.toHaveBeenCalled()
    } finally {
      wrapper.unmount()
    }
  })
})


describe('ore valuation price basis', () => {
  it('defaults to buy value and recalculates values and ranking when switched to sell and back', async () => {
    loadIndustryData.mockResolvedValue({
      types: {
        ...industryData.types,
        1228: { n: 'Scordite', nz: '灼烧岩', g: 450, ps: 100, v: 0.2 },
      },
      groups: { ...industryData.groups, 450: { n: 'Scordite' } },
      reprocess: { ...industryData.reprocess, 1228: [[35, 401]] },
    })
    getOrderPricesForTypes.mockResolvedValue({ prices: {
      34: { buy_price: 5, sell_price: 6 },
      35: { buy_price: 8, sell_price: 20 },
    } })
    const wrapper = mount(MarketView)
    const rows = () => wrapper.findAll('tbody tr').map(row =>
      row.findAll('td').map(cell => cell.text()))
    try {
      await flushPromises()
      expect(wrapper.get('select').element.value).toBe('buy')
      const buyRows = rows()
      expect(buyRows).toEqual([
        ['凡晶石', '160.00', '0.1 m³', '1,600.00'],
        ['灼烧岩', '128.00', '0.2 m³', '2,560.00'],
      ])
      await wrapper.get('select').setValue('sell')
      expect(rows()).toEqual([
        ['灼烧岩', '320.00', '0.2 m³', '6,400.00'],
        ['凡晶石', '192.00', '0.1 m³', '1,920.00'],
      ])
      expect(wrapper.get('.section-title').text()).toContain('吉他卖单')
      expect(wrapper.get('.reprocess-note').text()).toContain('吉他卖单')
      await wrapper.get('select').setValue('buy')
      expect(rows()).toEqual(buyRows)
      expect(wrapper.get('.section-title').text()).toContain('吉他收单')
      expect(getOrderPricesForTypes).toHaveBeenCalledTimes(1)
    } finally {
      wrapper.unmount()
    }
  })
})
