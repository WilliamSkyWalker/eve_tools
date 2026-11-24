export function serenityGateAccess(site) {
  let colossusSupport = 'unknown'
  let colossusNote = 'complexUnknown'
  if (site?.blockedLists?.length || site?.mixedLists?.length) {
    colossusSupport = 'blocked'
    colossusNote = 'blocked'
  } else if (site && !site.conditional && !site.unknownLists?.length) {
    if (site.unlisted) {
      // A connection without a ship list supplies no positive hull evidence.
      colossusNote = site.allowedLists?.length ? 'complexAllowedUnlisted' : 'complexUnlisted'
    } else if (site.allowedLists?.length) {
      colossusSupport = 'supported'
      colossusNote = 'complexAllowed'
    } else if (site.direct) {
      colossusSupport = 'full'
      colossusNote = 'complexDirect'
    }
  }
  return { colossusSupport, colossusNote }
}
