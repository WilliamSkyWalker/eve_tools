// Unify the client faction names and aliases still used by site guides.
const factions = [
  ['Amarr Empire', '艾玛帝国', 'Amarr'],
  ['Ammatar Mandate', '艾玛达共和国', 'Ammatar'],
  ['Angel Cartel', '天使企业联合体', 'Angel', 'Angels'],
  ['Athran Brotherhood', '阿什兰兄弟会'],
  ['Blood Raiders', '血袭者', 'Blood Raider', 'Blood Raider Covenant'],
  ['Caldari State', '加达里合众国', 'Caldari'],
  ['CONCORD', '统合部', 'CONCORD Assembly'],
  ['DED', '统合部联合安全局（DED）'],
  ['EDENCOM', '伊甸联合防御阵线'],
  ['Equilibrium of Mankind', '人类平衡组织'],
  ['Gallente Federation', '盖伦特联邦', 'Gallente'],
  ['Guristas Pirates', '古斯塔斯游寇', 'Guristas'],
  ['Khanid Kingdom', '卡尼迪王国'],
  ['Mercenaries', '雇佣兵'],
  ['Minmatar Republic', '米玛塔尔共和国', 'Minmatar'],
  ["Mordu's Legion", '莫德团', "Mordu's", "Mordu's Legion Command"],
  ['Rogue Drones', '自由无人机'],
  ['Rogue Pirates', '自由游寇'],
  ["Sansha's Nation", '萨沙共和国', 'Sansha', "Sansha's"],
  ['Scions of the Superior Gene', '高等基因传人'],
  ['Serpentis', '天蛇集团'],
  ['Smugglers', '走私者'],
  ['The Freedom Fighters', '自由战士'],
  ['The Seven', '七人组'],
  ['Thukker Tribe', '图克尔部落'],
  ['Triglavian Collective', '三神裔', 'Triglavians'],
  ['Unidentified', '身份不明'],
]

const canonicalNames = new Map()
const chineseNames = new Map()
for (const [name, chinese, ...aliases] of factions) {
  chineseNames.set(name, chinese)
  for (const alias of [name, ...aliases]) canonicalNames.set(alias.toLowerCase(), name)
}

export function guideFactionMembers(guide) {
  // Mission enemies come exclusively from the client snapshot, including unverified entries.
  const names = guide.enemyFactions ?? (guide.type === 'mission' ? [] :
    (guide.faction || '').split(/\s*(?:,\s*(?:and\s+)?|&|\s\/\s)\s*/i))
  return [...new Set(names.map(name => name.trim()).filter(Boolean)
    .map(name => canonicalNames.get(name.toLowerCase()) || name))]
}

export function guideFactionLabel(name, locale) {
  return locale === 'zh' ? chineseNames.get(name) || name : name
}

export function guideEnemyLabel(guide, locale) {
  return guideFactionMembers(guide)
    .map(name => guideFactionLabel(name, locale))
    .join(locale === 'zh' ? '、' : ', ')
}
