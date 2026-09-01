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

  it('searches ship recommendations and builds facets', () => {
    expect(filterGuides(guides, { query: 'cruiser' })).toHaveLength(1)
    expect(filterGuides(guides, { query: '避难所' })).toHaveLength(1)
    expect(guideFacets(guides).types).toEqual(['mission', 'anomaly'])
  })

  it('normalizes and localizes ship restriction states', () => {
    expect(shipRestrictionStatus({ shipRestriction: { status: 'unrestricted' } })).toBe('unrestricted')
    expect(shipRestrictionLabel({ shipLimit: 'Battlecruiser or smaller' }, 'zh')).toBe('战列巡洋舰及以下')
    expect(shipRestrictionLabel({}, 'zh')).toBe('未注明')
  })
})
