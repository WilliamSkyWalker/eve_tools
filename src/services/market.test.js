import { describe, it, expect, vi } from 'vitest'

// resolveItemNames caches `_nameLookup` on the object it gets back, so hand out
// one stable clone instead of mutating the shared fixture.
vi.mock('../data/loader', async () => {
  const { industryFixture } = await import('../__tests__/fixtures/industry.js')
  const data = { ...industryFixture }
  return { getIndustryData: () => data }
})
vi.mock('./esiClient', () => ({ getOrderPricesForTypes: vi.fn() }))

const { parseMaterialText, resolveItemNames } = await import('./market.js')

describe('parseMaterialText', () => {
  it('parses tab-separated lines (EVE inventory paste)', () => {
    const out = parseMaterialText('Tritanium\t1000\tMineral\nMexallon\t500\tMineral')
    expect(out).toEqual([
      { name: 'Tritanium', quantity: 1000 },
      { name: 'Mexallon', quantity: 500 },
    ])
  })

  it('finds quantity in any column after the first', () => {
    // EVE asset window: "Name\tGroup\t\tQty"
    const out = parseMaterialText('Tritanium\tMineral\t\t12345')
    expect(out).toEqual([{ name: 'Tritanium', quantity: 12345 }])
  })

  it('parses space-separated lines', () => {
    const out = parseMaterialText('Tritanium 1000\nMexallon 500')
    expect(out).toEqual([
      { name: 'Tritanium', quantity: 1000 },
      { name: 'Mexallon', quantity: 500 },
    ])
  })

  it('parses "Name xN" / "Name ×N" suffix', () => {
    expect(parseMaterialText('Rifter x2')).toEqual([{ name: 'Rifter', quantity: 2 }])
    expect(parseMaterialText('裂谷级 ×3')).toEqual([{ name: '裂谷级', quantity: 3 }])
  })

  it('treats name-only lines as quantity null', () => {
    expect(parseMaterialText('Rifter')).toEqual([{ name: 'Rifter', quantity: null }])
  })

  it('handles thousands separators in quantity', () => {
    expect(parseMaterialText('Tritanium\t1,000,000')).toEqual([{ name: 'Tritanium', quantity: 1000000 }])
    expect(parseMaterialText('Tritanium 1 000 000')).toEqual([{ name: 'Tritanium', quantity: 1000000 }])
  })

  it('skips blank lines', () => {
    const out = parseMaterialText('\n\nTritanium\t10\n\n')
    expect(out).toEqual([{ name: 'Tritanium', quantity: 10 }])
  })

  it('returns empty array for empty input', () => {
    expect(parseMaterialText('')).toEqual([])
  })

  it('strips zero-width / bidi characters smuggled in by copy-paste', () => {
    // ZWSP inside the name, BOM before the quantity
    expect(parseMaterialText('Tri\u200Btanium\t\uFEFF1000')).toEqual([
      { name: 'Tritanium', quantity: 1000 },
    ])
    // ZWSP where the space separator should be — must not swallow the quantity
    expect(parseMaterialText('裂谷级\u200B 3')).toEqual([{ name: '裂谷级', quantity: 3 }])
  })

  it('accepts full-width digits in the quantity column', () => {
    expect(parseMaterialText('Tritanium\t１０００')).toEqual([
      { name: 'Tritanium', quantity: 1000 },
    ])
  })
})

describe('resolveItemNames', () => {
  it('matches English names case-insensitively and Chinese names exactly', () => {
    expect(resolveItemNames(['tRiTaNiUm', '裂谷级']).map(r => r.type_id)).toEqual([34, 587])
  })

  it('matches despite invisible characters in the pasted name', () => {
    const out = resolveItemNames(['裂谷\u200B级', '\uFEFFTritanium\u00AD'])
    expect(out.map(r => r.type_id)).toEqual([587, 34])
    expect(out.every(r => r.matched)).toBe(true)
  })

  it('matches despite NBSP and doubled spaces', () => {
    expect(resolveItemNames(['Rifter  Blueprint', 'Rifter\u00A0Blueprint']).map(r => r.type_id))
      .toEqual([588, 588])
  })

  it('reports unmatched names without a type_id', () => {
    expect(resolveItemNames(['Not A Real Item'])).toEqual([
      { name: 'Not A Real Item', type_id: null, type_name: null, volume: null, matched: false },
    ])
  })
})
