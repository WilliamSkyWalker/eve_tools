import { describe, it, expect, vi } from 'vitest'

// market.js imports getIndustryData but parseMaterialText doesn't need data.
vi.mock('../data/loader', () => ({ getIndustryData: () => ({ types: {} }) }))
vi.mock('./esiClient', () => ({ getOrderPricesForTypes: vi.fn() }))

const { parseMaterialText } = await import('./market.js')

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
})
