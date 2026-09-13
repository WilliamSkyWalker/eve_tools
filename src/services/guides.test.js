import { describe, expect, it } from 'vitest'
import { filterGuides, guideFacets, shipRestrictionLabel, shipRestrictionStatus } from './guides'

const guides = [
  { title: 'Guristas Haven', type: 'anomaly', faction: 'Guristas', zh: { title: '古斯塔斯避难所' } },
  { title: 'Alluring Emanations', type: 'mission', level: 5, faction: 'Rogue Drones', shipSuggestion: 'Cruiser' },
  { title: 'The Blockade', type: 'mission', level: 4, faction: 'Guristas Pirates' },
]

describe('guide filters', () => {
  it('filters level 5 missions', () => {
    expect(filterGuides(guides, { type: 'mission', level: 5 }).map(item => item.title))
      .toEqual(['Alluring Emanations'])
  })

  it('filters by ship class', () => {
    const testGuides = [
      { title: 'M1', shipLimit: 'Battleship & below (Colossus supported)', colossusSupport: 'supported' },
      { title: 'M2', shipLimit: 'Battleship & below (Colossus restricted)', colossusSupport: 'none' },
      { title: 'M3', shipLimit: 'Battlecruiser or smaller' },
    ]
    expect(filterGuides(testGuides, { shipClass: 'colossus_allow' }).map(g => g.title)).toEqual(['M1'])
    expect(filterGuides(testGuides, { shipClass: 'colossus_deny' }).map(g => g.title)).toEqual(['M2'])
    expect(filterGuides(testGuides, { shipClass: 'battlecruiser' }).map(g => g.title)).toEqual(['M3'])
  })

  it('normalizes and localizes ship restriction states', () => {
    expect(shipRestrictionStatus({ shipRestriction: { status: 'unrestricted' } })).toBe('unrestricted')
    expect(shipRestrictionLabel({ shipLimit: 'Battlecruiser or smaller' }, 'zh')).toBe('战列巡洋舰及以下')
    expect(shipRestrictionLabel({ shipLimit: 'Battleship & below (Colossus restricted)' }, 'zh')).toBe('战列舰及以下 (巨像禁入)')
    expect(shipRestrictionLabel({ shipLimit: 'Battleship & below (Colossus supported)' }, 'zh')).toBe('战列舰及以下 (支持巨像)')
    expect(shipRestrictionLabel({}, 'zh')).toBe('未注明')
  })
})
