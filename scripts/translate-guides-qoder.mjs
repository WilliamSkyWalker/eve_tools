import { access, readFile, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { constants } from 'node:fs'
import { resolve } from 'node:path'

const DATA_PATH = resolve('public/data/guides.json')
const QODER = process.env.QODERCLI || resolve(process.env.HOME, '.local/bin/qoderclicn')
const CONCURRENCY = Number(process.env.GUIDE_TRANSLATION_WORKERS || 4)
const MAX_BATCH_CHARS = Number(process.env.GUIDE_TRANSLATION_BATCH_CHARS || 18000)
const MAX_RETRIES = 2
const children = new Set()

function stopChildren() {
  for (const child of children) {
    try {
      process.kill(-child.pid, 'SIGTERM')
    } catch {
      // The child may have completed between iteration and termination.
    }
  }
}

process.once('SIGINT', () => {
  stopChildren()
  process.exit(130)
})
process.once('SIGTERM', () => {
  stopChildren()
  process.exit(143)
})
process.once('exit', stopChildren)

const SYSTEM_PROMPT = `你是 EVE Online PvE 攻略的专业翻译器。
把输入 JSON 数组中的 title、sections.heading、sections.text 翻译成简体中文。
要求：
1. 使用 EVE 玩家术语：Guristas=古斯塔斯，Angel Cartel=天使企业联合体，Blood Raiders=血袭者，Sansha's Nation=萨沙共和国，Serpentis=天蛇，Rogue Drones=自由无人机。
2. Haven=避难所，Sanctum=圣坛，Deadspace pocket=死亡空间房间，reinforcement spawn=增援波次，warp disrupt/scram=反跳，web=网子，energy neutralizer/neut=毁电，logistics=后勤舰，capital ship=旗舰，acceleration gate=加速轨道，blitz=速刷。
3. 保留 slug、数字、距离、伤害比例、单位、舰船型号和 NPC 专名；不要删减、总结或添加战术。
4. sections 数量和顺序必须与输入完全一致。
5. 只输出合法 JSON 数组，不要 Markdown、代码围栏或解释。`

function runQoder(prompt) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(QODER, [
      '-p',
      '--tools', '',
      '--no-session-persistence',
      '--max-output-tokens', '30000',
      `${SYSTEM_PROMPT}\n\n输入 JSON：\n${prompt}`,
    ], {
      cwd: process.cwd(),
      detached: true,
      env: {
        ...process.env,
        CI: '1',
        TERM: 'dumb',
        NO_COLOR: '1',
        FORCE_COLOR: '0',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    children.add(child)
    child.stdout.on('data', chunk => { stdout += chunk })
    child.stderr.on('data', chunk => { stderr += chunk })
    child.on('error', reject)
    child.on('close', code => {
      children.delete(child)
      if (code === 0) resolvePromise(stdout.trim())
      else reject(new Error(`qoderclicn exited ${code}: ${stderr.trim()}`))
    })
  })
}

function parseResponse(output) {
  const start = output.indexOf('[')
  const end = output.lastIndexOf(']')
  if (start === -1 || end === -1) throw new Error('Qoder response did not contain a JSON array')
  return JSON.parse(output.slice(start, end + 1))
}

function validateBatch(input, output) {
  if (!Array.isArray(output) || output.length !== input.length) {
    throw new Error(`Expected ${input.length} translated guides, received ${output?.length}`)
  }
  const outputBySlug = new Map(output.map(guide => [guide.slug, guide]))
  return input.map(guide => {
    const translated = outputBySlug.get(guide.slug)
    if (!translated || typeof translated.title !== 'string' || translated.sections?.length !== guide.sections.length) {
      throw new Error(`Invalid translation shape for ${guide.slug}`)
    }
    return translated
  })
}

function makeBatches(guides) {
  const batches = []
  let current = []
  let size = 0
  for (const guide of guides) {
    const item = {
      slug: guide.slug,
      title: guide.title,
      sections: guide.sections.map(section => ({
        heading: section.heading,
        text: section.text,
      })),
    }
    const itemSize = JSON.stringify(item).length
    if (current.length && size + itemSize > MAX_BATCH_CHARS) {
      batches.push(current)
      current = []
      size = 0
    }
    current.push(item)
    size += itemSize
  }
  if (current.length) batches.push(current)
  return batches
}

async function translateBatch(batch, batchNumber) {
  let lastError
  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt += 1) {
    try {
      const output = parseResponse(await runQoder(JSON.stringify(batch)))
      return validateBatch(batch, output)
    } catch (error) {
      lastError = error
      console.warn(`Batch ${batchNumber} attempt ${attempt} failed: ${error.message}`)
    }
  }
  if (batch.length > 1) {
    const translated = []
    for (const guide of batch) {
      translated.push(...await translateBatch([guide], `${batchNumber}:${guide.slug}`))
    }
    return translated
  }
  console.warn(`Batch ${batchNumber} switching to tagged field output`)
  return [await translateGuideTagged(batch[0])]
}

