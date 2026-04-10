/**
 * Compute fitting statistics from calculated dogma attributes.
 *
 * Key attribute IDs:
 *   CPU: 48 (output), 50 (usage). PG: 11 (output), 30 (usage). Cal: 1132 (output), 1153 (usage)
 *   Shield: 263, Armor: 265, Hull: 9. Shield recharge: 479
 *   Resist (resonance multipliers): shield(271=em,274=th,273=ki,272=ex) armor(267,270,269,268) hull(113,110,111,109)
 *   Speed: 37, Mass: 4, Agility: 70, Warp speed: 600, Sig radius: 552
 *   Cap: 482 (capacity), 55 (recharge ms)
 *   Targeting: 76 (range), 564 (scan res), 192 (max targets)
 *   Turret: 64 (damage mult), 51 (RoF ms), 114/118/117/116 (em/th/ki/ex dmg on charge)
 *   Drone: 64 (dmg mult), 51 (RoF ms), 114/118/117/116 (dmg), 1271 (ship bandwidth)
 *   Module: 6 (activation cost / cap need), 73 (duration ms)
 */

const A = {
  cpuOutput: 48, cpu: 50, pgOutput: 11, pg: 30, calOutput: 1132, cal: 1153,
  shieldHp: 263, armorHp: 265, hullHp: 9, shieldRecharge: 479,
  shieldEm: 271, shieldTh: 274, shieldKi: 273, shieldEx: 272,
  armorEm: 267, armorTh: 270, armorKi: 269, armorEx: 268,
  hullEm: 113, hullTh: 110, hullKi: 111, hullEx: 109,
  maxVelocity: 37, mass: 4, agility: 70, warpSpeed: 600, sigRadius: 552,
  capCapacity: 482, capRecharge: 55,
  maxTargetRange: 76, scanRes: 564, maxTargets: 192,
  dmgMult: 64, rof: 51,
  emDmg: 114, thDmg: 118, kiDmg: 117, exDmg: 116,
  droneBw: 1271,
  capNeed: 6, duration: 73,
  missileDmgMult: 212,
}

function g(map, id, fallback = 0) {
  return map?.get(id) ?? fallback
}

export function computeStats(calc, data) {
  if (!calc?.shipAttrs) return {}
  const s = calc.shipAttrs
  const get = (id) => g(s, id, data.attrs[id]?.dv ?? 0)

  // ── Fitting ──
  const cpuTotal = get(A.cpuOutput)
  const pgTotal = get(A.pgOutput)
  const calTotal = get(A.calOutput) || 400
  let cpuUsed = 0, pgUsed = 0, calUsed = 0
  if (calc.modules) {
    for (const m of calc.modules) {
      cpuUsed += g(m.attrs, A.cpu)
      pgUsed += g(m.attrs, A.pg)
      calUsed += g(m.attrs, A.cal)
    }
  }

  // ── Defense ──
  const shieldHp = get(A.shieldHp)
  const armorHp = get(A.armorHp)
  const hullHp = get(A.hullHp)
  const resist = (id) => 1 - get(id)
  const shieldEm = resist(A.shieldEm), shieldTh = resist(A.shieldTh), shieldKi = resist(A.shieldKi), shieldEx = resist(A.shieldEx)
  const armorEm = resist(A.armorEm), armorTh = resist(A.armorTh), armorKi = resist(A.armorKi), armorEx = resist(A.armorEx)
  const hullEm = resist(A.hullEm), hullTh = resist(A.hullTh), hullKi = resist(A.hullKi), hullEx = resist(A.hullEx)
  const avgResist = (em, th, ki, ex) => (em + th + ki + ex) / 4
  const ehp = shieldHp / (1 - avgResist(shieldEm, shieldTh, shieldKi, shieldEx))
    + armorHp / (1 - avgResist(armorEm, armorTh, armorKi, armorEx))
    + hullHp / (1 - avgResist(hullEm, hullTh, hullKi, hullEx))

  // ── Navigation ──
  const maxVelocity = get(A.maxVelocity)
  const mass = get(A.mass)
  const agility = get(A.agility)
  const alignTime = mass > 0 && agility > 0 ? -Math.log(0.25) * agility * mass / 1000000 : 0
  const warpSpeed = get(A.warpSpeed) || 3
  const sigRadius = get(A.sigRadius)

  // ── Offense: DPS ──
  let turretDps = 0, turretVolley = 0
  let missileDps = 0, missileVolley = 0
  let droneDps = 0, droneVolley = 0

  if (calc.modules) {
    for (const m of calc.modules) {
      if (m.isTurret && m.chargeAttrs) {
        const { dps, volley } = calcTurretDps(m)
        turretDps += dps
        turretVolley += volley
      } else if (m.isLauncher && m.chargeAttrs) {
        const { dps, volley } = calcMissileDps(m)
        missileDps += dps
        missileVolley += volley
      }
    }
  }

  if (calc.drones) {
    for (const d of calc.drones) {
      const { dps, volley } = calcDroneDps(d)
      droneDps += dps * d.count
      droneVolley += volley * d.count
    }
  }

  const totalDps = turretDps + missileDps + droneDps
  const totalVolley = turretVolley + missileVolley + droneVolley

  // ── Capacitor ──
  const capTotal = get(A.capCapacity)
  const capRechargeMs = get(A.capRecharge)

  // Sum module cap usage per second
  let capUsagePerSec = 0
  if (calc.modules) {
    for (const m of calc.modules) {
      const capNeed = g(m.attrs, A.capNeed)
      const dur = g(m.attrs, A.duration) || g(m.attrs, A.rof)  // duration or rate of fire
      if (capNeed > 0 && dur > 0) {
        capUsagePerSec += capNeed / (dur / 1000)
      }
    }
  }

  // Peak recharge rate: at 25% cap, rate = 10*C/tau * (sqrt(0.25) - 0.25) ≈ 2.5*C/tau
  const peakRecharge = capRechargeMs > 0 ? 10 * capTotal / (capRechargeMs / 1000) * (Math.sqrt(0.25) - 0.25) : 0

  // Cap stability: simulate to find stable percentage or time to empty
  const { capStable, capStablePct, capLastsSec } = simulateCap(capTotal, capRechargeMs, capUsagePerSec)

  // ── Targeting ──
  const targetRange = get(A.maxTargetRange)
  const scanRes = get(A.scanRes)
  const maxTargets = get(A.maxTargets)

  return {
    cpuUsed, cpuTotal, pgUsed, pgTotal, calUsed, calTotal,
    shieldHp, armorHp, hullHp, ehp,
    shieldEm, shieldTh, shieldKi, shieldEx,
    armorEm, armorTh, armorKi, armorEx,
    hullEm, hullTh, hullKi, hullEx,
    maxVelocity, alignTime, warpSpeed, sigRadius,
    capTotal, capRecharge: capRechargeMs, capUsagePerSec, peakRecharge,
    capStable, capStablePct, capLastsSec,
    targetRange, scanRes, maxTargets,
    turretDps, missileDps, droneDps, totalDps,
    turretVolley, missileVolley, droneVolley, totalVolley,
  }
}

