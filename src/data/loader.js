/**
 * Data loading layer — fetches static JSON files and caches in memory.
 * Each dataset is loaded at most once; concurrent callers share the same promise.
 *
 * Industry data is per-server (Serenity and Tranquility have different items
 * and Chinese translations, e.g. type 85062 is "侧进蛇级" on Serenity but
 * "响尾蛇级" on TQ — colliding with Rattlesnake). Getters select the current
 * server's cache, so a previous server's late response cannot replace it.
 */

import { useSettingsStore } from '../stores/settings'
import { shallowReactive } from 'vue'

const industryCache = shallowReactive({}) // datasource -> data
const industryPromises = {}  // datasource -> Promise

let navigationData = null
let navigationPromise = null

let wormholeData = null
let wormholePromise = null

let guideData = null
let guidePromise = null

async function fetchJson(url) {
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`Failed to load ${url}: ${resp.status}`)
  return resp.json()
}

export async function loadIndustryData() {
  const ds = useSettingsStore().datasource
  if (industryCache[ds]) {
    return industryCache[ds]
  }
  if (!industryPromises[ds]) {
    industryPromises[ds] = fetchJson(`${import.meta.env.BASE_URL}data/industry-${ds}.json`).then(data => {
      industryCache[ds] = data
      return data
    }).catch(error => {
      delete industryPromises[ds]
      throw error
    })
  }
  return industryPromises[ds]
}

export async function loadNavigationData() {
  if (navigationData) return navigationData
  if (!navigationPromise) {
    navigationPromise = fetchJson(`${import.meta.env.BASE_URL}data/navigation.json`).then(data => {
      navigationData = data
      return data
    }).catch(error => {
      navigationPromise = null
      throw error
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
    }).catch(error => {
      wormholePromise = null
      throw error
    })
  }
  return wormholePromise
}

export async function loadGuideData() {
  if (guideData) return guideData
  if (!guidePromise) {
    guidePromise = fetchJson(`${import.meta.env.BASE_URL}data/guides.json`).then(data => {
      guideData = data
      return data
    }).catch(error => {
      guidePromise = null
      throw error
    })
  }
  return guidePromise
}

let lpStoreData = null
let lpStorePromise = null

export async function loadLpStoreData() {
  if (lpStoreData) return lpStoreData
  if (!lpStorePromise) {
    lpStorePromise = fetchJson(`${import.meta.env.BASE_URL}data/lpstore.json`).then(data => {
      lpStoreData = data
      return data
    }).catch(error => {
      lpStorePromise = null
      throw error
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
    }).catch(error => {
      piPromise = null
      throw error
    })
  }
  return piPromise
}

export function getPiData() { return piData }

const dogmaCache = shallowReactive({}) // datasource -> data
const dogmaPromises = {}  // datasource -> Promise

export async function loadDogmaData() {
  const ds = useSettingsStore().datasource
  if (dogmaCache[ds]) {
    return dogmaCache[ds]
  }
  if (!dogmaPromises[ds]) {
    dogmaPromises[ds] = fetchJson(`${import.meta.env.BASE_URL}data/dogma-${ds}.json`).then(data => {
      dogmaCache[ds] = data
      return data
    }).catch(error => {
      delete dogmaPromises[ds]
      throw error
    })
  }
  return dogmaPromises[ds]
}

export function getIndustryData() { return industryCache[useSettingsStore().datasource] || null }
export function getNavigationData() { return navigationData }
export function getWormholeData() { return wormholeData }
export function getGuideData() { return guideData }
export function getLpStoreData() { return lpStoreData }
export function getDogmaData() { return dogmaCache[useSettingsStore().datasource] || null }
