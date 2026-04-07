<template>
  <div class="sovmap">
    <h1 class="title">{{ t('sovmap.title') }}</h1>
    <p class="subtitle">{{ t('sovmap.subtitle') }}</p>

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
    cy + (wz - midZ) * scale,
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
.sovmap {
  padding-top: 40px;
  max-width: 1100px;
  margin: 0 auto;
}

.title {
  color: #c8aa6e;
  font-size: 1.6em;
  text-align: center;
  margin-bottom: 4px;
}

.subtitle {
  color: #8a8a8a;
  font-size: 0.9em;
  text-align: center;
  margin-bottom: 24px;
}

.loading-text {
  color: #555;
  text-align: center;
  padding: 60px;
  font-size: 1.1em;
}

.error-text {
  color: #ef5350;
  text-align: center;
  padding: 40px;
}

.map-wrapper {
  position: relative;
  background: #000;
  border: 1px solid #2a2a2a;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 20px;
}

canvas {
  display: block;
  width: 960px;
  height: 720px;
  max-width: 100%;
  cursor: grab;
}

canvas:active {
  cursor: grabbing;
}

/* Tooltip */
.tooltip {
  position: absolute;
  background: rgba(10, 10, 10, 0.95);
  border: 1px solid #3a3a3a;
  border-radius: 8px;
  padding: 10px 14px;
  pointer-events: none;
  min-width: 180px;
  max-width: 280px;
  z-index: 10;
}

.tooltip-name {
  color: #c8aa6e;
  font-weight: 700;
  font-size: 0.95em;
  margin-bottom: 4px;
}

.tooltip-systems {
  color: #8a8a8a;
  font-size: 0.8em;
  margin-bottom: 4px;
}

.tooltip-alliance {
  color: #e6e6e6;
  font-size: 0.85em;
  margin-bottom: 2px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.tooltip-count {
  color: #8a8a8a;
  font-size: 0.8em;
}

.tooltip-unclaimed {
  color: #555;
  font-size: 0.85em;
  font-style: italic;
}

.tooltip-others {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid #2a2a2a;
}

.tooltip-other-row {
  color: #aaa;
  font-size: 0.78em;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 2px;
}

/* Legend */
.legend {
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 10px;
  padding: 16px 20px;
  margin-bottom: 40px;
}

.legend-title {
  color: #c8aa6e;
  font-size: 1em;
  margin-bottom: 12px;
}

.legend-items {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.swatch {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 2px;
  flex-shrink: 0;
}

.legend-name {
  color: #e6e6e6;
  font-size: 0.8em;
  max-width: 170px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.legend-count {
  color: #555;
  font-size: 0.72em;
}
</style>
