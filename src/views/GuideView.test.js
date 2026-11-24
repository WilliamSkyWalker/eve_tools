import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { useRoute } from 'vue-router'
import { useSettingsStore } from '../stores/settings'
import { loadGuideData } from '../data/loader'
import GuideView from './GuideView.vue'

vi.mock('vue-router', () => ({ useRoute: vi.fn() }))
vi.mock('../data/loader', () => ({ loadGuideData: vi.fn() }))

const mission = {
  slug: 'convoy',
  type: 'mission',
  title: 'Convoy Attack (Amarr)',
  zh: { title: '护卫舰队袭击（艾玛）' },
  missionName: { en: 'Convoy Attack', zh: '袭击护航队' },
  faction: 'Amarr Empire',
  enemyFactions: ['Amarr Empire'],
  level: 5,
  shipLimit: '',
  colossusSupport: 'blocked',
  colossusNote: 'blocked',
  groups: [],
  sections: [],
  source: {},
}
const complex = {
  slug: 'fortress',
  type: 'unrated',
  title: 'Angel Fortress',
  zh: { title: '天使堡垒' },
  shipLimit: 'Battleship',
  colossusSupport: 'unknown',
  colossusNote: 'complexAllowedUnlisted',
  groups: [],
  sections: [],
  source: {},
}

const guides = [mission, complex, { slug: 'legacy', title: 'Old guide', type: 'mission' }]

async function showGuides(slug, locale = 'zh', entries = guides) {
  useSettingsStore().setLocale(locale)
  useRoute.mockReturnValue({ params: { slug } })
  loadGuideData.mockResolvedValue({
    guides: entries,
    generatedAt: '2026-11-25',
  })
  const wrapper = mount(GuideView, { global: { stubs: { RouterLink: RouterLinkStub, PageHelp: true } } })
  await flushPromises()
  return wrapper
}

