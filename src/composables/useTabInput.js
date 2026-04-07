/**
 * Composable for handling tab input in textarea elements
 * Prevents default tab behavior and inserts tab character at cursor position
 */
export function useTabInput() {
  function handleTabKeydown(event) {
    if (event.key === 'Tab') {
      event.preventDefault()
      
      const target = event.target
      const start = target.selectionStart
      const end = target.selectionEnd
      const value = target.value
      
      // Insert tab character at cursor position
      const newValue = value.substring(0, start) + '\t' + value.substring(end)
      
      // Update the value
      target.value = newValue
      
      // Trigger input event to update v-model
      const inputEvent = new Event('input', { bubbles: true })
      target.dispatchEvent(inputEvent)
      
      // Set cursor position after the inserted tab
      target.selectionStart = target.selectionEnd = start + 1
    }
  }
  
  return {
    handleTabKeydown
  }
}