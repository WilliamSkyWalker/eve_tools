import { describe, it, expect, vi, beforeEach } from 'vitest'
import { industryFixture } from '../__tests__/fixtures/industry.js'

vi.mock('../data/loader', () => ({ getIndustryData: () => industryFixture }))

const { buildBomTree, aggregateRawMaterials } = await import('./bom.js')

beforeEach(() => {
  localStorage.setItem('eve_locale', 'en')
})

describe('buildBomTree', () => {
  it('builds a single-level tree at ME 0 (no expansion since raw mats have no blueprint)', () => {
    const tree = buildBomTree(588, 0, 1)
    expect(tree).toMatchObject({
      type_id: 587,
      quantity: 1,
      me_level: 0,
      activity_id: 1,
    })
    expect(tree.children).toHaveLength(2)
    const byId = Object.fromEntries(tree.children.map(c => [c.type_id, c]))
    expect(byId[34].quantity).toBe(34)
    expect(byId[36].quantity).toBe(12)
    // Raw minerals are not manufacturable in the fixture
    expect(byId[34].is_manufacturable).toBe(false)
    expect(byId[34].children).toEqual([])
  })

  it('applies ME to direct materials', () => {
    const tree = buildBomTree(588, 10, 1)
    const byId = Object.fromEntries(tree.children.map(c => [c.type_id, c]))
    expect(byId[34].quantity).toBe(31)  // ceil(34 × 0.9)
    expect(byId[36].quantity).toBe(11)
  })

  it('scales product quantity by runs', () => {
    const tree = buildBomTree(588, 0, 5)
    expect(tree.quantity).toBe(5)  // portion 1 × 5 runs
    const byId = Object.fromEntries(tree.children.map(c => [c.type_id, c]))
    expect(byId[34].quantity).toBe(170)  // 5 × 34 (ME 0)
  })

  it('returns null for unknown blueprint', () => {
    expect(buildBomTree(99999, 0, 1)).toBeNull()
  })
})

describe('aggregateRawMaterials', () => {
  it('sums leaf-node quantities across the tree (returned as {tid: {type_name, total_quantity}})', () => {
    const tree = buildBomTree(588, 0, 10)
    const raw = aggregateRawMaterials(tree)
    // 10 runs × 34 = 340 Tritanium, 10 × 12 = 120 Mexallon
    expect(raw[34].total_quantity).toBe(340)
    expect(raw[36].total_quantity).toBe(120)
    expect(raw[34].type_name).toBe('Tritanium')
  })
})