async function translateGuideTagged(guide) {
  const fields = [
    guide.title,
    ...guide.sections.flatMap(section => [section.heading, section.text]),
  ]
  const input = fields.map((text, index) => `<<<FIELD_${index}>>>\n${text}`).join('\n')
  const prompt = `翻译下面各字段。输出必须保留每个 <<<FIELD_N>>> 标记且顺序不变；每个标记后只放对应的简体中文译文，不要输出其他内容。不要使用 JSON。\n${input}`
  const output = await runQoder(prompt)
  const translated = fields.map((_, index) => {
    const marker = `<<<FIELD_${index}>>>`
    const nextMarker = `<<<FIELD_${index + 1}>>>`
    const start = output.indexOf(marker)
    if (start === -1) throw new Error(`Missing ${marker} for ${guide.slug}`)
    const valueStart = start + marker.length
    const end = index === fields.length - 1 ? output.length : output.indexOf(nextMarker, valueStart)
    if (end === -1) throw new Error(`Missing ${nextMarker} for ${guide.slug}`)
    return output.slice(valueStart, end).trim()
  })
  return {
    slug: guide.slug,
    title: translated[0],
    sections: guide.sections.map((_, index) => ({
      heading: translated[1 + index * 2],
      text: translated[2 + index * 2],
    })),
  }
}

async function main() {
  await access(QODER, constants.X_OK)
  const data = JSON.parse(await readFile(DATA_PATH, 'utf8'))
  const pending = data.guides.filter(guide =>
    !guide.zh?.title || guide.zh.sections?.length !== guide.sections.length)
  const batches = makeBatches(pending)
  const guideBySlug = new Map(data.guides.map(guide => [guide.slug, guide]))
  let nextBatch = 0
  let completedGuides = 0
  let saveChain = Promise.resolve()

  async function worker() {
    while (true) {
      const index = nextBatch
      nextBatch += 1
      if (index >= batches.length) return
      const translated = await translateBatch(batches[index], index + 1)
      for (const item of translated) {
        guideBySlug.get(item.slug).zh = {
          title: item.title,
          sections: item.sections,
        }
      }
      completedGuides += translated.length
      data.translation = {
        language: 'zh-Hans',
        provider: 'Qoder CLI CN',
        kind: 'machine',
      }
      const snapshot = `${JSON.stringify(data)}\n`
      saveChain = saveChain.then(() => writeFile(DATA_PATH, snapshot))
      await saveChain
      console.log(`Translated ${completedGuides}/${pending.length} guides (${index + 1}/${batches.length} batches)`)
    }
  }

  if (!pending.length) {
    console.log('All guides already have Chinese translations')
    return
  }
  console.log(`Translating ${pending.length} guides in ${batches.length} batches with ${CONCURRENCY} workers`)
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, batches.length) }, () => worker()))
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
