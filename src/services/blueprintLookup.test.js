import { describe, it, expect, vi, beforeEach } from 'vitest'
import { industryFixture } from '../__tests__/fixtures/industry.js'

vi.mock('../data/loader', () => ({ getIndustryData: () => industryFixture }))

const { searchBlueprints } = await import('./blueprintLookup.js')

beforeEach(() => {
  localStorage.setItem('eve_locale', 'en')
})

describe('searchBlueprints', () => {
  it('finds blueprints by English product name (case-insensitive)', () => {
    const results = searchBlueprints('rifter')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0]).toMatchObject({ product_type_id: 587, blueprint_type_id: 588 })
  })

  it('finds blueprints by Chinese product name', () => {
    localStorage.setItem('eve_locale', 'zh')
    const results = searchBlueprints('裂谷')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].product_type_id).toBe(587)
  })

  it('filters out AT-prize ships (Apotheosis)', () => {
    const results = searchBlueprints('Apotheosis')
    expect(results).toEqual([])
  })

  it('filters out OLD-prefixed products', () => {
    const results = searchBlueprints('OLD Foo')
    expect(results).toEqual([])
  })

  it('returns [] when query is empty', () => {
    expect(searchBlueprints('')).toEqual([])
  })

  it('honors the limit argument', () => {
    const results = searchBlueprints('r', 1)
    expect(results.length).toBeLessThanOrEqual(1)
  })
})
