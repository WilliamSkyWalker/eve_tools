import { watch } from 'vue'
import {
  loadIndustryData, loadDogmaData, loadNavigationData, loadWormholeData,
  loadLpStoreData, loadPiData, loadGuideData,
} from './loader'

// Share the loaders' caches and in-flight requests with individual pages.
// A failed background download must not prevent other tools from warming up.
export function preloadToolData() {
  return Promise.allSettled([
    loadIndustryData(),
    loadDogmaData(),
    loadNavigationData(),
    loadWormholeData(),
    loadLpStoreData(),
    loadPiData(),
    loadGuideData(),
  ])
}

export async function startDataPreload(router, settings) {
  // The URL's server takes precedence over the saved preference. Wait for the
  // initial navigation guard to synchronize it before starting downloads.
  await router.isReady()
  return watch(() => settings.datasource, () => {
    void preloadToolData()
  }, { immediate: true })
}
