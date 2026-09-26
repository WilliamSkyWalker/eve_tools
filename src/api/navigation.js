import { loadNavigationData } from '../data/loader'
import { searchSystems as _searchSystems } from '../services/systemSearch'
import { findRoute } from '../services/routeFinder'

export async function searchSystems(query) {
  await loadNavigationData()
  return Promise.resolve({ data: { results: _searchSystems(query) } })
}

export async function calculateRoute(start, destination, jumpRange = 7.0, avoidSystems = []) {
  await loadNavigationData()
  const result = findRoute(start, destination, jumpRange, avoidSystems)
  return Promise.resolve({ data: result })
}
