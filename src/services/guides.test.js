import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { serenityMissionAccess } from '../../scripts/serenity-mission-access.mjs'
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

describe('Serenity mission gate data', () => {
  const { guides: publishedGuides } = JSON.parse(readFileSync('public/data/guides.json', 'utf8'))
  const levelFive = publishedGuides.filter(guide => guide.type === 'mission' && guide.level === 5)
  const allowed = filterGuides(levelFive, { shipClass: 'colossus_allow' }).map(guide => guide.title)
  const denied = filterGuides(levelFive, { shipClass: 'colossus_deny' }).map(guide => guide.title)

  it.each([
    ['Convoy Attack (Amarr)', [445]],
    ['Convoy Attack (Caldari)', [445]],
    ['Convoy Attack (Gallente Federation)', [445]],
    ['Convoy Attack (Minmatar Republic)', [445]],
    ['Caldari Beacons', [358]],
    ['Forces Amassing', [447]],
    ['Mass Drivers (Amarr)', [460, 445]],
    ['Mass Drivers (Gallente Federation)', [460, 445]],
  ])('excludes the Colossus from %s', (title, typeListIDs) => {
    expect(serenityMissionAccess(title, 5)).toMatchObject({
      colossusSupport: 'none',
      shipRestriction: { source: 'serenity_client', typeListIDs },
    })
    expect(denied).toContain(title)
    expect(allowed).not.toContain(title)
  })

  it.each([
    ['The Big Sting (Amarr Empire)', 'bigSting'],
    ['The Big Sting (Caldari State)', 'bigSting'],
    ['Location Location (Amarr)', 'locationLocation'],
    ['Location Location (Caldari)', 'locationLocation'],
    ['Location Location (Gallente Federation)', 'locationLocation'],
  ])('keeps the stage-dependent restrictions for %s', (title, note) => {
    expect(serenityMissionAccess(title, 5)).toMatchObject({
      colossusSupport: 'partial',
      shipRestriction: { note },
    })
    expect(denied).toContain(title)
    expect(allowed).not.toContain(title)
  })

  it('does not infer access for similar titles or lower mission levels', () => {
    expect(serenityMissionAccess('Convoy Attack (Unknown faction)', 5)).toBeNull()
    expect(serenityMissionAccess('Convoy Attack (Minmatar Republic)', 3)).toBeNull()
    expect(allowed).toContain('A Mote In The Eye')
    expect(denied).toContain('Prison Break')
  })

  it('publishes the same restrictions as the guide importer', () => {
    for (const guide of levelFive) {
      const access = serenityMissionAccess(guide.title, guide.level)
      if (access) {
        expect(guide, guide.title).toMatchObject(access)
      } else {
        expect(guide.colossusSupport, guide.title).toBeUndefined()
      }
    }
  })
})
