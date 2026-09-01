const TYPE_ORDER = ['mission', 'anomaly', 'ded', 'unrated', 'expedition']

export function guideTypeOrder(type) {
  const index = TYPE_ORDER.indexOf(type)
  return index === -1 ? TYPE_ORDER.length : index
}

export function filterGuides(guides, filters = {}) {
  const query = (filters.query || '').trim().toLocaleLowerCase()
  const level = filters.level ? Number(filters.level) : null

  return guides
    .filter(guide => !filters.type || guide.type === filters.type)
    .filter(guide => !level || guide.level === level)
    .filter(guide => !filters.faction || guide.faction === filters.faction)
    .filter(guide => {
      if (!query) return true
      return [
        guide.title,
        guide.zh?.title,
        guide.faction,
        guide.rating,
        guide.location,
        guide.shipSuggestion,
        guide.shipLimit,
      ].some(value => value?.toLocaleLowerCase().includes(query))
    })
    .sort((a, b) =>
      guideTypeOrder(a.type) - guideTypeOrder(b.type) ||
      (a.level || 0) - (b.level || 0) ||
      a.title.localeCompare(b.title))
}

export function guideFacets(guides) {
  return {
    types: [...new Set(guides.map(guide => guide.type))].sort((a, b) => guideTypeOrder(a) - guideTypeOrder(b)),
    factions: [...new Set(guides.map(guide => guide.faction).filter(Boolean))].sort(),
  }
}

export function shipRestrictionStatus(guide) {
  if (guide.shipRestriction?.status) return guide.shipRestriction.status
  if (!guide.shipLimit || /^(unknown|unverified|\?|tbd)$/i.test(guide.shipLimit)) return 'unknown'
  if (/^(unrestricted|none|no limit|not gated|ungated)$/i.test(guide.shipLimit)) return 'unrestricted'
  return 'limited'
}

export function shipRestrictionLabel(guide, locale = 'en') {
  const status = shipRestrictionStatus(guide)
  if (status === 'unknown') return locale === 'zh' ? '未注明' : 'Not specified'
  if (status === 'unrestricted') return locale === 'zh' ? '无限制' : 'Unrestricted'
  if (locale !== 'zh') return guide.shipLimit

  return guide.shipLimit
    .replace(/\bOnly allows:\s*/gi, '仅允许：')
    .replace(/\bT1\b/g, 'T1')
    .replace(/\bT2\b/g, 'T2')
    .replace(/\bT3\b/g, 'T3')
    .replace(/\bDreadnoughts?\b/gi, '无畏舰')
    .replace(/\bBattleships?\b/gi, '战列舰')
    .replace(/\bBattlecruisers?\b/gi, '战列巡洋舰')
    .replace(/\bCruisers?\b/gi, '巡洋舰')
    .replace(/\bDestroyers?\b/gi, '驱逐舰')
    .replace(/\bAssault Frigates?\b/gi, '突击护卫舰')
    .replace(/\bExpedition Frigates?\b/gi, '勘探护卫舰')
    .replace(/\bLogistics Frigates?\b/gi, '后勤护卫舰')
    .replace(/\bFrigates?\b/gi, '护卫舰')
    .replace(/\bElectronic Attack Ships?\b/gi, '电子攻击舰')
    .replace(/\bCovert Ops\b/gi, '隐形特勤舰')
    .replace(/\bInterceptors?\b/gi, '截击舰')
    .replace(/\bStealth Bombers?\b/gi, '隐形轰炸舰')
    .replace(/\bIndustrials?\b/gi, '工业舰')
    .replace(/\bHaulers?\b/gi, '运输舰')
    .replace(/\bShuttles?\b/gi, '穿梭机')
    .replace(/\bCorvettes?\b/gi, '新手护卫舰')
    .replace(/\bFaction\b/gi, '势力')
    .replace(/\bclass ships?\b/gi, '级舰船')
    .replace(/\band their Tech 2 equivalents\b/gi, '及其 T2 衍生舰船')
    .replace(/\band below\b/gi, '及以下')
    .replace(/\bor lower\b/gi, '及以下')
    .replace(/\bor smaller\b/gi, '及以下')
    .replace(/\band smaller\b/gi, '及以下')
    .replace(/\bincluding\b/gi, '包括')
    .replace(/\bOnly\b/gi, '仅')
    .replace(/\bnot allowed\b/gi, '禁止进入')
    .replace(/\ballows?\b/gi, '允许')
    .replace(/\band\b/gi, '、')
    .replace(/\s*\/\s*/g, ' / ')
    .replace(/\s*,\s*/g, '、')
    .replace(/\s+/g, ' ')
    .replace(/\s+(及以下|禁止进入)/g, '$1')
    .trim()
}
