import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ManufacturingQueue from './ManufacturingQueue.vue'
import { getIndustryData } from '../../data/loader'
import { useSettingsStore } from '../../stores/settings'
import { useI18n } from '../../i18n'

vi.mock('../../data/loader', () => ({ getIndustryData: vi.fn() }))

// The loader exposes the JSON unchanged. Keep real names and blueprint mappings
// here so these tests also catch lookup failures in the reported seven ships.
const datasets = Object.fromEntries(['serenity', 'tranquility'].map(datasource => [
  datasource,
  JSON.parse(readFileSync(`public/data/industry-${datasource}.json`, 'utf8')),
]))

const reportedShips = [
  { product_name: '伊什塔级', product_type_id: 12005, blueprint_type_id: 12006, runs: 100, me_level: 0 },
  { product_name: '长剑级', product_type_id: 11963, blueprint_type_id: 11964, runs: 10, me_level: 0 },
  { product_name: '埃拉兹级', product_type_id: 11969, blueprint_type_id: 11970, runs: 10, me_level: 0 },
  { product_name: '厄里斯级', product_type_id: 22460, blueprint_type_id: 22461, runs: 60, me_level: 0 },
  { product_name: '恶狼级', product_type_id: 28665, blueprint_type_id: 28666, runs: 10, me_level: 0 },
  { product_name: '魔像级', product_type_id: 28710, blueprint_type_id: 28711, runs: 3, me_level: 0 },
  { product_name: '救世级', product_type_id: 22428, blueprint_type_id: 22429, runs: 7, me_level: 0 },
]
const reportedText = reportedShips.map(ship => `${ship.product_name}    ${ship.runs}    ME0`).join('\n')

let wrapper

async function importPlan(text) {
  await wrapper.get('.add-row .btn.ghost').trigger('click')
  await wrapper.get('textarea').setValue(text)
  await wrapper.get('.modal-actions .btn').trigger('click')
}

function importedItems() {
  const events = wrapper.emitted('calculate')
  expect(events).toHaveLength(1)
  expect(wrapper.find('.modal-overlay').exists()).toBe(false)
  return events[0][0]
}

afterEach(() => wrapper?.unmount())

describe.each(['serenity', 'tranquility'])('manufacturing plan import on %s', datasource => {
  beforeEach(() => {
    const settings = useSettingsStore()
    settings.setServer(datasource === 'serenity' ? 'gf' : 'of')
    settings.setLocale('zh')
    getIndustryData.mockImplementation(() => datasets[useSettingsStore().datasource])
    wrapper = mount(ManufacturingQueue, { global: { stubs: { teleport: true } } })
  })

  it.each(['=== 最终产品 ===\n', ''])('imports the reported seven ships with heading %j', async heading => {
    // Explicit ME0 must override the current default material efficiency.
    await wrapper.get('.add-row input[type="number"]').setValue(6)
    await importPlan(heading + reportedText)

    expect(importedItems()).toEqual(reportedShips)
    expect(wrapper.findAll('tbody tr')).toHaveLength(7)
  })

  it('preserves efficiencies in an existing tab-separated shared plan', async () => {
    await importPlan('=== 最终产品 ===\n伊什塔级\t100\tME5\n长剑级\t10\tME10')

    expect(importedItems()).toEqual([
      { ...reportedShips[0], me_level: 5 },
      { ...reportedShips[1], me_level: 10 },
    ])
  })

  it('accepts mixed spaces and tabs with case-insensitive ME suffixes', async () => {
    await importPlan('伊什塔级\t100    ME3\n长剑级    10\tme8')

    expect(importedItems()).toEqual([
      { ...reportedShips[0], me_level: 3 },
      { ...reportedShips[1], me_level: 8 },
    ])
  })

  it('keeps spaces and trailing digits in English product names', async () => {
    useSettingsStore().setLocale('en')
    await importPlan('=== Final Product ===\nHeavy Missile Launcher II    4    ME10\nCap Booster 400    20    ME2')

    expect(importedItems()).toEqual([
      { product_name: 'Heavy Missile Launcher II', product_type_id: 2410, blueprint_type_id: 2411, runs: 4, me_level: 10 },
      { product_name: 'Cap Booster 400', product_type_id: 11287, blueprint_type_id: 11288, runs: 20, me_level: 2 },
    ])
  })

  it('preserves inventory and quantity formats and uses the default ME when omitted', async () => {
    await wrapper.get('.add-row input[type="number"]').setValue(4)
    await importPlan('伊什塔级\t舰船\t\t100\n长剑级 x10\n10x 埃拉兹级\n厄里斯级 60')

    expect(importedItems()).toEqual(reportedShips.slice(0, 4).map(ship => ({ ...ship, me_level: 4 })))
  })

  it('imports only the final products from a plan with multiple sections', async () => {
    await importPlan('=== 原材料 ===\n长剑级\t10\n=== 最终产品 ===\n伊什塔级    100    ME0\n=== 一级材料 ===\n厄里斯级\t60\tME0')

    expect(importedItems()).toEqual([reportedShips[0]])
  })

  it('does not import another section when the final product section is empty', async () => {
    await importPlan('=== 最终产品 ===\n\n=== 原材料 ===\n长剑级\t10')

    expect(wrapper.emitted('calculate')).toBeUndefined()
    expect(wrapper.find('tbody tr').exists()).toBe(false)
    expect(wrapper.find('.modal-overlay').exists()).toBe(true)
    expect(wrapper.get('.import-error').text()).toBe(useI18n().t('queue.importFormatError'))
  })

  it.each(['zh', 'en'])('explains an unparseable format in %s', async locale => {
    useSettingsStore().setLocale(locale)
    await importPlan('伊什塔级 ME0')

    expect(wrapper.emitted('calculate')).toBeUndefined()
    const message = wrapper.get('.import-error').text()
    expect(message).toBe(useI18n().t('queue.importFormatError'))
    expect(message).not.toBe('queue.importFormatError')
    expect(message).not.toBe(useI18n().t('queue.importError'))
    if (locale === 'zh') expect(message).toContain('未找到可导入的产品')
  })
})
