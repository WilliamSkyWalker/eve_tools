import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const API = 'https://wiki.eveuniversity.org/api.php'
const SOURCE_BASE = 'https://wiki.eveuniversity.org/'
const OUTPUT = resolve(dirname(fileURLToPath(import.meta.url)), '../public/data/guides.json')
const USER_AGENT = 'eve-kit-guide-importer/1.0 (https://github.com/WilliamSkyWalker/eve_tools)'
const CATEGORY_TYPES = new Map([
  ['Combat Anomalies', 'anomaly'],
  ['DED Complexes', 'ded'],
  ['Unrated Complexes', 'unrated'],
  ['Expeditions', 'expedition'],
])

async function api(params) {
  const body = new URLSearchParams({
    format: 'json',
    formatversion: '2',
    ...params,
  })
  const response = await fetch(API, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'user-agent': USER_AGENT,
    },
    body,
  })
  if (!response.ok) throw new Error(`UniWiki API failed: ${response.status} ${response.statusText}`)
  return response.json()
}

async function categoryMembers(category) {
  const titles = []
  let cmcontinue
  do {
    const data = await api({
      action: 'query',
      list: 'categorymembers',
      cmtitle: `Category:${category}`,
      cmnamespace: '0',
      cmlimit: '500',
      ...(cmcontinue ? { cmcontinue } : {}),
    })
    titles.push(...data.query.categorymembers.map(page => page.title))
    cmcontinue = data.continue?.cmcontinue
  } while (cmcontinue)
  return titles
}

function missionEntries(wikitext) {
  const entries = []
  const tabPattern = /<tab name="Level ([1-5]) Missions">([\s\S]*?)<\/tab>/g
  for (const tab of wikitext.matchAll(tabPattern)) {
    const level = Number(tab[1])
    const rowPattern = /\|-\s*\n\|\[\[([^\]|]+)(?:\|[^\]]+)?\]\]\s*\n\|([^\n]*)/g
    for (const row of tab[2].matchAll(rowPattern)) {
      entries.push({
        title: row[1].trim(),
        type: 'mission',
        level,
        indexFaction: cleanText(row[2]),
      })
    }
  }
  return entries
}

function splitTemplateArgs(value) {
  const args = []
  let current = ''
  let depth = 0
  for (let i = 0; i < value.length; i += 1) {
    const pair = value.slice(i, i + 2)
    if (pair === '{{' || pair === '[[') {
      depth += 1
      current += pair
      i += 1
    } else if (pair === '}}' || pair === ']]') {
      depth = Math.max(0, depth - 1)
      current += pair
      i += 1
    } else if (value[i] === '|' && depth === 0) {
      args.push(current.trim())
      current = ''
    } else {
      current += value[i]
    }
  }
  args.push(current.trim())
  return args
}

function template(wikitext, name) {
  const range = templateRange(wikitext, name)
  return range ? wikitext.slice(range.start + 2, range.end - 2) : null
}

function templateRange(wikitext, name) {
  const start = wikitext.search(new RegExp(`\\{\\{(?:Template:)?${name}\\b`, 'i'))
  if (start === -1) return null
  let depth = 0
  for (let i = start; i < wikitext.length - 1; i += 1) {
    const pair = wikitext.slice(i, i + 2)
    if (pair === '{{') {
      depth += 1
      i += 1
    } else if (pair === '}}') {
      depth -= 1
      if (depth === 0) return { start, end: i + 2 }
      i += 1
    }
  }
  return null
}

function removeTemplate(wikitext, name) {
  let result = wikitext
  let range
  while ((range = templateRange(result, name))) {
    result = `${result.slice(0, range.start)}${result.slice(range.end)}`
  }
  return result
}

function templateFields(wikitext, name) {
  const value = template(wikitext, name)
  if (!value) return {}
  const fields = {}
  for (const arg of splitTemplateArgs(value).slice(1)) {
    const separator = arg.indexOf('=')
    if (separator === -1) continue
    fields[arg.slice(0, separator).trim().toLowerCase()] = cleanText(arg.slice(separator + 1))
  }
  return fields
}

