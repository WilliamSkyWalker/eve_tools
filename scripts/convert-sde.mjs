#!/usr/bin/env node
/**
 * Convert SDE CSV files (Fuzzwork dump) into optimized JSON for the frontend.
 *
 * Usage:
 *   node scripts/convert-sde.mjs                    # convert existing CSVs
 *   node scripts/convert-sde.mjs --download          # download fresh CSVs first
 *   node scripts/convert-sde.mjs --fetch-zh-names    # also fetch Chinese map names from Serenity ESI
 *
 * Produces:
 *   frontend/public/data/industry.json   — types, groups, blueprints, materials, products
 *   frontend/public/data/navigation.json — systems, regions, jumps
 *   frontend/public/data/wormhole.json   — wormhole systems, types
 */

import fs from 'node:fs'
import path from 'node:path'
import { createReadStream } from 'node:fs'
import { createInterface } from 'node:readline'
import { execSync } from 'node:child_process'

const ROOT = path.resolve(import.meta.dirname, '..')
const SDE_DIR = path.join(ROOT, 'sde_data')
const OUT_DIR = path.join(ROOT, 'public', 'data')

const FUZZWORK_BASE = 'https://www.fuzzwork.co.uk/dump/latest/'
const SERENITY_ESI = 'https://ali-esi.evepc.163.com/latest'

const args = process.argv.slice(2)
const DOWNLOAD = args.includes('--download')
const FETCH_ZH = args.includes('--fetch-zh-names')

// ──────────────────────────────────────────
// CSV helpers
// ──────────────────────────────────────────

