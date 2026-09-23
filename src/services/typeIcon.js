/**
 * Server-aware type icon / render URLs with cross-host fallback.
 *
 * Serenity (国服) items are served by NetEase:
 *   icon:   https://image.evepc.163.com/Type/{id}_{32|64}.png
 *   render: https://image.evepc.163.com/Render/{id}_{32..512}.png
 * Tranquility uses the world image server:
 *   https://images.evetech.net/types/{id}/{icon|render}?size=N
 *
 * Neither host has full coverage — NetEase is missing recent Equinox items
 * (X-Grade ores etc.) and answers with a 302 → /Type/1_32.png placeholder
 * instead of 404, so the browser's error event never fires. evetech is
 * missing 国服-only items (e.g. 84004 ★胜利者级) and 404s normally.
 *
 * Fallback chain (walked via a document-level capture listener installed
 * below, so views need no template changes):
 *   same-host other variant → cross-host icon → cross-host render
 * dataset.tried tracks visited URLs to prevent loops; the placeholder case
 * is caught by inspecting img.currentSrc after a successful load.
 *
 * Reads the server directly from localStorage (mirrors locale.js) so it works
 * outside component setup; views remount on server switch so binding re-evals.
 */
function currentServer() {
  return (typeof localStorage !== 'undefined' && localStorage.getItem('eve_server')) || 'gf'
}

// NetEase renders only exist at these sizes; pick the smallest >= requested.
function renderSize(size) {
  const opts = [32, 64, 128, 256, 512]
  return opts.find(o => o >= size) || 512
}

function neteaseUrl(typeId, size, variant) {
  if (variant === 'render') {
    return `https://image.evepc.163.com/Render/${typeId}_${renderSize(size)}.png`
  }
  return `https://image.evepc.163.com/Type/${typeId}_${size <= 32 ? 32 : 64}.png`
}

function evetechUrl(typeId, size, variant) {
  return `https://images.evetech.net/types/${typeId}/${variant}?size=${size}`
}

/**
 * @param {number|string} typeId
 * @param {number} size    requested pixel size (default 32)
 * @param {'icon'|'render'} variant
 */
export function typeIcon(typeId, size = 32, variant = 'icon') {
  return currentServer() === 'gf'
    ? neteaseUrl(typeId, size, variant)
    : evetechUrl(typeId, size, variant)
}

// ── Cross-host fallback ────────────────────────────────────────────────────

// NetEase's "we don't have this icon" response is a 302 to /Type/1_{32|64}.png
// (or /Render/1_{N}.png). Browsers report the resolved URL in currentSrc, so
// we can detect it post-load.
const NETEASE_PLACEHOLDER_RE = /image\.evepc\.163\.com\/(?:Type|Render)\/1_\d+\.png/
const MANAGED_HOST_RE = /image\.evepc\.163\.com|images\.evetech\.net/

function parseTypeId(src) {
  const m = src.match(/image\.evepc\.163\.com\/(?:Type|Render)\/(\d+)_/)
    || src.match(/images\.evetech\.net\/types\/(\d+)\//)
  return m ? Number(m[1]) : null
}

function parseSize(src) {
  const m = src.match(/_(\d+)\.png(?:$|\?)/) || src.match(/[?&]size=(\d+)/)
  return m ? Number(m[1]) : 32
}

function isRender(src) {
  return src.includes('/Render/') || src.includes('/render?')
}

function isNetease(src) {
  return src.includes('image.evepc.163.com')
}

function fallbackChain(src) {
  const typeId = parseTypeId(src)
  if (!typeId || typeId === 1) return []
  const size = parseSize(src)
  const variant = isRender(src) ? 'render' : 'icon'
  const onNes = isNetease(src)
  const other = variant === 'icon' ? 'render' : 'icon'
  const cross = onNes ? evetechUrl : neteaseUrl
  const same = onNes ? neteaseUrl : evetechUrl
  // Cross-host same-variant is the reliable escape when one CDN lacks the
  // item; other-variant is a last resort (NetEase Type/Render usually miss
  // together, evetech 404 is 404 for both).
  return [cross(typeId, size, variant), cross(typeId, size, other), same(typeId, size, other)]
}

function advance(el) {
  const tried = new Set((el.dataset.tried || '').split('|').filter(Boolean))
  // Parse from el.src (the URL we requested), not currentSrc — NetEase's 302
  // to the placeholder leaves currentSrc pointing at /Type/1_32.png.
  const requested = el.src
  tried.add(requested)
  const next = fallbackChain(requested).find(u => u && !tried.has(u))
  if (!next) {
    el.dataset.fallbackDone = '1'
    return false
  }
  el.dataset.tried = [...tried, next].join('|')
  el.src = next
  return true
}

function isManaged(el) {
  return el?.tagName === 'IMG' && MANAGED_HOST_RE.test(el.src || '')
}

function handleLoad(e) {
  const el = e.target
  if (!isManaged(el) || el.dataset.fallbackDone) return
  const resolved = el.currentSrc || el.src
  if (!NETEASE_PLACEHOLDER_RE.test(resolved)) return
  advance(el)
}

function handleError(e) {
  const el = e.target
  if (!isManaged(el) || el.dataset.fallbackDone) return
  advance(el)
}

function handleErrorCapture(e) {
  e.__typeIconHandled = true
  handleError(e)
}

// Install once. Image load/error don't bubble, but capture-phase listeners
// on document still fire — lets us avoid touching every <img> template.
if (typeof document !== 'undefined' && !document.__typeIconFallbackInstalled) {
  document.addEventListener('load', handleLoad, true)
  document.addEventListener('error', handleErrorCapture, true)
  document.__typeIconFallbackInstalled = true
}

// Kept for existing templates that bind @error directly. The document-level
// capture listener already handled the event by the time this runs on target
// phase — the marker prevents double-advancing the chain.
export function onTypeIconError(e) {
  if (e?.__typeIconHandled) return
  handleError(e)
}
