// Serenity build 3736091: missions.killMission.dungeonID →
// dungeons.connections[].allowedShipsList → typeList. Lists 358, 445,
// 447 and 460 omit both the Colossus group (4622) and the Xolotl (84925).
const rules = [
  {
    access: 'none', typeListIDs: [445],
    titles: [
      'Codename : Redress', 'Convoy Attack (Amarr)', 'Convoy Attack (Caldari)',
      'Convoy Attack (Gallente Federation)', 'Convoy Attack (Minmatar Republic)',
      'Crush The Sebiestor Station', 'Destroy the Ammatar Base', 'Destroy the Caldari Outpost',
      'Finders And Keepers', 'Hidden Enemy Base (Amarr)', 'Hidden Enemy Base (Caldari)',
      'Hidden Enemy Base (Minmatar Republic)', 'Honor (Angel Cartel)', 'Honor (Blood Raiders)',
      'Honor (Guristas Pirates)', 'Honor (Serpentis)', 'Preaching to the Masses',
      'Propaganda War', 'Recover the Containers', 'Rogue Eradication', 'Rogue Hunt', 'Rogue Spy',
      'Smash The Gallente Stockyard', 'The Hard Way', 'The Mordus Headhunters (Level 5)',
      'What Slavery Begets',
    ],
  },
  { access: 'none', typeListIDs: [358], titles: ['Caldari Beacons'] },
  { access: 'none', typeListIDs: [447], titles: ['Forces Amassing', 'Prison Bust'] },
  { access: 'none', typeListIDs: [460, 445], titles: ['Mass Drivers (Amarr)', 'Mass Drivers (Gallente Federation)'] },
  {
    access: 'partial', typeListIDs: [445], note: 'bigSting',
    text: 'Colossus restricted in part 2 of 3',
    titles: ['The Big Sting (Amarr Empire)', 'The Big Sting (Caldari State)'],
  },
  {
    access: 'partial', typeListIDs: [445, 447], note: 'locationLocation',
    text: 'Colossus restricted in parts 1–3 of 5',
    titles: ['Location Location (Amarr)', 'Location Location (Caldari)', 'Location Location (Gallente Federation)'],
  },
  // Preserve prior annotations outside this correction. Match exact guide titles
  // so future missions, factions and chapters do not inherit an unverified label.
  { access: 'none', titles: ['Oust The Claimjumpers', 'Prison Break', 'For the Honor of Rouvenor'] },
  {
    access: 'full',
    titles: [
      'A Mote In The Eye', 'Breeding Facility', 'Cleaning House', 'Liberate the Miners (Amarr)',
      'Liberate the Miners (Caldari)', 'Operation Wyrmsbane', 'Operation Wyrmslayer',
      'Reclamation (Amarr)', 'Reclamation (Caldari)', 'Reclamation (Gallente Federation)',
      'Stray Amarr Carrier', 'Stray Caldari Carrier',
    ],
  },
  {
    access: 'supported',
    titles: [
      'A Wolf by the Ears', 'Alluring Emanations (Level 5)', 'Cleansing Fire', 'Deadly Serious',
      'Dirty Job', 'Fate of Angels', 'Informed Attack', 'Lights Out (Level 5)', 'Sansha Acquisition',
      'Sansha on the Horizon', 'The Fortress (Amarr)', 'The Fortress (Caldari)',
      'The Fortress (Gallente Federation)', 'The Fortress (Minmatar Republic)', 'Troop Build Up',
      'Wrath of Angels (Level 5)',
    ],
  },
]

const rulesByTitle = new Map(rules.flatMap(rule => rule.titles.map(title => [title, rule])))
const restrictionText = {
  none: 'Battleship & below (Colossus restricted)',
  full: 'Unrestricted (Colossus supported)',
  supported: 'Battleship & below (Colossus supported)',
}

export function serenityMissionAccess(title, level) {
  const rule = rulesByTitle.get(title)
  if (level !== 5 || !rule) return null

  const shipLimit = rule.text || restrictionText[rule.access]
  return {
    colossusSupport: rule.access,
    shipLimit,
    shipRestriction: {
      status: rule.access === 'full' ? 'unrestricted' : 'limited',
      text: shipLimit,
      source: rule.typeListIDs ? 'serenity_client' : 'serenity_rules',
      ...(rule.typeListIDs && { typeListIDs: rule.typeListIDs }),
      ...(rule.note && { note: rule.note }),
    },
  }
}
