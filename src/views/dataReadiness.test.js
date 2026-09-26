import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'
import { loadDogmaData, loadIndustryData } from '../data/loader'
import { useSettingsStore } from '../stores/settings'
import IndustryView from './IndustryView.vue'
import FittingView from './FittingView.vue'

vi.mock('../data/loader', () => ({
  loadDogmaData: vi.fn(), loadIndustryData: vi.fn(),
  getDogmaData: () => null, getIndustryData: () => null,
}))

beforeEach(() => {
  vi.resetAllMocks()
  useSettingsStore().setLocale('zh')
})

describe.each([
  ['industry', IndustryView, loadIndustryData, 'manufacturing-queue-stub'],
  ['fitting', FittingView, loadDogmaData, 'ship-search-stub'],
])('%s page readiness', (_name, component, load, selector) => {
  it('enables input only after its data is ready', async () => {
    let resolveData
    load.mockReturnValue(new Promise(resolve => { resolveData = resolve }))
    const wrapper = shallowMount(component)
    try {
      expect(wrapper.find(selector).exists()).toBe(false)
      expect(wrapper.text()).toContain('加载中')
      resolveData({})
      await flushPromises()
      expect(wrapper.find(selector).exists()).toBe(true)
      expect(wrapper.text()).not.toContain('加载中')
    } finally {
      wrapper.unmount()
    }
  })

  it('shows an error instead of enabling input when loading fails', async () => {
    load.mockRejectedValue(new Error('offline'))
    const wrapper = shallowMount(component)
    try {
      await flushPromises()
      expect(wrapper.find(selector).exists()).toBe(false)
      expect(wrapper.text()).toContain('查询失败，请稍后重试')
    } finally {
      wrapper.unmount()
    }
  })
})