function cleanText(value = '') {
  let text = value
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/\{\{Damagetype\|([^}]+)\}\}/gi, (_, types) =>
      types.split('|').map(type => ({
        em: 'EM',
        th: 'Thermal',
        kin: 'Kinetic',
        exp: 'Explosive',
      })[type.trim().toLowerCase()] || type.trim()).join(' / '))
    .replace(/\{\{icon\|([^}|]+)[^}]*\}\}/gi, '$1')
    .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\[(https?:\/\/\S+)\s+([^\]]+)\]/g, '$2')
    .replace(/\[(https?:\/\/[^\]]+)\]/g, '')
  let previous
  do {
    previous = text
    text = text.replace(/\{\{[^{}]*\}\}/g, ' ')
  } while (text !== previous)
  return text
    .replace(/[{}]/g, ' ')
    .replace(/'{2,}/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function plainSections(wikitext) {
  let withoutTables = wikitext
    .replace(/\{\{NPCTableHead[\s\S]*?\n\|\}/g, '')
    .replace(/\{\{Expected NPC[\s\S]*?\}\}/g, '')
    .replace(/\{\|[\s\S]*?\|\}/g, '')
  withoutTables = removeTemplate(removeTemplate(withoutTables, 'CMBSiteInfo'), 'Missiondetails')
  const sections = []
  let heading = 'Overview'
  let body = []
  const flush = () => {
    const text = cleanText(body.join('\n'))
    if (text.length >= 40 && !/^Category:/i.test(text)) {
      sections.push({ heading, text: text.slice(0, 1600) })
    }
    body = []
  }
  for (const line of withoutTables.split('\n')) {
    const match = line.match(/^={2,4}\s*(.*?)\s*={2,4}$/)
    if (match) {
      flush()
      heading = cleanText(match[1])
    } else {
      body.push(line)
    }
  }
  flush()
  return sections.slice(0, 12)
}

function npcGroups(wikitext) {
  const groups = []
  const pattern = /\{\{NPCTableHead\|([^}]+)\}\}([\s\S]*?)(?=\n\|\})/g
  for (const match of wikitext.matchAll(pattern)) {
    const rows = []
    for (const rowMatch of match[2].matchAll(/\{\{NPCTableRow\|([\s\S]*?)\}\}/g)) {
      const args = splitTemplateArgs(rowMatch[1])
      const named = {}
      for (const arg of args.slice(3)) {
        const separator = arg.indexOf('=')
        if (separator !== -1) named[arg.slice(0, separator).trim().toLowerCase()] = cleanText(arg.slice(separator + 1))
      }
      rows.push({
        class: cleanText(args[0]),
        quantity: cleanText(args[1]),
        name: cleanText(args[2]),
        trigger: named.trigger || '',
        ewar: [named.ewar, named.ewar2, named.point === 'yes' ? 'Warp disrupt' : ''].filter(Boolean).join(', '),
        note: named.note || '',
      })
    }
    if (rows.length) groups.push({ name: cleanText(match[1]), rows })
  }
  return groups.slice(0, 30)
}

function slugify(title, type, level) {
  const suffix = level && !new RegExp(`level[ _-]*${level}`, 'i').test(title) ? `-level-${level}` : ''
  return `${type}-${title}${suffix}`
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function extractShipRestriction(wikitext, templateLimit) {
  const raw = cleanText(templateLimit)
  if (raw && !/^(unknown|unverified|\?|tbd)$/i.test(raw)) {
    if (/^(unrestricted|none|no limit|not gated|ungated)$/i.test(raw)) {
      return { status: 'unrestricted', text: 'Unrestricted', source: 'template' }
    }
    return { status: 'limited', text: raw, source: 'template' }
  }

  const plain = cleanText(wikitext)
  if (/\b(?:no ship restrictions?|no acceleration gate|not gated|ungated)\b/i.test(plain)) {
    return { status: 'unrestricted', text: 'Unrestricted', source: 'prose' }
  }

  const patterns = [
    { pattern: /ships? (?:are|is) restricted to:\s*([^.;|=]{3,300})/i },
    { pattern: /ship restrictions?(?: on (?:the|this) site)?(?: are|:)\s*([^.;|=]{3,300})/i },
    { pattern: /acceleration gate allows only\s+([^.;|=]{3,220}?)\s+to enter/i },
    { pattern: /(?:the )?gate only allows\s+([^.;|=]{3,220})/i },
    { pattern: /only allows:\s*([^.;|=]{3,220})/i },
    {
      pattern: /\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3}) but they are not allowed past the acceleration gate/,
      format: value => `${value} not allowed`,
    },
    {
      pattern: /\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3}) are not allowed past the acceleration gate/,
      format: value => `${value} not allowed`,
    },
  ]
  for (const { pattern, format = value => value } of patterns) {
    const match = plain.match(pattern)
    if (match) return { status: 'limited', text: cleanText(format(match[1])), source: 'prose' }
  }

  return { status: 'unknown', text: '', source: raw ? 'template' : 'none' }
}

