/**
 * Shared locale helper for services layer.
 * Reads directly from localStorage to avoid Pinia dependency.
 */
export function getLocale() {
  return (typeof localStorage !== 'undefined' && localStorage.getItem('eve_locale')) || 'zh'
}

/**
 * Pick localized name: { n: english, nz: chinese }
 */
export function locName(obj) {
  if (!obj) return ''
  if (getLocale() === 'en') return obj.n || obj.nz || ''
  return obj.nz || obj.n || ''
}
