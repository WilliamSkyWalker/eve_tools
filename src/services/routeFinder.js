/**
 * Capital jump route planner — port of navigation/services/route_finder.py
 */

import { getNavigationData } from '../data/loader'
import { locName } from './locale'

let _jumpCandidates = null  // [{ id, x, y, z }]
let _gateGraph = null       // Map<id, [neighborId, ...]>
let _initialized = false

function _init() {
  if (_initialized) return
  const data = getNavigationData()
  if (!data) return

  _jumpCandidates = []
  _gateGraph = new Map()

  for (const [sidStr, sys] of Object.entries(data.systems)) {
    const sid = parseInt(sidStr)
    // Jump candidates: low/null-sec, exclude wormhole regions (ID >= 11000000)
    if (Math.round(sys.s * 10) / 10 < 0.5 && sys.r < 11000000) {
      _jumpCandidates.push({ id: sid, x: sys.x, y: sys.y, z: sys.z })
    }
  }

  for (const [fromId, toId] of data.jumps) {
    if (!data.systems[fromId] || !data.systems[toId]) continue
    if (!_gateGraph.has(fromId)) _gateGraph.set(fromId, [])
    _gateGraph.get(fromId).push(toId)
  }

  _initialized = true
}

function _getSecurityClass(security) {
  const r = Math.round(security * 10) / 10
  if (r >= 0.5) return 'highsec'
  if (r > 0.0) return 'lowsec'
  return 'nullsec'
}

function _formatSystem(sysId, jumpNumber, distanceLy = 0, jumpType = 'capital') {
  const data = getNavigationData()
  const sys = data.systems[sysId]
  const region = data.regions[sys.r]
  return {
    jump_number: jumpNumber,
    solar_system_id: sysId,
    solar_system_name: sys.n,
    solar_system_name_zh: sys.nz,
    security: Math.round(sys.s * 10) / 10,
    security_class: _getSecurityClass(sys.s),
    region_name: locName(region),
    distance_ly: Math.round(distanceLy * 100) / 100,
    jump_type: jumpType,
  }
}

function _capitalBfs(startId, endId, rangeSq, avoid) {
  const data = getNavigationData()
  const start = data.systems[startId]
  const end = data.systems[endId]

  const dx = end.x - start.x, dy = end.y - start.y, dz = end.z - start.z
  const distSq = dx * dx + dy * dy + dz * dz
  if (distSq <= rangeSq) {
    return [[startId, 0], [endId, Math.sqrt(distSq)]]
  }

  const visited = new Set([startId])
  const queue = [[startId, start.x, start.y, start.z]]
  const cameFrom = new Map([[startId, null]])
  let head = 0

  while (head < queue.length) {
    const [curId, cx, cy, cz] = queue[head++]

    for (const cand of _jumpCandidates) {
      if (visited.has(cand.id)) continue
      if (avoid && avoid.has(cand.id) && cand.id !== endId) continue

      const dx2 = cand.x - cx, dy2 = cand.y - cy, dz2 = cand.z - cz
      const dSq = dx2 * dx2 + dy2 * dy2 + dz2 * dz2

      if (dSq <= rangeSq) {
        const dist = Math.sqrt(dSq)
        visited.add(cand.id)
        cameFrom.set(cand.id, [curId, dist])
        queue.push([cand.id, cand.x, cand.y, cand.z])

        if (cand.id === endId) {
          const path = []
          let cur = endId
          while (cur != null) {
            const entry = cameFrom.get(cur)
            if (entry === null) { path.push([cur, 0]); break }
            path.push([cur, entry[1]])
            cur = entry[0]
          }
          path.reverse()
          return path
        }
      }
    }
  }
  return null
}

function _gateBfs(startId, endId, highsecOnly = false, avoid = null) {
  const data = getNavigationData()
  if (startId === endId) return [startId]

  const visited = new Set([startId])
  const queue = [[startId, [startId]]]
  let head = 0

  while (head < queue.length) {
    const [curId, path] = queue[head++]
    const neighbors = _gateGraph.get(curId) || []

    for (const nid of neighbors) {
      if (visited.has(nid)) continue
      if (avoid && avoid.has(nid) && nid !== endId) continue

      if (highsecOnly && nid !== endId) {
        const nSec = Math.round(data.systems[nid].s * 10) / 10
        if (nSec < 0.5) continue
      }

      visited.add(nid)
      const newPath = [...path, nid]
      if (nid === endId) return newPath
      queue.push([nid, newPath])
    }
  }
  return null
}

