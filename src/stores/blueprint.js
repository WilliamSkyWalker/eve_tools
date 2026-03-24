import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useBlueprintStore = defineStore('blueprint', () => {
  const searchResults = ref([])
  const currentBlueprint = ref(null)
  const loading = ref(false)

  function setSearchResults(results) {
    searchResults.value = results
  }

  function setCurrentBlueprint(bp) {
    currentBlueprint.value = bp
  }

  function setLoading(val) {
    loading.value = val
  }

  return { searchResults, currentBlueprint, loading, setSearchResults, setCurrentBlueprint, setLoading }
})
