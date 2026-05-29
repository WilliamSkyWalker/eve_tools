// Apply Sisi-test-server "Cradle of War" T2 Command Carrier preview data to the
// generated industry JSON files.
//
// This patches data that does NOT yet exist on Tranquility (June 9, 2026 launch).
// Source for IDs/materials/time: Hoboleaks Sisi diff page captured on 2026-05-29.
// After Cradle of War goes live on TQ and Fuzzwork picks up the new SDE, just
// run `node scripts/convert-sde.mjs --download --fetch-zh-names --fetch-serenity-extras`
// — the regenerated files will overwrite this patch with the authoritative data.
//
// Caveats:
// - CCP has not published Chinese (zh-CN) translations yet, so `nz` is left
//   unset on every new entry; the UI falls back to the English name. NetEase
//   will issue Serenity translations after Cradle of War goes live.
// - Group ID 4900 ("Command Carrier") is invented locally to keep the new
//   hulls visually distinct from T1 carriers. CCP may use a different group.
// - Volumes are educated guesses based on T1 carrier volumes.
// - The "Advanced Capital Ship Construction" skill (typeID 77725) and the
//   "Command Carriers" skill (typeID 93983) are skill requirements; we only
//   record the materials and time fields the calculator actually consumes.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(__dirname, '..', 'public', 'data')

const COMMAND_CARRIER_GROUP_ID = 4900
const CARRIER_BLUEPRINT_GROUP_ID = 643 // existing
const BUILD_TIME = 55 * 86400 + 13 * 3600 + 20 * 60 // 55d 13h 20m = 4,800,000 s
const MAX_RUNS = 1

const ships = [
  {
    typeID: 92822,
    name: 'Salvation',
    volume: 13950000,
    bpTypeID: 94072,
    bpName: 'Salvation Blueprint',
    materials: [
      [23757, 1],     // Archon
      [11478, 100],   // R.A.M.- Starship Tech
      [29067, 400],   // Capital Linear Shield Emitter
      [29109, 400],   // Capital Tungsten Carbide Armor Plate
      [29053, 800],   // Capital Fusion Thruster
      [29073, 800],   // Capital Nanoelectrical Microprocessor
      [29095, 800],   // Capital Radar Sensor Cluster
      [29103, 800],   // Capital Tesseract Capacitor Unit
      [29039, 1200],  // Capital Antimatter Reactor Unit
      [3828, 2000],   // Construction Blocks
      [11399, 4000],  // Morphite
    ],
  },
  {
    typeID: 92823,
    name: 'Simurgh',
    volume: 14620000,
    bpTypeID: 94073,
    bpName: 'Simurgh Blueprint',
    materials: [
      [23915, 1],     // Chimera
      [11478, 100],   // R.A.M.- Starship Tech
      [29101, 400],   // Capital Sustained Shield Emitter
      [29107, 400],   // Capital Titanium Diborite Armor Plate
      [29055, 800],   // Capital Gravimetric Sensor Cluster
      [29071, 800],   // Capital Magpulse Thruster
      [29093, 800],   // Capital Quantum Microprocessor
      [29097, 800],   // Capital Scalar Capacitor Unit
      [29059, 1200],  // Capital Graviton Reactor Unit
      [3828, 2000],   // Construction Blocks
      [11399, 4000],  // Morphite
    ],
  },
  {
    typeID: 92824,
    name: 'Gaia',
    volume: 13670000,
    bpTypeID: 94074,
    bpName: 'Gaia Blueprint',
    materials: [
      [23911, 1],     // Thanatos
      [11478, 100],   // R.A.M.- Starship Tech
      [29041, 400],   // Capital Crystalline Carbonide Armor Plate
      [29091, 400],   // Capital Pulse Shield Emitter
      [29061, 800],   // Capital Ion Thruster
      [29069, 800],   // Capital Magnetometric Sensor Cluster
      [29081, 800],   // Capital Oscillator Capacitor Unit
      [29085, 800],   // Capital Photon Microprocessor
      [29051, 1200],  // Capital Fusion Reactor Unit
      [3828, 2000],   // Construction Blocks
      [11399, 4000],  // Morphite
    ],
  },
  {
    typeID: 92825,
    name: 'Ymir',
    volume: 13760000,
    bpTypeID: 94075,
    bpName: 'Ymir Blueprint',
    materials: [
      [24483, 1],     // Nidhoggur
      [11478, 100],   // R.A.M.- Starship Tech
      [29043, 400],   // Capital Deflection Shield Emitter
      [29049, 400],   // Capital Fernite Carbide Composite Armor Plate
      [29045, 800],   // Capital Electrolytic Capacitor Unit
      [29065, 800],   // Capital Ladar Sensor Cluster
      [29075, 800],   // Capital Nanomechanical Microprocessor
      [29089, 800],   // Capital Plasma Thruster
      [29079, 1200],  // Capital Nuclear Reactor Unit
      [3828, 2000],   // Construction Blocks
      [11399, 4000],  // Morphite
    ],
  },
]

function patch(file, isSerenity) {
  const full = path.join(dataDir, file)
  if (!fs.existsSync(full)) {
    console.warn(`skip: ${file} not found`)
    return
  }
  const d = JSON.parse(fs.readFileSync(full, 'utf8'))

  // Add group
  if (!d.groups[COMMAND_CARRIER_GROUP_ID]) {
    d.groups[COMMAND_CARRIER_GROUP_ID] = { n: 'Command Carrier' }
  }

  let added = 0
  for (const s of ships) {
    // Ship type entry — leave `nz` unset; locName() falls back to `n` in zh mode.
    d.types[s.typeID] = {
      n: s.name,
      g: COMMAND_CARRIER_GROUP_ID,
      v: s.volume,
      ps: 1,
    }

    // Blueprint type entry — same fallback for Chinese.
    d.types[s.bpTypeID] = {
      n: s.bpName,
      g: CARRIER_BLUEPRINT_GROUP_ID,
      v: 0.01,
    }

    // Blueprint metadata
    d.blueprints[s.bpTypeID] = { ml: MAX_RUNS }

    // Materials for activity 1 (manufacturing)
    d.materials[s.bpTypeID] = { '1': s.materials }

    // products[1][shipTypeID] = [bpTypeID, qty]
    d.products['1'][s.typeID] = [s.bpTypeID, 1]

    // productsByBp[bpTypeID][1] = [[shipTypeID, qty]]
    d.productsByBp[s.bpTypeID] = { '1': [[s.typeID, 1]] }

    // Activity times
    d.activities[s.bpTypeID] = { '1': BUILD_TIME }

    added++
  }

  fs.writeFileSync(full, JSON.stringify(d))
  const tag = isSerenity ? 'Serenity' : 'Tranquility'
  console.log(`patched ${file}: +${added} Command Carrier types/blueprints`)
}

patch('industry-tranquility.json', false)
patch('industry-serenity.json', true)

console.log('\nDone. Run `npm run dev` and search for "救世级 / 西穆鸟级 / 盖亚级 / 尤弥尔级" or')
console.log('"Salvation / Simurgh / Gaia / Ymir" in the blueprint queue to preview the BOM.')