async function downloadBz2(tableName) {
  const url = `${FUZZWORK_BASE}${tableName}.csv.bz2`
  const csvPath = path.join(SDE_DIR, `${tableName}.csv`)
  console.log(`  Downloading ${url} ...`)
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${url}`)
  const bz2Buf = Buffer.from(await resp.arrayBuffer())
  const bz2Path = csvPath + '.bz2'
  fs.writeFileSync(bz2Path, bz2Buf)
  execSync(`bunzip2 -f "${bz2Path}"`)
  console.log(`  -> ${csvPath}`)
}

async function readCsv(tableName, handler) {
  const csvPath = path.join(SDE_DIR, `${tableName}.csv`)
  if (!fs.existsSync(csvPath)) {
    console.warn(`  WARNING: ${csvPath} not found, skipping`)
    return
  }
  const rl = createInterface({ input: createReadStream(csvPath, 'utf-8'), crlfDelay: Infinity })
  let headers = null
  let count = 0
  let pendingLine = ''
  for await (const line of rl) {
    // Handle multi-line quoted fields: if we have an odd number of quotes, line is incomplete
    pendingLine += (pendingLine ? '\n' : '') + line
    const quoteCount = (pendingLine.match(/"/g) || []).length
    if (quoteCount % 2 !== 0) continue  // incomplete quoted field, wait for next line

    if (!headers) {
      headers = parseCsvLine(pendingLine)
      pendingLine = ''
      continue
    }
    const values = parseCsvLine(pendingLine)
    pendingLine = ''
    const row = {}
    for (let i = 0; i < headers.length; i++) {
      row[headers[i]] = values[i] ?? ''
    }
    handler(row)
    count++
  }
  console.log(`  ${tableName}: ${count} rows`)
}

function parseCsvLine(line) {
  // Simple CSV parser that handles quoted fields
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += c
      }
    } else {
      if (c === '"') {
        inQuotes = true
      } else if (c === ',') {
        result.push(current)
        current = ''
      } else {
        current += c
      }
    }
  }
  result.push(current)
  return result
}

function toInt(s) { const n = parseInt(s, 10); return isNaN(n) ? null : n }
function toFloat(s) { const n = parseFloat(s); return isNaN(n) ? null : n }

// ──────────────────────────────────────────
// Main
// ──────────────────────────────────────────

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.mkdirSync(SDE_DIR, { recursive: true })

  // Download if requested
  if (DOWNLOAD) {
    console.log('Downloading SDE CSV files...')
    const tables = [
      'invCategories', 'invGroups', 'invTypes',
      'industryBlueprints', 'industryActivity',
      'industryActivityMaterials', 'industryActivityProducts',
      'mapRegions', 'mapSolarSystems', 'mapSolarSystemJumps',
      'trnTranslations', 'dgmTypeAttributes', 'invTypeMaterials',
    ]
    for (const t of tables) {
      await downloadBz2(t)
    }
  }

  // ── Step 1: Read Chinese translations ──
  console.log('Reading Chinese translations...')
  const zhTypeNames = {}  // typeID -> zh name
  await readCsv('trnTranslations', (row) => {
    if (row.tcID === '8' && row.languageID === 'zh') {
      const keyId = toInt(row.keyID)
      const text = row.text?.trim()
      if (keyId && text) zhTypeNames[keyId] = text
    }
  })
  console.log(`  Found ${Object.keys(zhTypeNames).length} Chinese type names`)

  // ── Step 2: Read invGroups ──
  console.log('Reading invGroups...')
  const groups = {}  // groupID -> { n: groupName, c: categoryID }
  await readCsv('invGroups', (row) => {
    const gid = toInt(row.groupID)
    if (gid != null) {
      groups[gid] = { n: row.groupName || '', c: toInt(row.categoryID) }
    }
  })

  // ── Step 3: Read invTypes ──
  console.log('Reading invTypes...')
  const allTypes = {}  // typeID -> { n, nz, g, pub, mg }
  await readCsv('invTypes', (row) => {
    const tid = toInt(row.typeID)
    if (tid == null) return
    allTypes[tid] = {
      n: row.typeName || '',
      nz: zhTypeNames[tid] || '',
      g: toInt(row.groupID),
      pub: row.published === '1',
      v: toFloat(row.volume),
      ps: toInt(row.portionSize) || 1,
    }
  })

  // ── Step 4: Read industry data ──
  console.log('Reading industry data...')

  const blueprints = {}  // bpTypeID -> { ml }
  await readCsv('industryBlueprints', (row) => {
    const tid = toInt(row.typeID)
    if (tid != null) blueprints[tid] = { ml: toInt(row.maxProductionLimit) }
  })

  const activities = {}  // bpTypeID -> { activityID: time }
  await readCsv('industryActivity', (row) => {
    const tid = toInt(row.typeID)
    const aid = toInt(row.activityID)
    const time = toInt(row.time)
    if (tid != null && aid != null) {
      if (!activities[tid]) activities[tid] = {}
      activities[tid][aid] = time
    }
  })

  // materials[bpTypeID][activityID] = [[matTypeID, qty], ...]
  const materials = {}
  await readCsv('industryActivityMaterials', (row) => {
    const tid = toInt(row.typeID)
    const aid = toInt(row.activityID)
    const matTid = toInt(row.materialTypeID)
    const qty = toInt(row.quantity)
    if (tid != null && aid != null && matTid != null && qty != null) {
      if (!materials[tid]) materials[tid] = {}
      if (!materials[tid][aid]) materials[tid][aid] = []
      materials[tid][aid].push([matTid, qty])
    }
  })

  // products: activityID -> { productTypeID: [bpTypeID, qty] }
  // Also build productsByBp: bpTypeID -> { activityID: { productTypeID, qty } }
  const products = {}      // activity_id -> { product_type_id: [bp_type_id, qty] }
  const productsByBp = {}  // bp_type_id -> { activity_id: [product_type_id, qty] }
  await readCsv('industryActivityProducts', (row) => {
    const bpTid = toInt(row.typeID)
    const aid = toInt(row.activityID)
    const prodTid = toInt(row.productTypeID)
    const qty = toInt(row.quantity)
    if (bpTid != null && aid != null && prodTid != null) {
      if (!products[aid]) products[aid] = {}
      products[aid][prodTid] = [bpTid, qty || 1]
      if (!productsByBp[bpTid]) productsByBp[bpTid] = {}
      productsByBp[bpTid][aid] = [prodTid, qty || 1]
    }
  })

  // ── Step 4b: Read reprocessing data ──
  console.log('Reading reprocessing data...')
  const reprocess = {}  // typeID -> [[materialTypeID, qty], ...]
  await readCsv('invTypeMaterials', (row) => {
    const tid = toInt(row.typeID)
    const matTid = toInt(row.materialTypeID)
    const qty = toInt(row.quantity)
    if (tid != null && matTid != null && qty != null && qty > 0) {
      if (!reprocess[tid]) reprocess[tid] = []
      reprocess[tid].push([matTid, qty])
    }
  })

  // ── Step 5: Filter types to only those referenced in industry ──
  console.log('Filtering types for industry...')
  const industryTypeIds = new Set()
  // All material type_ids and product type_ids
  for (const bpTid of Object.keys(materials)) {
    industryTypeIds.add(parseInt(bpTid))
    for (const aid of Object.keys(materials[bpTid])) {
      for (const [matTid] of materials[bpTid][aid]) {
        industryTypeIds.add(matTid)
      }
    }
  }
  for (const aid of Object.keys(products)) {
    for (const prodTid of Object.keys(products[aid])) {
      industryTypeIds.add(parseInt(prodTid))
      industryTypeIds.add(products[aid][prodTid][0]) // bp type id
    }
  }
  for (const bpTid of Object.keys(blueprints)) {
    industryTypeIds.add(parseInt(bpTid))
  }
  // Add reprocessing types
  for (const tid of Object.keys(reprocess)) {
    industryTypeIds.add(parseInt(tid))
    for (const [matTid] of reprocess[tid]) {
      industryTypeIds.add(matTid)
    }
  }

  const filteredTypes = {}
  const filteredGroups = {}
  for (const tid of industryTypeIds) {
    const t = allTypes[tid]
    if (t) {
      const entry = { n: t.n, nz: t.nz, g: t.g }
      if (t.ps && t.ps !== 1) entry.ps = t.ps
      filteredTypes[tid] = entry
      if (t.g && groups[t.g] && !filteredGroups[t.g]) {
        filteredGroups[t.g] = { n: groups[t.g].n }
      }
    }
  }
  console.log(`  Industry types: ${Object.keys(filteredTypes).length}, groups: ${Object.keys(filteredGroups).length}`)

  // ── Step 5b: Fetch Chinese type names from Serenity ESI ──
  if (FETCH_ZH) {
    console.log('Fetching Chinese type names from Serenity ESI...')
    const typeIds = Object.keys(filteredTypes).map(Number)
    const zhTypeNamesESI = await fetchUniverseNames(typeIds)
    let updated = 0
    for (const [id, name] of Object.entries(zhTypeNamesESI)) {
      if (filteredTypes[id] && name && name !== filteredTypes[id].n) {
        filteredTypes[id].nz = name
        updated++
      }
    }
    console.log(`  Updated ${updated} Chinese type names from ESI`)
  }

  // ── Step 6: Build industry.json ──
  const industryJson = {
    types: filteredTypes,
    groups: filteredGroups,
    blueprints,
    activities,
    materials,
    reprocess,
    products,
    productsByBp,
  }
  const industryPath = path.join(OUT_DIR, 'industry.json')
  fs.writeFileSync(industryPath, JSON.stringify(industryJson))
  console.log(`  -> ${industryPath} (${(fs.statSync(industryPath).size / 1024).toFixed(0)} KB)`)

  // ── Step 7: Read navigation data ──
  console.log('Reading navigation data...')

  const regions = {}
  await readCsv('mapRegions', (row) => {
    const rid = toInt(row.regionID)
    if (rid != null) {
      regions[rid] = { n: row.regionName || '', nz: '' }
    }
  })

  // Meters per light-year
  const METERS_PER_LY = 9.461e15

  const systems = {}
  await readCsv('mapSolarSystems', (row) => {
    const sid = toInt(row.solarSystemID)
    if (sid == null) return
    const x = toFloat(row.x) || 0
    const y = toFloat(row.y) || 0
    const z = toFloat(row.z) || 0
    systems[sid] = {
      n: row.solarSystemName || '',
      nz: '',
      r: toInt(row.regionID),
      s: toFloat(row.security) || 0,
      x: x / METERS_PER_LY,
      y: y / METERS_PER_LY,
      z: z / METERS_PER_LY,
    }
  })

  const jumps = []
  await readCsv('mapSolarSystemJumps', (row) => {
    const from = toInt(row.fromSolarSystemID)
    const to = toInt(row.toSolarSystemID)
    if (from != null && to != null) {
      jumps.push([from, to])
    }
  })

  // ── Step 8: Fetch Chinese map names from Serenity ESI ──
  if (FETCH_ZH) {
    console.log('Fetching Chinese map names from Serenity ESI...')
    const allMapIds = [
      ...Object.keys(regions).map(Number),
      ...Object.keys(systems).map(Number),
    ]
    const zhNames = await fetchUniverseNames(allMapIds)
    for (const [id, name] of Object.entries(zhNames)) {
      const numId = Number(id)
      if (regions[numId]) {
        // Only set zh if different from English
        if (name !== regions[numId].n) regions[numId].nz = name
      }
      if (systems[numId]) {
        if (name !== systems[numId].n) systems[numId].nz = name
      }
    }
    console.log(`  Got ${Object.keys(zhNames).length} Chinese names from ESI`)
  } else {
    // Try to read cached zh names from existing navigation.json
    const existingNavPath = path.join(OUT_DIR, 'navigation.json')
    if (fs.existsSync(existingNavPath)) {
      console.log('  Reusing cached Chinese names from existing navigation.json...')
      const existing = JSON.parse(fs.readFileSync(existingNavPath, 'utf-8'))
      for (const [sid, sys] of Object.entries(existing.systems || {})) {
        if (systems[sid] && sys.nz) systems[sid].nz = sys.nz
      }
      for (const [rid, reg] of Object.entries(existing.regions || {})) {
        if (regions[rid] && reg.nz) regions[rid].nz = reg.nz
      }
    }
  }

  const navJson = { systems, regions, jumps }
  const navPath = path.join(OUT_DIR, 'navigation.json')
  fs.writeFileSync(navPath, JSON.stringify(navJson))
  console.log(`  -> ${navPath} (${(fs.statSync(navPath).size / 1024).toFixed(0)} KB)`)

  // ── Step 9: Build wormhole.json ──
  console.log('Building wormhole data...')

  // Read wormhole region classes
  const regionClassPath = path.join(SDE_DIR, 'wormhole_region_classes.json')
  const regionClasses = JSON.parse(fs.readFileSync(regionClassPath, 'utf-8'))

  // Read community wormhole data
  const whCommPath = path.join(SDE_DIR, 'wormhole_systems.json')
  const whCommunity = JSON.parse(fs.readFileSync(whCommPath, 'utf-8'))

  // Build wormhole systems
  const whSystems = {}
  for (const [sid, sys] of Object.entries(systems)) {
    const regionId = sys.r
    if (regionId >= 11000001 && regionId <= 11000033) {
      const whClass = regionClasses[String(regionId)] || 0
      const cd = whCommunity[sys.n] || {}
      whSystems[sid] = {
        c: whClass,
        e: cd.effect || '',
        s: cd.statics || [],
      }
    }
  }

  // Read wormhole type attributes from dgmTypeAttributes
  // First get all type_ids with groupID=988 from invTypes
  const whTypeIds = new Set()
  for (const [tid, t] of Object.entries(allTypes)) {
    if (t.g === 988) whTypeIds.add(parseInt(tid))
  }

  const ATTR_MAP = {
    '1381': 'tc',  // target_class
    '1382': 'st',  // max_stable_time (minutes)
    '1383': 'sm',  // max_stable_mass
    '1384': 'mr',  // mass_regen
    '1385': 'jm',  // max_jump_mass
  }

  const whTypeAttrs = {}  // type_id -> { tc, st, sm, mr, jm }
  await readCsv('dgmTypeAttributes', (row) => {
    const tid = toInt(row.typeID)
    const attrId = row.attributeID?.trim()
    if (!tid || !attrId || !whTypeIds.has(tid) || !(attrId in ATTR_MAP)) return
    const val = Math.round(toFloat(row.valueFloat || row.valueInt || '0') || 0)
    if (!whTypeAttrs[tid]) whTypeAttrs[tid] = {}
    whTypeAttrs[tid][ATTR_MAP[attrId]] = val
  })

  // Build wormhole types with designation extracted from type name
  const whTypes = {}
  for (const [tid, attrs] of Object.entries(whTypeAttrs)) {
    const typeName = allTypes[tid]?.n || ''
    const designation = typeName.includes(' ') ? typeName.split(' ', 2)[1] : typeName
    whTypes[designation] = {
      id: parseInt(tid),
      tc: attrs.tc || 0,
      st: attrs.st || 0,
      sm: attrs.sm || 0,
      jm: attrs.jm || 0,
      mr: attrs.mr || 0,
    }
  }

  const whJson = { systems: whSystems, types: whTypes }
  const whPath = path.join(OUT_DIR, 'wormhole.json')
  fs.writeFileSync(whPath, JSON.stringify(whJson))
  console.log(`  -> ${whPath} (${(fs.statSync(whPath).size / 1024).toFixed(0)} KB)`)

  console.log('\nDone!')
}

async function fetchUniverseNames(ids) {
  const BATCH = 1000
  const result = {}
  for (let i = 0; i < ids.length; i += BATCH) {
    const chunk = ids.slice(i, i + BATCH)
    try {
      const resp = await fetch(`${SERENITY_ESI}/universe/names/?datasource=serenity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chunk),
      })
      if (!resp.ok) {
        console.warn(`  ESI /universe/names/ returned ${resp.status} for batch starting ${chunk[0]}`)
        continue
      }
      const data = await resp.json()
      for (const item of data) {
        result[item.id] = item.name
      }
    } catch (e) {
      console.warn(`  ESI /universe/names/ failed for batch starting ${chunk[0]}: ${e.message}`)
    }
    // Small delay to avoid rate limiting
    if (i + BATCH < ids.length) await new Promise(r => setTimeout(r, 100))
  }
  return result
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
