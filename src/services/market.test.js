import { describe, it, expect, vi } from 'vitest'

// resolveItemNames caches `_nameLookup` on the object it gets back, so hand out
// one stable clone instead of mutating the shared fixture.
vi.mock('../data/loader', async () => {
  const { industryFixture } = await import('../__tests__/fixtures/industry.js')
  const data = { ...industryFixture }
  return { getIndustryData: () => data }
})
vi.mock('./esiClient', () => ({ getOrderPricesForTypes: vi.fn() }))

const { parseMaterialText, resolveItemNames, mergeResolvedItems, marketCompare } = await import('./market.js')

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

  it('parses fitting-list quantity prefixes and skips section headings', () => {
    const text = [
      '高能量槽',
      '3x 双联千兆级脉冲激光器 II',
      '1x 帝国海军大型EMP立体炸弹',
      '中能量槽',
      '2x 旗舰级电容注电器 I',
      '低能量槽',
      '1x 损伤控制 II',
      '改装件插槽',
      '3x 旗舰级三角装甲聚合器 I',
      '弹药',
      '135x 电容注电器装料 400',
      '2x 最佳射程提升脚本',
    ].join('\n')

    expect(parseMaterialText(text)).toEqual([
      { name: '双联千兆级脉冲激光器 II', quantity: 3 },
      { name: '帝国海军大型EMP立体炸弹', quantity: 1 },
      { name: '旗舰级电容注电器 I', quantity: 2 },
      { name: '损伤控制 II', quantity: 1 },
      { name: '旗舰级三角装甲聚合器 I', quantity: 3 },
      { name: '电容注电器装料 400', quantity: 135 },
      { name: '最佳射程提升脚本', quantity: 2 },
    ])
  })

  it('accepts spaces, multiplication signs, and full-width digits in fitting prefixes', () => {
    expect(parseMaterialText('3 x Rifter\n２× 裂谷级')).toEqual([
      { name: 'Rifter', quantity: 3 },
      { name: '裂谷级', quantity: 2 },
    ])
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

describe('mergeResolvedItems', () => {
  it('merges duplicate rows and sums their quantities', () => {
    const parsed = parseMaterialText('Tritanium\t2\nTritanium\t3\nMexallon\t4')
    expect(mergeResolvedItems(parsed).map(item => [item.type_id, item.quantity])).toEqual([
      [34, 5],
      [36, 4],
    ])
  })

  it('merges aliases that resolve to the same type and counts name-only rows as one', () => {
    const parsed = parseMaterialText('Tritanium\n三钛合金\t2\nTritanium')
    expect(mergeResolvedItems(parsed)).toMatchObject([
      { type_id: 34, quantity: 4, matched: true },
    ])
  })

  it('merges repeated unmatched names using normalized lookup keys', () => {
    const parsed = parseMaterialText('Unknown Item\t2\nunknown  item\t3')
    expect(mergeResolvedItems(parsed)).toMatchObject([
      { name: 'Unknown Item', quantity: 5, matched: false },
    ])
  })
})

describe('marketCompare', () => {
  it('fetches and returns one priced row per merged item', async () => {
    const { getOrderPricesForTypes } = await import('./esiClient')
    getOrderPricesForTypes.mockResolvedValue({
      prices: { 34: { buy_price: 5, sell_price: 6 } },
      esiUnavailable: false,
    })

    const result = await marketCompare('Tritanium\t2\n三钛合金\t3')

    expect(getOrderPricesForTypes).toHaveBeenCalledWith([34], 'serenity')
    expect(result.items).toMatchObject([
      { type_id: 34, quantity: 5, buy_price: 5, sell_price: 6 },
    ])
  })
})
