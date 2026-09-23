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
 *   cross-host same variant → cross-host other variant → same-host other variant
 * dataset.tried tracks visited URLs to prevent loops. evetech 404s, so its
 * misses arrive as a normal error event; NetEase's silent 302 needs an
 * out-of-band probe (see neteaseIsPlaceholder).
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
// (or /Render/1_{N}.png) served as HTTP 200. `img.currentSrc` does NOT track
// HTTP redirects, so nothing on the element reveals the substitution — the
// only way to see it is to re-request the URL and read Response.url. NetEase
// answers HEAD with Access-Control-Allow-Origin: *, so a cross-origin fetch
// can read it. The 302 itself carries Cache-Control: max-age=86400, so repeat
// probes hit the browser cache.
const NETEASE_PLACEHOLDER_RE = /image\.evepc\.163\.com\/(?:Type|Render)\/1_\d+\.png/
const MANAGED_HOST_RE = /image\.evepc\.163\.com|images\.evetech\.net/

const probeResults = new Map()

// Keyed by type+kind rather than URL: NetEase coverage is per type, so a list
// with the same item in ten rows probes once. Type and Render are kept apart
// because render coverage is much sparser — a missing render must not be
// allowed to condemn an icon that NetEase does have.
function neteaseIsPlaceholder(url) {
  const typeId = parseTypeId(url)
  const key = `${isRender(url) ? 'R' : 'T'}:${typeId}`
  let pending = probeResults.get(key)
  if (!pending) {
    pending = fetch(url, { method: 'HEAD' })
      .then(res => NETEASE_PLACEHOLDER_RE.test(res.url || ''))
      .catch(() => false)
    probeResults.set(key, pending)
  }
  return pending
}

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
  const other = variant === 'icon' ? 'render' : 'icon'
  if (isNetease(src)) {
    // NetEase's Render coverage is far sparser than its Type coverage (even
    // common ores like Tritanium 302 to the render placeholder), so a
    // same-host variant hop almost never helps — go straight to evetech.
    return [evetechUrl(typeId, size, variant), evetechUrl(typeId, size, other)]
  }
  return [neteaseUrl(typeId, size, variant), neteaseUrl(typeId, size, other), evetechUrl(typeId, size, other)]
}

function advance(el, { neteaseMissing = false } = {}) {
  // A confirmed NetEase placeholder means the CDN lacks that *type*, not just
  // that one asset — mark it so a later failure on the other host can't walk
  // back into NetEase's render placeholder.
  if (neteaseMissing) el.dataset.skipNes = '1'
  const skipNes = el.dataset.skipNes === '1'
  const tried = new Set((el.dataset.tried || '').split('|').filter(Boolean))
  const requested = el.src
  tried.add(requested)
  const next = fallbackChain(requested)
    .find(u => u && !tried.has(u) && !(skipNes && isNetease(u)))
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
  // A successful load only proves *something* rendered. On NetEase a missing
  // type silently renders the placeholder, so probe the requested URL; on
  // evetech a real miss 404s and arrives via handleError instead.
  const requested = el.src
  if (!isNetease(requested)) return
  neteaseIsPlaceholder(requested).then(missing => {
    // The element may have been reused/re-rendered while the probe was in
    // flight; only advance if it still shows the URL we probed.
    if (missing && el.src === requested) advance(el, { neteaseMissing: true })
  })
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
