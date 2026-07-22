/**
 * Alliance PvP activity + member counts from zKillboard.
 *
 * zKillboard is Tranquility (world server) ONLY — Serenity (国服) has no
 * equivalent CORS-friendly JSON API, so callers should guard on datasource.
 * The stats endpoint returns memberCount plus `activepvp` (distinct
 * characters/corps/kills seen on killmails over the trailing ~7 days).
 * CORS is open (`access-control-allow-origin: *`), so this works from the
 * browser with no backend.
 */

const cache = new Map() // allianceId -> resolved stats (or in-flight Promise)

export function fetchAlliancePvpStats(allianceId) {
  if (cache.has(allianceId)) return cache.get(allianceId)

  const p = fetch(`https://zkillboard.com/api/stats/allianceID/${allianceId}/`, {
    headers: { Accept: 'application/json' },
  })
    .then((resp) => {
      if (!resp.ok) throw new Error(`zkill ${resp.status}`)
      return resp.json()
    })
    .then((d) => {
      const stats = {
        members: d?.info?.memberCount ?? null,
        corps: d?.info?.corpCount ?? null,
        activePvp: d?.activepvp?.characters?.count ?? null,
        activeCorps: d?.activepvp?.corporations?.count ?? null,
        kills7d: d?.activepvp?.kills?.count ?? null,
      }
      cache.set(allianceId, stats) // replace the Promise with the resolved value
      return stats
    })
    .catch((e) => {
      cache.delete(allianceId) // allow retry later
      throw e
    })

  cache.set(allianceId, p)
  return p
}
