<template>
  <div class="sovmap">
    <div class="page-head">
      <div class="titles">
        <h1>{{ t('sovmap.title') }} <span class="srv-chip gf beta-chip">{{ t('nav.beta') }}</span><PageHelp topic="sovmap" /></h1>
        <p class="sub">{{ t('sovmap.subtitle') }}</p>
      </div>
    </div>

    <div v-if="loading" class="loading-text">{{ t('sovmap.loading') }}</div>
    <div v-else-if="error" class="error-text">{{ error }}</div>
    <template v-else>
      <div class="map-wrapper">
        <canvas
          ref="canvasRef"
          :width="canvasW"
          :height="canvasH"
          @mousemove="onMouseMove"
          @mouseleave="onMouseLeave"
          @wheel.prevent="onWheel"
          @mousedown="onDragStart"
        ></canvas>

        <!-- Tooltip -->
        <div v-if="hoveredRegion" class="tooltip" :style="tooltipStyle">
          <div class="tooltip-name">{{ regionDisplayName(hoveredRegion) }}</div>
          <div class="tooltip-systems">{{ hoveredRegion.systems.length }} {{ t('sovmap.systems') }}</div>
          <div v-if="hoveredRegion.dominant" class="tooltip-alliance">
            <span class="swatch" :style="{ background: allianceColorSolid(hoveredRegion.dominant.id) }"></span>
            {{ names[hoveredRegion.dominant.id] || `#${hoveredRegion.dominant.id}` }}
            <span class="tooltip-count">({{ hoveredRegion.dominant.count }}/{{ hoveredRegion.totalSov }})</span>
          </div>
          <div v-else class="tooltip-unclaimed">{{ t('sovmap.unclaimed') }}</div>
          <div v-if="Object.keys(hoveredRegion.allianceCounts).length > 1" class="tooltip-others">
            <div v-for="[aid, count] in topAlliances(hoveredRegion)" :key="aid" class="tooltip-other-row">
              <span class="swatch" :style="{ background: allianceColorSolid(Number(aid)) }"></span>
              {{ names[aid] || `#${aid}` }}: {{ count }}
            </div>
          </div>
        </div>
      </div>

      <!-- Legend -->
      <div class="legend">
        <h3 class="legend-title">{{ t('sovmap.topAlliances') }}</h3>
        <div class="legend-items">
          <div v-for="a in legendAlliances" :key="a.id" class="legend-item">
            <span class="swatch" :style="{ background: allianceColorSolid(a.id) }"></span>
            <span class="legend-name">{{ names[a.id] || `#${a.id}` }}</span>
            <span class="legend-count">{{ a.count }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue'
import { useSettingsStore } from '../stores/settings'
import { useI18n } from '../i18n'
import { loadNavigationData } from '../data/loader'
import PageHelp from '../components/layout/PageHelp.vue'
import {
  fetchSovereigntyMap,
  fetchAllianceNames,
  buildSovData,
  allianceColorRGB,
  allianceColorSolid,
} from '../services/sovereignty'

const settings = useSettingsStore()
const { t, locale } = useI18n()

const loading = ref(true)
const error = ref(null)
const canvasRef = ref(null)

// Use higher resolution for retina
const CSS_W = 960
const CSS_H = 720
const DPR = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1
const canvasW = CSS_W * DPR
const canvasH = CSS_H * DPR

const hoveredRegion = ref(null)
const mouseX = ref(0)
const mouseY = ref(0)

const view = reactive({ ox: 0, oy: 0, scale: 1 })
let dragging = false
let dragStartX = 0, dragStartY = 0, dragOx = 0, dragOy = 0

// Data
let sovSystems = []
let gateEdges = []       // [[x1,z1,x2,z2], ...] gate links between sov systems
let keySystems = []      // alliance capital systems (biggest alliances first)
let regions = {}
let allianceCentroids = {}
const names = ref({})
const legendAlliances = ref([])

// Influence cloud cache — pre-rendered at base scale
let influenceCanvas = null

let boundsMinX = 0, boundsMaxX = 0, boundsMinZ = 0, boundsMaxZ = 0

const datasource = computed(() => settings.datasource)

const tooltipStyle = computed(() => {
  const rect = canvasRef.value?.getBoundingClientRect()
  if (!rect) return {}
  // Convert canvas-pixel mouse to CSS pixels relative to wrapper
  const cssX = mouseX.value / DPR
  const cssY = mouseY.value / DPR
  let left = cssX + 14
  let top = cssY - 10
  if (left + 260 > CSS_W) left = cssX - 270
  if (top < 0) top = 4
  return { left: left + 'px', top: top + 'px' }
})

function regionDisplayName(r) {
  return (locale.value === 'zh' && r.nameZh) ? r.nameZh : r.name
}

function topAlliances(region) {
  return Object.entries(region.allianceCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
}

// ── Coordinate transforms ──

function getScale() {
  const rangeX = boundsMaxX - boundsMinX || 1
  const rangeZ = boundsMaxZ - boundsMinZ || 1
  const padding = 50 * DPR
  const drawW = canvasW - padding * 2
  const drawH = canvasH - padding * 2
  return Math.min(drawW / rangeX, drawH / rangeZ)
}

function worldToCanvas(wx, wz) {
  const base = getScale()
  const scale = base * view.scale
  const cx = canvasW / 2 + view.ox * DPR
  const cy = canvasH / 2 + view.oy * DPR
  const midX = (boundsMinX + boundsMaxX) / 2
  const midZ = (boundsMinZ + boundsMaxZ) / 2
  return [
    cx + (wx - midX) * scale,
    // Canvas Y grows downward; EVE +Z is galactic north, so negate to put
    // north at the top (matches the in-game / Dotlan orientation).
    cy - (wz - midZ) * scale,
  ]
}

// ── Influence cloud pre-rendering ──

function renderInfluenceCloud() {
  const iw = canvasW
  const ih = canvasH
  const offscreen = document.createElement('canvas')
  offscreen.width = iw
  offscreen.height = ih
  const ctx = offscreen.getContext('2d')

  // Blob radius in world units — tuned for nice overlap
  const BLOB_RADIUS_WORLD = 2.8
  const base = getScale()
  const blobR = BLOB_RADIUS_WORLD * base * view.scale

  // Use 'screen' blending for nice color mixing
  ctx.globalCompositeOperation = 'screen'

  for (const sys of sovSystems) {
    if (!sys.allianceId) continue
    const [cx, cy] = worldToCanvas(sys.x, sys.z)
    // Skip if far offscreen
    if (cx < -blobR || cx > iw + blobR || cy < -blobR || cy > ih + blobR) continue

    const [r, g, b] = allianceColorRGB(sys.allianceId)
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, blobR)
    grad.addColorStop(0, `rgba(${r},${g},${b},0.35)`)
    grad.addColorStop(0.5, `rgba(${r},${g},${b},0.15)`)
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`)
    ctx.fillStyle = grad
    ctx.fillRect(cx - blobR, cy - blobR, blobR * 2, blobR * 2)
  }

  influenceCanvas = offscreen
}

// ── Hit testing (find nearest region centroid) ──

function findRegionAtPoint(px, py) {
  let best = null
  let bestDist = Infinity
  const threshold = 40 * DPR // pixel distance
  for (const region of Object.values(regions)) {
    const [cx, cy] = worldToCanvas(region.centroid.x, region.centroid.z)
    const dx = px - cx, dy = py - cy
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < bestDist && dist < threshold) {
      bestDist = dist
      best = region
    }
  }
  return best
}

// ── Events ──

function onMouseMove(e) {
  const rect = canvasRef.value.getBoundingClientRect()
  mouseX.value = (e.clientX - rect.left) * DPR
  mouseY.value = (e.clientY - rect.top) * DPR

  if (dragging) return

  hoveredRegion.value = findRegionAtPoint(mouseX.value, mouseY.value)
}

function onMouseLeave() {
  hoveredRegion.value = null
}

function onWheel(e) {
  // Zoom toward mouse pointer
  const rect = canvasRef.value.getBoundingClientRect()
  const mx = (e.clientX - rect.left) * DPR
  const my = (e.clientY - rect.top) * DPR

  const factor = e.deltaY > 0 ? 0.9 : 1.1
  const newScale = Math.max(0.3, Math.min(10, view.scale * factor))
  const ratio = newScale / view.scale

  // Adjust offset so the point under cursor stays fixed
  const cx = canvasW / 2 + view.ox * DPR
  const cy = canvasH / 2 + view.oy * DPR
  view.ox = ((cx - mx) * ratio + mx - canvasW / 2) / DPR
  view.oy = ((cy - my) * ratio + my - canvasH / 2) / DPR
  view.scale = newScale
  renderAndDraw()
}

function onDragStart(e) {
  dragging = true
  dragStartX = e.clientX
  dragStartY = e.clientY
  dragOx = view.ox
  dragOy = view.oy

  const onMove = (ev) => {
    view.ox = dragOx + (ev.clientX - dragStartX)
    view.oy = dragOy + (ev.clientY - dragStartY)
    renderAndDraw()
  }
  const onUp = () => {
    dragging = false
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

// ── Drawing ──

let rafId = 0
function renderAndDraw() {
  cancelAnimationFrame(rafId)
  rafId = requestAnimationFrame(() => {
    renderInfluenceCloud()
    draw()
  })
}

function draw() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvasW, canvasH)

  // 1. Draw influence cloud layer
  if (influenceCanvas) {
    ctx.drawImage(influenceCanvas, 0, 0)
  }

  // 1b. Draw gate connections (single path for performance)
  ctx.strokeStyle = 'rgba(150,162,178,0.11)'
  ctx.lineWidth = Math.max(0.4, 0.5 * DPR)
  ctx.beginPath()
  for (const [x1, z1, x2, z2] of gateEdges) {
    const [ax, ay] = worldToCanvas(x1, z1)
    const [bx, by] = worldToCanvas(x2, z2)
    if ((ax < 0 && bx < 0) || (ax > canvasW && bx > canvasW) ||
        (ay < 0 && by < 0) || (ay > canvasH && by > canvasH)) continue
    ctx.moveTo(ax, ay)
    ctx.lineTo(bx, by)
  }
  ctx.stroke()

  // 2. Draw system dots
  const dotR = Math.max(0.8, 1.2 * DPR * Math.min(view.scale, 2))
  for (const sys of sovSystems) {
    const [cx, cy] = worldToCanvas(sys.x, sys.z)
    if (cx < -10 || cx > canvasW + 10 || cy < -10 || cy > canvasH + 10) continue

    ctx.beginPath()
    ctx.arc(cx, cy, dotR, 0, Math.PI * 2)
    if (sys.allianceId) {
      const [r, g, b] = allianceColorRGB(sys.allianceId)
      ctx.fillStyle = `rgba(${r},${g},${b},0.9)`
    } else {
      ctx.fillStyle = 'rgba(120,120,120,0.5)'
    }
    ctx.fill()
  }

  // 3. Draw alliance name labels (top alliances only, at their centroids)
  const fontSize = Math.max(10, Math.round(13 * DPR * Math.min(view.scale, 2.5)))
  ctx.font = `bold ${fontSize}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // Show top N alliances based on zoom
  const labelCount = view.scale < 0.8 ? 8 : view.scale < 1.5 ? 15 : 25
  const topIds = legendAlliances.value.slice(0, labelCount)

  for (const a of topIds) {
    const c = allianceCentroids[a.id]
    if (!c) continue
    const [cx, cy] = worldToCanvas(c.x, c.z)
    if (cx < -50 || cx > canvasW + 50 || cy < -50 || cy > canvasH + 50) continue

    const name = names.value[a.id] || `#${a.id}`
    const [r, g, b] = allianceColorRGB(a.id)

    // Text shadow for readability
    ctx.fillStyle = 'rgba(0,0,0,0.6)'
    ctx.fillText(name, cx + 1, cy + 1)
    ctx.fillStyle = `rgba(${r},${g},${b},0.85)`
    ctx.fillText(name, cx, cy)
  }

  // 3b. Draw alliance capital system names (biggest alliances first; more as you zoom in)
  const sysLabelCount = view.scale < 0.7 ? 12 : view.scale < 1.3 ? 30 : 80
  if (sysLabelCount > 0) {
    const sf = Math.max(9, Math.round(10 * DPR * Math.min(view.scale, 2.2)))
    ctx.font = `${sf}px sans-serif`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    const offset = dotR + 3 * DPR
    for (let i = 0; i < Math.min(sysLabelCount, keySystems.length); i++) {
      const s = keySystems[i]
      const [cx, cy] = worldToCanvas(s.x, s.z)
      if (cx < 0 || cx > canvasW || cy < 0 || cy > canvasH) continue
      const nm = (locale.value === 'zh' && s.nameZh) ? s.nameZh : s.name
      ctx.fillStyle = 'rgba(0,0,0,0.65)'
      ctx.fillText(nm, cx + offset + 1, cy + 1)
      ctx.fillStyle = 'rgba(228,231,236,0.85)'
      ctx.fillText(nm, cx + offset, cy)
    }
  }

  // 4. Draw region labels (smaller, only at higher zoom)
  if (view.scale >= 1.2) {
    const regionFontSize = Math.max(8, Math.round(9 * DPR * Math.min(view.scale, 3)))
    ctx.font = `${regionFontSize}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    for (const region of Object.values(regions)) {
      const [cx, cy] = worldToCanvas(region.centroid.x, region.centroid.z)
      if (cx < -50 || cx > canvasW + 50 || cy < -50 || cy > canvasH + 50) continue
      const name = regionDisplayName(region)
      ctx.fillStyle = 'rgba(255,255,255,0.25)'
      ctx.fillText(name, cx, cy - fontSize * 0.8)
    }
  }
}

// ── Data loading ──

async function loadData() {
  loading.value = true
  error.value = null
  try {
    const [navData, sovData] = await Promise.all([
      loadNavigationData(),
      fetchSovereigntyMap(datasource.value),
    ])

    const data = buildSovData(navData, sovData)
    sovSystems = data.systems
    regions = data.regions
    allianceCentroids = data.allianceCentroids

    // Build gate connections between sov systems + gate-degree per system
    const sysById = new Map(sovSystems.map(s => [s.id, s]))
    const degree = new Map()
    gateEdges = []
    for (const [a, b] of (navData.jumps || [])) {
      const sa = sysById.get(a), sb = sysById.get(b)
      if (!sa || !sb) continue
      gateEdges.push([sa.x, sa.z, sb.x, sb.z])
      degree.set(a, (degree.get(a) || 0) + 1)
      degree.set(b, (degree.get(b) || 0) + 1)
    }
    // Each alliance's "capital" ≈ its most gate-connected sovereign system
    // (its territory hub / main staging) — data-driven, so it never goes stale.
    const capByAlliance = new Map()
    for (const s of sovSystems) {
      if (!s.allianceId) continue
      const d = degree.get(s.id) || 0
      const cur = capByAlliance.get(s.allianceId)
      if (!cur || d > (degree.get(cur.id) || 0)) capByAlliance.set(s.allianceId, s)
    }

    // Compute bounds
    boundsMinX = Infinity; boundsMaxX = -Infinity
    boundsMinZ = Infinity; boundsMaxZ = -Infinity
    for (const sys of sovSystems) {
      if (sys.x < boundsMinX) boundsMinX = sys.x
      if (sys.x > boundsMaxX) boundsMaxX = sys.x
      if (sys.z < boundsMinZ) boundsMinZ = sys.z
      if (sys.z > boundsMaxZ) boundsMaxZ = sys.z
    }

    // Resolve alliance names
    const allIds = new Set()
    for (const sys of sovSystems) {
      if (sys.allianceId) allIds.add(sys.allianceId)
    }
    names.value = await fetchAllianceNames(datasource.value, [...allIds])

    // Build legend — top alliances by system count
    const allianceTotals = {}
    for (const sys of sovSystems) {
      if (sys.allianceId) {
        allianceTotals[sys.allianceId] = (allianceTotals[sys.allianceId] || 0) + 1
      }
    }
    legendAlliances.value = Object.entries(allianceTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([id, count]) => ({ id: Number(id), count }))

    // Capital systems ordered by owning-alliance size (biggest first)
    keySystems = [...capByAlliance.values()]
      .sort((s1, s2) => (allianceTotals[s2.allianceId] || 0) - (allianceTotals[s1.allianceId] || 0))

    // Reset view
    view.ox = 0
    view.oy = 0
    view.scale = 1

    loading.value = false
    await nextTick()
    renderInfluenceCloud()
    draw()
  } catch (e) {
    error.value = e.message
    loading.value = false
  }
}

watch(hoveredRegion, () => draw())
watch(datasource, () => loadData())
onMounted(() => loadData())
</script>

<style scoped>
.sovmap { max-width: 1100px; margin: 0 auto; }
.beta-chip { font-weight: 600; }

.loading-text { color: var(--text-dim); text-align: center; padding: 60px; font-size: 1.1em; }
.error-text { color: var(--red); text-align: center; padding: 40px; }

.map-wrapper {
  position: relative;
  background: #000;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  overflow: hidden;
  margin-bottom: 16px;
}
canvas { display: block; width: 960px; height: 720px; max-width: 100%; cursor: grab; }
canvas:active { cursor: grabbing; }

/* Tooltip */
.tooltip {
  position: absolute;
  background: rgba(12, 13, 16, 0.96);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  padding: 10px 14px;
  pointer-events: none;
  min-width: 180px; max-width: 280px;
  z-index: 10;
  box-shadow: var(--shadow-pop);
}
.tooltip-name { color: var(--gold); font-weight: 700; font-size: 0.95em; margin-bottom: 4px; }
.tooltip-systems { color: var(--text-muted); font-size: 0.8em; margin-bottom: 4px; font-family: var(--font-mono); }
.tooltip-alliance { color: var(--text-primary); font-size: 0.85em; margin-bottom: 2px; display: flex; align-items: center; gap: 6px; }
.tooltip-count { color: var(--text-muted); font-size: 0.8em; font-family: var(--font-mono); }
.tooltip-unclaimed { color: var(--text-dim); font-size: 0.85em; font-style: italic; }
.tooltip-others { margin-top: 6px; padding-top: 6px; border-top: 1px solid var(--border-default); }
.tooltip-other-row { color: var(--text-muted); font-size: 0.78em; display: flex; align-items: center; gap: 6px; margin-bottom: 2px; }

/* Legend */
.legend {
  background: var(--bg-panel);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  padding: 16px 20px;
  margin-bottom: 40px;
}
.legend-title { color: var(--text-primary); font-size: var(--text-md); font-weight: 600; margin-bottom: 12px; }
.legend-items { display: flex; flex-wrap: wrap; gap: 8px 16px; }
.legend-item { display: flex; align-items: center; gap: 6px; }
.swatch { display: inline-block; width: 10px; height: 10px; border-radius: 2px; flex-shrink: 0; }
.legend-name { color: var(--text-secondary); font-size: 0.82em; max-width: 170px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.legend-count { color: var(--text-dim); font-size: 0.72em; font-family: var(--font-mono); }
</style>
