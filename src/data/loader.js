/**
 * Data loading layer — fetches static JSON files and caches in memory.
 * Each dataset is loaded at most once; concurrent callers share the same promise.
 */

let industryData = null
let industryPromise = null

let navigationData = null
let navigationPromise = null

let wormholeData = null
let wormholePromise = null

async function fetchJson(url) {
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`Failed to load ${url}: ${resp.status}`)
  return resp.json()
}

export async function loadIndustryData() {
  if (industryData) return industryData
  if (!industryPromise) {
    industryPromise = fetchJson(`${import.meta.env.BASE_URL}data/industry.json`).then(data => {
      industryData = data
      return data
    })
  }
  return industryPromise
}

export async function loadNavigationData() {
  if (navigationData) return navigationData
  if (!navigationPromise) {
    navigationPromise = fetchJson(`${import.meta.env.BASE_URL}data/navigation.json`).then(data => {
      navigationData = data
      return data
    })
  }
  return navigationPromise
}

export async function loadWormholeData() {
  if (wormholeData) return wormholeData
  if (!wormholePromise) {
    wormholePromise = fetchJson(`${import.meta.env.BASE_URL}data/wormhole.json`).then(data => {
      wormholeData = data
      return data
    })
  }
  return wormholePromise
}

let lpStoreData = null
let lpStorePromise = null

export async function loadLpStoreData() {
  if (lpStoreData) return lpStoreData
  if (!lpStorePromise) {
    lpStorePromise = fetchJson(`${import.meta.env.BASE_URL}data/lpstore.json`).then(data => {
      lpStoreData = data
      return data
    })
  }
  return lpStorePromise
}

let piData = null
let piPromise = null

export async function loadPiData() {
  if (piData) return piData
  if (!piPromise) {
    piPromise = fetchJson(`${import.meta.env.BASE_URL}data/pi.json`).then(data => {
      piData = data
      return data
    })
  }
  return piPromise
}

export function getPiData() { return piData }

export function getIndustryData() { return industryData }
export function getNavigationData() { return navigationData }
export function getWormholeData() { return wormholeData }
export function getLpStoreData() { return lpStoreData }