// ── Turret DPS ──
// volley = (em + th + ki + ex) * damageMultiplier
// dps = volley / (rateOfFire / 1000)
function calcTurretDps(mod) {
  const charge = mod.chargeAttrs
  const em = g(charge, A.emDmg)
  const th = g(charge, A.thDmg)
  const ki = g(charge, A.kiDmg)
  const ex = g(charge, A.exDmg)
  const dmgMult = g(mod.attrs, A.dmgMult, 1)
  const rof = g(mod.attrs, A.rof, 1000)
  const volley = (em + th + ki + ex) * dmgMult
  const dps = rof > 0 ? volley / (rof / 1000) : 0
  return { dps, volley }
}

// ── Missile DPS ──
// volley = (em + th + ki + ex) * missileDamageMultiplier
// dps = volley / (rateOfFire / 1000)
function calcMissileDps(mod) {
  const charge = mod.chargeAttrs
  const em = g(charge, A.emDmg)
  const th = g(charge, A.thDmg)
  const ki = g(charge, A.kiDmg)
  const ex = g(charge, A.exDmg)
  const dmgMult = g(mod.attrs, A.missileDmgMult, 1) || g(mod.attrs, A.dmgMult, 1)
  const rof = g(mod.attrs, A.rof, 1000)
  const volley = (em + th + ki + ex) * dmgMult
  const dps = rof > 0 ? volley / (rof / 1000) : 0
  return { dps, volley }
}

// ── Drone DPS ──
// volley = (em + th + ki + ex) * damageMultiplier
// dps = volley / (rateOfFire / 1000)
function calcDroneDps(drone) {
  const a = drone.attrs
  const em = g(a, A.emDmg)
  const th = g(a, A.thDmg)
  const ki = g(a, A.kiDmg)
  const ex = g(a, A.exDmg)
  const dmgMult = g(a, A.dmgMult, 1)
  const rof = g(a, A.rof, 1000)
  const volley = (em + th + ki + ex) * dmgMult
  const dps = rof > 0 ? volley / (rof / 1000) : 0
  return { dps, volley }
}

// ── Cap Simulation ──
// EVE cap recharge: C(t) = Cmax * (1 - sqrt(cap_pct))^2  ... actually:
// dC/dt = 10 * Cmax / tau * (sqrt(pct) - pct)  where pct = C/Cmax, tau = rechargeTime(s)
// Simulate 1-second steps. If cap doesn't reach 0 in 10 minutes, it's stable.
function simulateCap(capMax, rechargeMs, usagePerSec) {
  if (capMax <= 0 || rechargeMs <= 0) return { capStable: true, capStablePct: 1, capLastsSec: Infinity }
  if (usagePerSec <= 0) return { capStable: true, capStablePct: 1, capLastsSec: Infinity }

  const tau = rechargeMs / 1000
  const maxTime = 600  // 10 minutes

  let cap = capMax
  let stableFound = false
  let prevCap = cap

  for (let t = 0; t < maxTime; t++) {
    const pct = cap / capMax
    const recharge = 10 * capMax / tau * (Math.sqrt(pct) - pct)
    cap = Math.max(0, Math.min(capMax, cap + recharge - usagePerSec))

    if (cap <= 0) {
      return { capStable: false, capStablePct: 0, capLastsSec: t + 1 }
    }

    // Check if stable (cap stopped changing significantly)
    if (Math.abs(cap - prevCap) < 0.01 && t > 10) {
      stableFound = true
      break
    }
    prevCap = cap
  }

  if (stableFound || cap > 0) {
    return { capStable: true, capStablePct: cap / capMax, capLastsSec: Infinity }
  }

  return { capStable: false, capStablePct: 0, capLastsSec: maxTime }
}
