/**
 * Server-aware type icon / render URLs.
 *
 * Serenity (国服) items — including 国服-only ships like ★胜利者级 (84004) that
 * don't exist on the world image server — are served by NetEase:
 *   icon:   https://image.evepc.163.com/Type/{id}_{32|64}.png
 *   render: https://image.evepc.163.com/Render/{id}_{32..512}.png
 * Tranquility uses the world image server (images.evetech.net).
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

/**
 * @param {number|string} typeId
 * @param {number} size    requested pixel size (default 32)
 * @param {'icon'|'render'} variant
 */
export function typeIcon(typeId, size = 32, variant = 'icon') {
  if (currentServer() === 'gf') {
    if (variant === 'render') {
      return `https://image.evepc.163.com/Render/${typeId}_${renderSize(size)}.png`
    }
    // NetEase Type icons only exist at 32 and 64.
    return `https://image.evepc.163.com/Type/${typeId}_${size <= 32 ? 32 : 64}.png`
  }
  return `https://images.evetech.net/types/${typeId}/${variant}?size=${size}`
}

/**
 * @error handler for <img>: falls back once when the primary URL 404s.
 * NetEase icon → NetEase render (ships lack a Type icon); evetech icon → render.
 */
export function onTypeIconError(e) {
  const el = e?.target
  if (!el || el.dataset.fb) return
  el.dataset.fb = '1'
  const src = el.src
  if (src.includes('image.evepc.163.com')) {
    el.src = src.replace('/Type/', '/Render/').replace(/_(32|64)\.png$/, '_256.png')
  } else {
    el.src = src.replace('/icon?', '/render?')
  }
}
