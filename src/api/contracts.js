import { loadIndustryData, loadNavigationData } from '../data/loader'
import { getPublicContracts as _getContracts, getContractItems as _getItems, searchRegions as _searchRegions } from '../services/contracts'

export async function getPublicContracts(regionId, { type, page, datasource } = {}) {
  const result = await _getContracts(regionId, type || null, page || 1, datasource || 'serenity')
  return { data: result }
}

export async function getContractItems(contractId, { datasource } = {}) {
  await loadIndustryData()
  const result = await _getItems(contractId, datasource || 'serenity')
  return { data: result }
}

export async function searchRegions(query) {
  await loadNavigationData()
  return Promise.resolve({ data: { results: _searchRegions(query) } })
}
