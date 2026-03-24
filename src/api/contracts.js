import { getPublicContracts as _getContracts, getContractItems as _getItems, searchRegions as _searchRegions } from '../services/contracts'

export async function getPublicContracts(regionId, { type, page, datasource } = {}) {
  const result = await _getContracts(regionId, type || null, page || 1, datasource || 'serenity')
  return { data: result }
}

export async function getContractItems(contractId, { datasource } = {}) {
  const result = await _getItems(contractId, datasource || 'serenity')
  return { data: result }
}

export function searchRegions(query) {
  return Promise.resolve({ data: { results: _searchRegions(query) } })
}
