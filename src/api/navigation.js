import { searchSystems as _searchSystems } from '../services/systemSearch'
import { findRoute } from '../services/routeFinder'

export function searchSystems(query) {
  return Promise.resolve({ data: { results: _searchSystems(query) } })
}

export function calculateRoute(start, destination, jumpRange = 7.0, avoidSystems = []) {
  const result = findRoute(start, destination, jumpRange, avoidSystems)
  return Promise.resolve({ data: result })
}
