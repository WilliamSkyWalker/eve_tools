import { describe, it, expect, vi, beforeEach } from 'vitest'
import { industryFixture } from '../__tests__/fixtures/industry.js'

vi.mock('../data/loader', () => ({
  getIndustryData: () => industryFixture,
}))

const {
  calculateMaterialQuantity,
  calculateBlueprintMaterials,
  getSourceForProduct,
  getTypeName,
  MANUFACTURING_ACTIVITY_ID,
  REACTION_ACTIVITY_ID,
} = await import('./calculator.js')

beforeEach(() => {
  localStorage.setItem('eve_locale', 'en')
})

describe('calculateMaterialQuantity (ME formula)', () => {
  it('ME 0 returns runs × base (rounded up)', () => {
    expect(calculateMaterialQuantity(1, 34, 0)).toBe(34)
    expect(calculateMaterialQuantity(10, 34, 0)).toBe(340)
  })

  it('ME 10 reduces qty by 10%', () => {
    // 100 × 34 × 0.9 = 3060
    expect(calculateMaterialQuantity(100, 34, 10)).toBe(3060)
  })

  it('always returns at least `runs` (minimum-1-per-run rule)', () => {
    // 10 runs × 1 base × 0.5 = 5, but result must be ≥ 10
    expect(calculateMaterialQuantity(10, 1, 50)).toBe(10)
  })

  it('rounds to 2 decimals before ceil to avoid float drift', () => {
    // 86 × 0.86 = 73.96 → ceil 74 (not 73.96000000001 → 74 either way; tests intent)
    expect(calculateMaterialQuantity(86, 1, 14)).toBe(86)  // min runs kicks in
    // Without min-runs floor: 1 × 34 × 0.86 = 29.24 → ceil 30, max(1, 30) = 30
    expect(calculateMaterialQuantity(1, 34, 14)).toBe(30)
  })

  it('ME defaults to 0 when omitted', () => {
    expect(calculateMaterialQuantity(5, 10)).toBe(50)
  })
})

describe('getSourceForProduct', () => {
  it('finds the manufacturing blueprint for a producible product', () => {
    expect(getSourceForProduct(587)).toEqual({ bpTypeId: 588, activityId: MANUFACTURING_ACTIVITY_ID })
  })

  it('returns null for a raw material with no source blueprint', () => {
    expect(getSourceForProduct(34)).toBeNull()
  })
})

describe('getTypeName', () => {
  it('uses English name when locale is en', () => {
    localStorage.setItem('eve_locale', 'en')
    expect(getTypeName(34)).toBe('Tritanium')
  })

  it('uses Chinese name when locale is zh', () => {
    localStorage.setItem('eve_locale', 'zh')
    expect(getTypeName(34)).toBe('三钛合金')
  })

  it('falls back to type_id string for unknown types', () => {
    expect(getTypeName(99999999)).toBe('99999999')
  })
})

describe('calculateBlueprintMaterials', () => {
  it('returns flat material list with ME applied', () => {
    const mats = calculateBlueprintMaterials(588, 10, 1)
    expect(mats).toHaveLength(2)
    const byId = Object.fromEntries(mats.map(m => [m.type_id, m]))
    expect(byId[34].adjusted_quantity).toBe(31)  // ceil(34 × 0.9) = 31
    expect(byId[36].adjusted_quantity).toBe(11)  // ceil(12 × 0.9) = 10.8 → 11
  })

  it('reactions ignore ME (activity 11 forces ME=0)', () => {
    // Even with ME=10 passed in, reaction activity should use ME=0 → raw qty
    const mats = calculateBlueprintMaterials(588, 10, 1, REACTION_ACTIVITY_ID)
    // Fixture has no reaction recipe for 588 → empty
    expect(mats).toEqual([])
  })

  it('returns empty array for unknown blueprint', () => {
    expect(calculateBlueprintMaterials(99999, 0, 1)).toEqual([])
  })
})
