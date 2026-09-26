import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'

let preload, loader, settings, requests, stop

beforeEach(async () => {
  vi.resetModules()
  preload = await import('./preload')
  loader = await import('./loader')
  settings = (await import('../stores/settings')).useSettingsStore()
  settings.setServer('gf')
  requests = new Map()
  vi.stubGlobal('fetch', vi.fn(url => new Promise(resolve => requests.set(url, resolve))))
})

afterEach(() => {
  stop?.()
  stop = undefined
  vi.unstubAllGlobals()
})

function respond(url, data = {}) {
  requests.get(url)({ ok: true, json: async () => data })
}

it('preloads seven datasets for the current server and shares downloads with pages', async () => {
  const background = preload.preloadToolData()
  const page = loader.loadIndustryData()
  expect(fetch).toHaveBeenCalledTimes(7)
  expect([...requests.keys()].sort()).toEqual([
    '/data/dogma-serenity.json', '/data/guides.json', '/data/industry-serenity.json',
    '/data/lpstore.json', '/data/navigation.json', '/data/pi.json', '/data/wormhole.json',
  ])
  const data = { types: {} }
  for (const url of requests.keys()) respond(url, data)
  expect((await background).every(result => result.status === 'fulfilled')).toBe(true)
  expect(await page).toBe(data)
  await preload.preloadToolData()
  expect(fetch).toHaveBeenCalledTimes(7)
})

it('waits for the initial URL server and downloads only two new datasets on a switch', async () => {
  let finishNavigation
  const router = { isReady: () => new Promise(resolve => { finishNavigation = resolve }) }
  const startup = preload.startDataPreload(router, settings)
  expect(fetch).not.toHaveBeenCalled()
  settings.setServer('of')
  finishNavigation()
  stop = await startup
  expect(fetch).toHaveBeenCalledTimes(7)
  expect(requests.has('/data/industry-tranquility.json')).toBe(true)
  expect(requests.has('/data/industry-serenity.json')).toBe(false)
  for (const url of requests.keys()) respond(url)
  await flushPromises()

  settings.setServer('gf')
  await flushPromises()
  expect(fetch).toHaveBeenCalledTimes(9)
  respond('/data/industry-serenity.json')
  respond('/data/dogma-serenity.json')
  await flushPromises()
  settings.setServer('of')
  await flushPromises()
  expect(fetch).toHaveBeenCalledTimes(9)
})

it('keeps successful data when one preload fails and lets the page retry it', async () => {
  const background = preload.preloadToolData()
  for (const url of requests.keys()) {
    if (url === '/data/guides.json') requests.get(url)({ ok: false, status: 503 })
    else respond(url)
  }
  const results = await background
  expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(6)
  expect(results.filter(result => result.status === 'rejected')).toHaveLength(1)
  const page = loader.loadGuideData()
  expect(fetch).toHaveBeenCalledTimes(8)
  const guides = { guides: [] }
  respond('/data/guides.json', guides)
  expect(await page).toBe(guides)
})
