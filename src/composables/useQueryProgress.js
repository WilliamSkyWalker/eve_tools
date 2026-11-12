import { ref } from 'vue'

// Progress reflects completed requests/work units, never elapsed-time guesses.
export function useQueryProgress() {
  const progress = ref(0)
  function start() { progress.value = 0 }
  function finish() { progress.value = 100 }
  function update({ completed, total }) {
    progress.value = total > 0
      ? Math.min(100, Math.max(0, Math.floor(completed / total * 100))) : 100
  }
  return { progress, start, finish, update }
}
