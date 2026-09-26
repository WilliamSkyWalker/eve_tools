import { loadNavigationData, loadWormholeData } from '../data/loader'
import { searchWormholeSystems as _search, getWormholeSystem, listWormholeTypes } from '../services/wormholeSearch'

export async function searchWormholeSystems(query, { whClass, effect } = {}) {
  await Promise.all([loadNavigationData(), loadWormholeData()])
  return Promise.resolve({ data: { results: _search(query, whClass ?? null, effect || null) } })
}

export async function getWormholeSystemDetail(systemId) {
  await Promise.all([loadNavigationData(), loadWormholeData()])
  return Promise.resolve({ data: getWormholeSystem(systemId) })
}

export async function getWormholeTypes() {
  await loadWormholeData()
  return Promise.resolve({ data: { results: listWormholeTypes() } })
}