function parseGuide(entry, page) {
  const wikitext = page.revisions?.[0]?.slots?.main?.content || ''
  const mission = templateFields(wikitext, 'Missiondetails')
  const site = templateFields(wikitext, 'CMBSiteInfo')
  const rawType = (site.type || entry.type).toLowerCase()
  const type = ({
    anaomaly: 'anomaly',
    anomaly: 'anomaly',
    ded: 'ded',
    unrated: 'unrated',
    expedition: 'expedition',
    escalation: 'expedition',
  })[rawType] || entry.type
  const level = entry.level || Number(mission.level) || null
  const faction = mission.faction || mission.faction1 || site.faction || entry.indexFaction || ''
  const title = site.name || page.title || entry.title
  const revision = page.revisions?.[0]
  let shipRestriction = extractShipRestriction(
    wikitext,
    mission.shipsizelimit || site['ship limit'] || '',
  )

  if (level === 5) {
    const noGateTitles = [
      "A Mote In The Eye", "Breeding Facility", "Cleaning House",
      "Liberate the Miners", "Operation Wyrmsbane", "Operation Wyrmslayer",
      "Reclamation", "Stray Amarr Carrier", "Stray Caldari Carrier",
      "The Big Sting"
    ]
    const colossusRestrictedTitles = [
      "Honor (Angel Cartel)", "Honor (Blood Raiders)",
      "Honor (Guristas Pirates)", "Honor (Serpentis)",
      "Rogue Spy", "Oust The Claimjumpers", "Finders And Keepers",
      "Prison Break", "Prison Bust", "For the Honor of Rouvenor"
    ]

    const isNoGate = noGateTitles.some(t => title.includes(t))
    const isRestricted = colossusRestrictedTitles.some(t => title.includes(t))

    if (isNoGate) {
      shipRestriction = { status: 'unrestricted', text: 'Unrestricted (Colossus supported)', source: 'serenity_rules' }
    } else if (isRestricted) {
      shipRestriction = { status: 'limited', text: 'Battleship & below (Colossus restricted)', source: 'serenity_rules' }
    } else {
      shipRestriction = { status: 'limited', text: 'Battleship & below (Colossus supported)', source: 'serenity_rules' }
    }
  }
  return {
    slug: slugify(page.title, type, level),
    title,
    type,
    level,
    faction,
    rating: site.rating || '',
    location: site.location || '',
    shipLimit: shipRestriction.text,
    shipRestriction,
    shipSuggestion: mission.shipsuggestion || '',
    damageToDeal: mission.damagetodeal || '',
    damageToResist: mission.damagetoresist || '',
    ewar: [mission.ewar, mission.webpoint].filter(Boolean).join(', '),
    objective: mission.objective || '',
    sections: plainSections(wikitext),
    groups: npcGroups(wikitext),
    source: {
      title: page.title,
      url: `${SOURCE_BASE}${encodeURIComponent(page.title.replaceAll(' ', '_'))}`,
      revisionId: revision?.revid || null,
      modifiedAt: revision?.timestamp || null,
      license: 'CC BY-SA 4.0',
    },
  }
}

async function fetchPages(entries) {
  const guides = []
  for (let start = 0; start < entries.length; start += 25) {
    const batch = entries.slice(start, start + 25)
    const data = await api({
      action: 'query',
      prop: 'revisions',
      titles: batch.map(entry => entry.title).join('|'),
      redirects: '1',
      rvprop: 'ids|timestamp|content',
      rvslots: 'main',
    })
    const redirects = new Map((data.query.redirects || []).map(item => [item.from, item.to]))
    const normalized = new Map((data.query.normalized || []).map(item => [item.from, item.to]))
    const entryByTitle = new Map()
    for (const entry of batch) {
      let title = normalized.get(entry.title) || entry.title
      title = redirects.get(title) || redirects.get(entry.title) || title
      entryByTitle.set(title.toLocaleLowerCase(), entry)
    }
    for (const page of data.query.pages) {
      if (page.missing) continue
      const entry = entryByTitle.get(page.title.toLocaleLowerCase())
      if (entry) guides.push(parseGuide(entry, page))
    }
    process.stdout.write(`\rFetched ${Math.min(start + batch.length, entries.length)}/${entries.length}`)
  }
  process.stdout.write('\n')
  return guides
}

async function main() {
  let previousBySlug = new Map()
  try {
    const previous = JSON.parse(await readFile(OUTPUT, 'utf8'))
    previousBySlug = new Map(previous.guides.map(guide => [guide.slug, guide]))
  } catch {
    // The first import has no translation data to preserve.
  }

  const missionIndex = await api({
    action: 'parse',
    page: 'Mission reports',
    prop: 'wikitext|revid',
  })
  const entries = missionEntries(missionIndex.parse.wikitext)

  for (const [category, type] of CATEGORY_TYPES) {
    const titles = await categoryMembers(category)
    entries.push(...titles.map(title => ({ title, type })))
  }

  const unique = [...new Map(entries.map(entry => [`${entry.type}:${entry.title}`, entry])).values()]
  const fetchedGuides = await fetchPages(unique)
  const guides = [...new Map(fetchedGuides.map(guide => [guide.slug, guide])).values()]
  for (const guide of guides) {
    const previous = previousBySlug.get(guide.slug)
    if (previous?.zh && previous.source.revisionId === guide.source.revisionId) {
      guide.zh = previous.zh
    }
  }
  guides.sort((a, b) => a.type.localeCompare(b.type) || (a.level || 0) - (b.level || 0) || a.title.localeCompare(b.title))

  const output = {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    source: {
      name: 'EVE University Wiki',
      url: SOURCE_BASE,
      license: 'CC BY-SA 4.0',
      missionIndexRevision: missionIndex.parse.revid,
    },
    guides,
  }
  await mkdir(dirname(OUTPUT), { recursive: true })
  await writeFile(OUTPUT, `${JSON.stringify(output)}\n`)
  console.log(`Wrote ${guides.length} guides to ${OUTPUT}`)
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
