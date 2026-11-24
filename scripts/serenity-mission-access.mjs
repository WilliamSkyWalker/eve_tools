import snapshot from './data/serenity-mission-access.json' with { type: 'json' }
import { serenityGateAccess } from './serenity-gate-access.mjs'

export function serenityMissionAccess(sourceTitle, level) {
  const paths = snapshot.guides[`${level}|${sourceTitle}`]
  if (!paths) return null

  // A blocked stage blocks its path. When multiple variants share one guide
  // title, report it as blocked only if each variant has a blocked stage.
  const states = paths.map(path => serenityGateAccess(path).colossusSupport)
  if (states.length && states.every(status => status === 'blocked')) {
    return { colossusSupport: 'blocked', colossusNote: 'blocked' }
  }
  if (level !== 5) return null
  if (states.length && states.every(status => status === 'full' || status === 'supported')) {
    const status = states.every(value => value === 'full') ? 'full' : 'supported'
    return { colossusSupport: status, colossusNote: status }
  }
  return { colossusSupport: 'unknown', colossusNote: 'complexUnknown' }
}
