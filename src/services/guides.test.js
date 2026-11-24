import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { serenityMissionAccess } from '../../scripts/serenity-mission-access.mjs'
import { serenityComplexAccess } from '../../scripts/serenity-complex-access.mjs'
import { serenityMissionEnemies } from '../../scripts/serenity-mission-enemies.mjs'
import { serenityEventEnemies } from '../../scripts/serenity-event-enemies.mjs'
import { serenityMissionName } from '../../scripts/serenity-mission-names.mjs'
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
      { title: 'M2', shipLimit: 'Battleship & below (Colossus restricted)', colossusSupport: 'blocked' },
      { title: 'M3', shipLimit: 'Battlecruiser or smaller' },
    ]
    expect(filterGuides(testGuides, { shipClass: 'colossus_allow' }).map(g => g.title)).toEqual(['M1'])
    expect(filterGuides(testGuides, { shipClass: 'colossus_deny' }).map(g => g.title)).toEqual(['M2'])
    expect(filterGuides(testGuides, { shipClass: 'battlecruiser' }).map(g => g.title)).toEqual(['M3'])
  })

  it('normalizes and localizes ship restriction states', () => {
    expect(shipRestrictionStatus({ shipRestriction: { status: 'unrestricted' } })).toBe('unrestricted')
    expect(shipRestrictionLabel({ shipLimit: 'Battlecruiser or smaller' }, 'zh')).toBe('战列巡洋舰及以下')
    expect(shipRestrictionLabel({ shipLimit: 'Battleship & below (Colossus restricted)' }, 'zh')).toBe('战列舰及以下（巨像禁入）')
    expect(shipRestrictionLabel({ shipLimit: 'Battleship & below (Colossus supported)' }, 'zh')).toBe('战列舰及以下（巨像可进）')
    expect(shipRestrictionLabel({}, 'zh')).toBe('未注明')
  })
})

describe('Serenity enemy factions', () => {
  const { guides: catalog } = JSON.parse(readFileSync('public/data/guides.json', 'utf8'))

  it('publishes client enemies for every mission without falling back to a wiki faction', () => {
    for (const guide of catalog.filter(guide => guide.type === 'mission')) {
      const enemies = serenityMissionEnemies(guide)
      expect(guide.enemyFactions, guide.slug).toEqual(enemies)
      expect(guide.faction, guide.slug).toBe(enemies.join(', '))
    }
    expect(serenityMissionEnemies({ type: 'mission', level: 4, source: { title: 'Unmapped' } })).toEqual([])
    const convoy = catalog.find(guide => guide.source.title === 'Convoy Attack (Minmatar Republic)')
    expect(convoy.enemyFactions).toEqual(['Minmatar Republic'])
  })

  it('offers each simulated enemy in both Union Day challenges even though Caldari hosts them', () => {
    const challenges = catalog.filter(guide => serenityEventEnemies(guide))
    expect(challenges).toHaveLength(2)
    expect(guideFacets(challenges).factions).toEqual([
      'Gallente Federation', 'Guristas Pirates', 'Rogue Drones', 'Triglavian Collective',
    ])
    for (const guide of challenges) {
      expect(guide.enemyFactions).toEqual(serenityEventEnemies(guide))
      for (const faction of guide.enemyFactions) expect(filterGuides(challenges, { faction })).toHaveLength(2)
    }
    expect(filterGuides(challenges, { faction: 'Caldari State' })).toEqual([])
  })
})

