import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed } from 'vue'

let loader, settings, requests

beforeEach(async () => {
  vi.resetModules()
  loader = await import('./loader')
  settings = (await import('../stores/settings')).useSettingsStore()
  settings.setServer('gf')
  requests = new Map()
  vi.stubGlobal('fetch', vi.fn(url => new Promise(resolve => requests.set(url, resolve))))
})

afterEach(() => vi.unstubAllGlobals())

function respond(file, data) {
  requests.get(`/data/${file}.json`)({ ok: true, json: async () => data })
}

describe.each([
  ['industry', 'loadIndustryData', 'getIndustryData'],
  ['dogma', 'loadDogmaData', 'getDogmaData'],
])('%s server data', (file, load, get) => {
  it('isolates server caches when the previous server finishes loading last', async () => {
    const active = computed(() => loader[get]())
    const gf = loader[load]()
    const sharedGf = loader[load]()
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(active.value).toBeNull()
    settings.setServer('of')
    const of = loader[load]()
    const ofData = { types: { 1: { n: 'OF item' } } }
    respond(`${file}-tranquility`, ofData)
    expect(await of).toBe(ofData)
    expect(active.value).toBe(ofData)

    const gfData = { types: { 1: { n: 'GF item' } } }
    respond(`${file}-serenity`, gfData)
    expect(await gf).toBe(gfData)
    expect(await sharedGf).toBe(gfData)
    expect(active.value).toBe(ofData)
    settings.setServer('gf')
    expect(active.value).toBe(gfData)
    expect(await loader[load]()).toBe(gfData)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('does not expose the old dataset while the new server is loading', async () => {
    const gf = loader[load]()
    respond(`${file}-serenity`, { types: {} })
    await gf
    settings.setServer('of')
    expect(loader[get]()).toBeNull()
    const of = loader[load]()
    expect(loader[get]()).toBeNull()
    respond(`${file}-tranquility`, { types: {} })
    await of
    expect(loader[get]()).not.toBeNull()
  })
})

it.each(['loadIndustryData', 'loadDogmaData', 'loadNavigationData', 'loadWormholeData', 'loadGuideData', 'loadLpStoreData', 'loadPiData'])(
  '%s retries after a failed download', async load => {
    fetch.mockRejectedValueOnce(new Error('offline'))
    await expect(loader[load]()).rejects.toThrow('offline')
    const data = { types: {} }
    fetch.mockResolvedValueOnce({ ok: true, json: async () => data })
    expect(await loader[load]()).toBe(data)
    expect(fetch).toHaveBeenCalledTimes(2)
  },
)
