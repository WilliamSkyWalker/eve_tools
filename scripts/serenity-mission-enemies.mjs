import enemies from './data/serenity-mission-enemies.json' with { type: 'json' }

// The values are client evidence references for each confirmed opponent.
// A known mission may have no identifiable opponent in the client's text.
export function serenityMissionEnemies(guide) {
  if (guide.type !== 'mission') return undefined
  const level = enemies.levels[guide.level]
  const title = guide.source?.title
  return level && Object.hasOwn(level, title) ? Object.keys(level[title]) : []
}