describe('Serenity mission gate data', () => {
  const { guides: publishedGuides } = JSON.parse(readFileSync('public/data/guides.json', 'utf8'))
  const levelFive = publishedGuides.filter(guide => guide.type === 'mission' && guide.level === 5)
  const allowed = filterGuides(levelFive, { shipClass: 'colossus_allow' }).map(guide => guide.title)
  const denied = filterGuides(levelFive, { shipClass: 'colossus_deny' }).map(guide => guide.title)

  it.each([
    'Convoy Attack (Amarr)', 'Convoy Attack (Caldari)', 'Convoy Attack (Gallente Federation)',
    'Convoy Attack (Minmatar Republic)', 'Caldari Beacons', 'Forces Amassing',
    'Mass Drivers (Amarr)', 'Mass Drivers (Gallente Federation)',
  ])('excludes the Colossus from %s', title => {
    expect(serenityMissionAccess(title, 5)).toEqual({ colossusSupport: 'blocked', colossusNote: 'blocked' })
    expect(denied).toContain(title)
    expect(allowed).not.toContain(title)
  })

  it.each([
    'The Big Sting (Amarr Empire)',
    'The Big Sting (Caldari State)',
    'Location Location (Amarr)',
    'Location Location (Caldari)',
    'Location Location (Gallente Federation)',
  ])('reports the entire multi-stage guide as blocked for %s', title => {
    const access = serenityMissionAccess(title, 5)
    expect(access).toEqual({ colossusSupport: 'blocked', colossusNote: 'blocked' })
    expect(denied).toContain(title)
    expect(allowed).not.toContain(title)
  })

  it('does not infer access for similar titles or lower mission levels', () => {
    expect(serenityMissionAccess('Convoy Attack (Unknown faction)', 5)).toBeNull()
    expect(serenityMissionAccess('Convoy Attack (Minmatar Republic)', 3)).toBeNull()
    expect(allowed).toContain('A Mote In The Eye')
    for (const title of ['Alluring Emanations (Level 5)', 'Deadly Serious', 'Oust The Claimjumpers',
      'Liberate the Miners (Amarr)', 'Liberate the Miners (Caldari)', 'Prison Break']) {
      expect(serenityMissionAccess(title, 5)?.colossusSupport).toBe('unknown')
      expect(denied).not.toContain(title)
      expect(allowed).not.toContain(title)
    }
  })

  it('publishes a client name in both languages for every level five guide', () => {
    for (const guide of levelFive) {
      const name = serenityMissionName(guide.source.title, guide.level)
      expect(name?.en, guide.slug).toBeTruthy()
      expect(name?.zh, guide.slug).toBeTruthy()
      expect(guide.missionName).toEqual(name)
    }
    expect(serenityMissionName('Rogue Eradication', 5)).toEqual({
      en: 'Rogue Eradication (3 of 3)', zh: '自由根除(3/3)',
    })
    expect(serenityMissionName('Rogue Eradication', 4)).toBeNull()
  })

  it('uses the exact Wiki source page for every complex and expedition', () => {
    for (const guide of publishedGuides.filter(g => ['ded', 'unrated', 'expedition'].includes(g.type))) {
      const access = serenityComplexAccess(guide.source.title, guide.type)
      expect(guide, guide.slug).toMatchObject(access)
    }
    expect(serenityComplexAccess('Outgrowth Rogue Drone Hive (5/10)', 'ded')?.colossusSupport).toBe('supported')
    expect(serenityComplexAccess('Outgrowth Rogue Drone Hive (10/10)', 'ded')).toEqual({
      colossusSupport: 'unknown', colossusNote: 'complexAllowedUnlisted',
    })
    expect(serenityComplexAccess('Rogue Drone Infestation Sprout', 'ded')).toEqual({
      colossusSupport: 'blocked', colossusNote: 'blocked',
    })
    expect(serenityComplexAccess('Limited Mining Expedition', 'expedition')?.colossusSupport).toBe('blocked')
    expect(serenityComplexAccess('Drone Infested Mine', 'ded')?.colossusSupport).toBe('full')
    expect(serenityComplexAccess('Unmapped site', 'unrated')?.colossusSupport).toBe('unknown')
    expect(serenityComplexAccess('Limited Mining Expedition', 'mission')).toBeNull()
  })

  it('checks the matching level, variant and covered stages for lower-level gates', () => {
    for (const [title, level] of [
      ['For the Honor of Rouvenor', 1], ['Undue Attention', 1], ['Communications Cold War', 2],
      ['The Left Hook', 3], ['Smuggler Interception (Serpentis) (Level 3)', 3], ['Mordus Folly', 4],
    ]) {
      expect(serenityMissionAccess(title, level)).toEqual({ colossusSupport: 'blocked', colossusNote: 'blocked' })
    }
    expect(serenityMissionAccess('For the Honor of Rouvenor', 5)).toBeNull()
    expect(serenityMissionAccess('Closing the Gate', 1)).toBeNull()
  })

  it('publishes the matching client result independently of the Wiki ship restrictions', () => {
    for (const guide of publishedGuides.filter(g => g.type === 'mission')) {
      const access = serenityMissionAccess(guide.source.title, guide.level)
      if (access) {
        expect(guide, guide.title).toMatchObject(access)
        expect(guide.shipRestriction.source).not.toMatch(/^serenity_/)
      } else {
        expect(guide.colossusSupport, guide.title).toBeUndefined()
      }
    }
  })
})
