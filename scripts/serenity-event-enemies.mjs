// Serenity build 3736091. Dungeons 9686 and 9731 have Caldari factionID 500001.
// The combatants are training drones: client types 72347, 72353, 72361 and
// 72366 identify the four simulated enemies in description messages 629157,
// 629169, 629186 and 629196. Both difficulties have wave spawners for all four
// (normal types 72099–72101 and 72687–72695, elite types 72696–72707).
const challenges = new Set(['Union Day Combat Challenge', 'Union Day Elite Combat Challenge'])
const simulatedFactions = ['Rogue Drones', 'Guristas Pirates', 'Gallente Federation', 'Triglavian Collective']

export function serenityEventEnemies(guide) {
  if (guide.type === 'anomaly' && challenges.has(guide.source?.title)) return [...simulatedFactions]
}