describe('GuideView', () => {
  it('uses client names in both languages and still finds the original wiki titles', async () => {
    const wrapper = await showGuides()
    const query = wrapper.get('.search-field input')
    for (const name of [mission.missionName.zh, mission.missionName.en, mission.zh.title, mission.title]) {
      await query.setValue(name)
      expect(wrapper.get('.guide-link').text()).toBe(mission.missionName.zh)
      expect(wrapper.get('.list-english').text()).toBe(mission.missionName.en)
      expect(wrapper.findAll('tbody tr')).toHaveLength(1)
    }
    expect(wrapper.get('.colossus-access').text()).toContain('巨像禁入')
    useSettingsStore().setLocale('en')
    await wrapper.vm.$nextTick()
    expect(wrapper.get('.guide-link').text()).toBe(mission.missionName.en)
    expect(wrapper.find('.list-english').exists()).toBe(false)
    wrapper.unmount()
  })

  it('offers each hostile faction separately for multi-faction guides', async () => {
    const factions = [
      ['Gallente Federation', '盖伦特联邦'],
      ['Guristas Pirates', '古斯塔斯游寇'],
      ['Rogue Drones', '自由无人机'],
      ['Triglavian Collective', '三神裔'],
    ]
    const combined = 'Gallente Federation, Triglavians, Rogue Drones, and Guristas Pirates'
    const wrapper = await showGuides(undefined, 'zh', [
      { ...complex, faction: combined, enemyFactions: factions.map(([key]) => key) },
      mission,
      { ...mission, slug: 'another-amarr', faction: 'Amarr' },
    ])
    const select = wrapper.findAll('select').find(item => item.find('option[value="Amarr Empire"]').exists())
    expect(select.findAll('option')).toHaveLength(6) // All factions, Amarr, and the four site factions.
    for (const [key, chinese] of factions) {
      expect(select.get(`option[value="${key}"]`).text()).toBe(chinese)
      await select.setValue(key)
      expect(wrapper.findAll('tbody tr')).toHaveLength(1)
      expect(wrapper.get('.guide-link').text()).toBe(complex.zh.title)
      const label = wrapper.get('tbody tr td:nth-child(4)').text()
      for (const [, name] of factions) expect(label).toContain(name)
    }

    useSettingsStore().setLocale('en')
    await wrapper.vm.$nextTick()
    expect(select.element.value).toBe('Triglavian Collective')
    expect(select.get('option[value="Triglavian Collective"]').text()).toBe('Triglavian Collective')
    expect(wrapper.get('.guide-link').text()).toBe(complex.title)
    await select.setValue('Amarr Empire')
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
    await select.setValue('')
    await wrapper.get('.search-field input').setValue('三神裔')
    expect(wrapper.findAll('tbody tr')).toHaveLength(1)
    expect(wrapper.get('.guide-link').text()).toBe(complex.title)
    wrapper.unmount()
  })

  it('uses client enemies for mission filters and displays unverified missions in both languages', async () => {
    const entries = [
      { ...mission, faction: 'Caldari', enemyFactions: ['Mercenaries'] },
      { ...mission, slug: 'unverified', faction: 'Caldari', enemyFactions: [] },
      { ...mission, slug: 'older-data', faction: 'Caldari', enemyFactions: undefined },
    ]
    const wrapper = await showGuides(undefined, 'zh', entries)
    const select = wrapper.findAll('select').find(item => item.find('option[value="Mercenaries"]').exists())
    expect(select.findAll('option').map(option => option.text())).toEqual(['全部势力', '雇佣兵'])
    expect(wrapper.findAll('.mobile-faction').map(cell => cell.text())).toEqual(['雇佣兵', '客户端未确认', '客户端未确认'])
    await wrapper.get('.search-field input').setValue('加达里合众国')
    expect(wrapper.findAll('tbody tr')).toHaveLength(0)
    await wrapper.get('.search-field input').setValue('')
    await select.setValue('Mercenaries')
    expect(wrapper.findAll('tbody tr')).toHaveLength(1)
    expect(wrapper.get('.mobile-faction').text()).toBe('雇佣兵')
    wrapper.unmount()
    const detail = await showGuides('unverified', 'en', entries)
    expect(detail.get('.facts-grid').text()).toContain('Unverified in client data')
    detail.unmount()
  })

  it('keeps the wiki ship restriction next to the Serenity result and filters explicit unknowns', async () => {
    const wrapper = await showGuides()
    const select = wrapper.findAll('select').find(item => item.find('option[value="colossus_unknown"]').exists())
    await select.setValue('colossus_unknown')
    expect(wrapper.findAll('tbody tr')).toHaveLength(1)
    const row = wrapper.get('tbody tr')
    expect(row.get('.guide-link').text()).toBe(complex.zh.title)
    expect(row.get('.list-english').text()).toBe(complex.title)
    expect(row.get('.restriction-limited').text()).toBe('战列舰')
    expect(row.get('.colossus-access').text()).toBe('巨像准入待核实')
    wrapper.unmount()
  })

  it('treats cached stage restrictions as blocked in both the list and detail', async () => {
    const oldMission = {
      ...mission, shipLimit: 'Colossus restricted in part 2 of 3',
      colossusSupport: 'partial', colossusNote: undefined, shipRestriction: { status: 'limited', note: 'bigSting' },
    }
    const oldSite = { ...complex, colossusSupport: 'partial', colossusNote: 'complexMixed' }
    const wrapper = await showGuides(undefined, 'zh', [oldMission, oldSite])
    const select = wrapper.findAll('select').find(item => item.find('option[value="colossus_deny"]').exists())
    await select.setValue('colossus_deny')
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
    expect(wrapper.get('tbody tr .restriction-badge').text()).toBe('巨像禁入')
    expect(wrapper.get('.colossus-access').text()).toBe('巨像禁入')
    wrapper.unmount()

    const detail = await showGuides(oldMission.slug, 'en', [oldMission])
    expect(detail.get('.restriction-fact strong').text()).toBe('Colossus restricted')
    expect(detail.get('.colossus-box').text()).toBe('Colossus access is blocked on Serenity.')
    detail.unmount()
  })

  it('shows client mission names in detail and localizes the site gate result', async () => {
    const missionPage = await showGuides(mission.slug)
    expect(missionPage.get('.facts-grid').text()).toContain('艾玛帝国')
    expect(missionPage.get('h2').text()).toBe(mission.missionName.zh)
    expect(missionPage.get('.english-name').text()).toBe(mission.missionName.en)
    expect(missionPage.get('.colossus-box').text()).toBe('国服巨像禁入。')
    missionPage.unmount()

    const sitePage = await showGuides(complex.slug, 'en')
    expect(sitePage.get('.restriction-fact strong').text()).toBe('Battleship')
    expect(sitePage.get('.colossus-box').text()).toContain('On Serenity, gates with ship lists allow the Colossus')
    sitePage.unmount()
  })
})
