import snapshot from './data/serenity-mission-names.json' with { type: 'json' }

export function serenityMissionName(sourceTitle, level) {
  if (level !== 5 || !Object.hasOwn(snapshot.names, sourceTitle)) return null
  const { en, zh } = snapshot.names[sourceTitle]
  return { en, zh }
}
