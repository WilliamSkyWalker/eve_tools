import { serenityGateAccess } from './serenity-gate-access.mjs'
import snapshot from './data/serenity-complex-access.json' with { type: 'json' }

export function serenityComplexAccess(sourceTitle, type) {
  if (!['ded', 'unrated', 'expedition'].includes(type)) return null

  // The source title distinguishes sites with identical display names, such as
  // Outgrowth Rogue Drone Hive (5/10) and (10/10).
  const site = snapshot.sites[sourceTitle]
  return serenityGateAccess(site)
}
