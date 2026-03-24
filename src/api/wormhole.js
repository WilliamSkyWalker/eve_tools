import { searchWormholeSystems as _search, getWormholeSystem, listWormholeTypes } from '../services/wormholeSearch'

export function searchWormholeSystems(query, { whClass, effect } = {}) {
  return Promise.resolve({ data: { results: _search(query, whClass ?? null, effect || null) } })
}

export function getWormholeSystemDetail(systemId) {
  return Promise.resolve({ data: getWormholeSystem(systemId) })
}

export function getWormholeTypes() {
  return Promise.resolve({ data: { results: listWormholeTypes() } })
}
