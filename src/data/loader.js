/**
 * Data loading layer — fetches static JSON files and caches in memory.
 * Each dataset is loaded at most once; concurrent callers share the same promise.
 *
 * Industry data is per-server (Serenity and Tranquility have different items
 * and Chinese translations, e.g. type 85062 is "侧进蛇级" on Serenity but
 * "响尾蛇级" on TQ — colliding with Rattlesnake). The active dataset reflects
 * the most recent loadIndustryData() call.
 */

import { useSettingsStore } from '../stores/settings'

let industryData = null
const industryCache = {}     // datasource -> data
const industryPromises = {}  // datasource -> Promise

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
  const ds = useSettingsStore().datasource
  if (industryCache[ds]) {
    industryData = industryCache[ds]
    return industryData
  }
  if (!industryPromises[ds]) {
    industryPromises[ds] = fetchJson(`${import.meta.env.BASE_URL}data/industry-${ds}.json`).then(data => {
      industryCache[ds] = data
      industryData = data
      return data
    })
  }
  const data = await industryPromises[ds]
  industryData = data
  return data
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

let dogmaData = null
let dogmaPromise = null

export async function loadDogmaData() {
  if (dogmaData) return dogmaData
  if (!dogmaPromise) {
    dogmaPromise = fetchJson(`${import.meta.env.BASE_URL}data/dogma.json`).then(data => {
      dogmaData = data
      return data
    })
  }
  return dogmaPromise
}

export function getIndustryData() { return industryData }
export function getNavigationData() { return navigationData }
export function getWormholeData() { return wormholeData }
export function getLpStoreData() { return lpStoreData }
export function getDogmaData() { return dogmaData }