function _findLandingCandidates(destId, highsecOnly = false, maxCandidates = 20, avoid = null) {
  const data = getNavigationData()
  const candidates = []
  const visited = new Set([destId])
  const queue = [[destId, 0]]
  let head = 0

  while (head < queue.length && candidates.length < maxCandidates) {
    const [curId, dist] = queue[head++]
    const neighbors = _gateGraph.get(curId) || []

    for (const nid of neighbors) {
      if (visited.has(nid)) continue
      if (avoid && avoid.has(nid)) continue
      visited.add(nid)

      const nSec = Math.round(data.systems[nid].s * 10) / 10
      const newDist = dist + 1

      if (nSec < 0.5) {
        candidates.push([nid, newDist])
        if (!highsecOnly) queue.push([nid, newDist])
      } else {
        queue.push([nid, newDist])
      }
    }
  }
  return candidates
}

function _planHighsecDest(startId, endId, jumpRangeLy, avoid) {
  const rangeSq = jumpRangeLy * jumpRangeLy
  const options = []

  for (const [optHighsec, label, desc] of [
    [false, '最短路线', '跳跃至最近低安/零安，最短星门路线到达'],
    [true, '纯高安路线', '跳跃至最近低安/零安，仅经高安星门到达'],
  ]) {
    const candidates = _findLandingCandidates(endId, optHighsec, 20, avoid)
    let best = null

    for (const [landingId, gateJumps] of candidates) {
      const capitalPath = _capitalBfs(startId, landingId, rangeSq, avoid)
      if (!capitalPath) continue

      const capitalJumps = capitalPath.length - 1
      const totalCost = capitalJumps + gateJumps

      if (best === null || totalCost < best.totalCost) {
        const gatePath = _gateBfs(landingId, endId, optHighsec, avoid)
        if (!gatePath) continue
        best = { totalCost, capitalPath, gatePath, capitalJumps, gateJumps: gatePath.length - 1 }
      }
    }

    if (!best) {
      options.push({ label, description: desc, error: `在 ${jumpRangeLy} 光年跳跃范围内无法找到${label}` })
      continue
    }

    let totalDist = 0
    const capitalRoute = best.capitalPath.map(([sysId, dist], i) => {
      totalDist += dist
      return _formatSystem(sysId, i, dist, i === 0 ? 'start' : 'capital')
    })

    const gateRoute = best.gatePath.slice(1).map((sysId, i) =>
      _formatSystem(sysId, i, 0, 'gate')
    )

    options.push({
      label, description: desc,
      capital_route: capitalRoute,
      gate_route: gateRoute,
      capital_jumps: best.capitalJumps,
      gate_jumps: best.gateJumps,
      total_distance_ly: Math.round(totalDist * 100) / 100,
    })
  }

  return { highsec_destination: true, options }
}

export function findRoute(startName, destinationName, jumpRangeLy = 7.0, avoidSystems = []) {
  _init()
  const data = getNavigationData()
  if (!data) return { error: '导航数据未加载' }

  const resolve = (name) => {
    const nl = name.toLowerCase().trim()
    for (const [sidStr, sys] of Object.entries(data.systems)) {
      if (sys.n.toLowerCase() === nl) return parseInt(sidStr)
      if (sys.nz && sys.nz === name) return parseInt(sidStr)
    }
    return null
  }

  const startId = resolve(startName)
  const endId = resolve(destinationName)
  if (startId == null) return { error: `未找到星系: ${startName}` }
  if (endId == null) return { error: `未找到星系: ${destinationName}` }

  let avoid = new Set(avoidSystems)
  avoid.delete(startId)
  avoid.delete(endId)
  if (avoid.size === 0) avoid = null

  const endSec = Math.round(data.systems[endId].s * 10) / 10
  if (endSec >= 0.5) return _planHighsecDest(startId, endId, jumpRangeLy, avoid)

  if (startId === endId) {
    return {
      route: [_formatSystem(startId, 0, 0, 'start')],
      total_jumps: 0,
      total_distance_ly: 0,
    }
  }

  const rangeSq = jumpRangeLy * jumpRangeLy
  const path = _capitalBfs(startId, endId, rangeSq, avoid)
  if (!path) return { error: `在 ${jumpRangeLy} 光年跳跃范围内无法找到路线` }

  let totalDist = 0
  const route = path.map(([sysId, dist], i) => {
    totalDist += dist
    return _formatSystem(sysId, i, dist, i === 0 ? 'start' : 'capital')
  })

  return {
    route,
    total_jumps: route.length - 1,
    total_distance_ly: Math.round(totalDist * 100) / 100,
  }
}
