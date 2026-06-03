/**
 * Tiny industry-data fixture for tests.
 *
 * Shape mirrors the runtime JSON from `public/data/industry-*.json`
 * after loader normalization (short keys: n, nz, g, v, ps).
 *
 * Includes a 2-level manufacturing chain:
 *   Rifter (typeId 587) blueprint 588 needs: Tritanium 34, Mexallon 12
 *   Construction Block (3828) blueprint 1019 reaction needs: Carbon-86 0 (placeholder)
 */
export const industryFixture = {
  types: {
    34: { n: 'Tritanium', nz: '三钛合金', g: 18, v: 0.01 },
    36: { n: 'Mexallon', nz: '类晶体胶矿', g: 18, v: 0.01 },
    587: { n: 'Rifter', nz: '裂谷级', g: 25, v: 27289 },
    588: { n: 'Rifter Blueprint', nz: '裂谷级蓝图', g: 105, v: 0.01 },
    11399: { n: 'Morphite', nz: '吗啡石', g: 18, v: 0.01 },
    // Special edition: should be filtered from search
    33397: { n: 'Apotheosis', g: 25, v: 1000 },
    // OLD prefix: should be filtered
    99999: { n: 'OLD Foo', g: 25, v: 1 },
  },
  groups: {
    18: { n: 'Mineral' },
    25: { n: 'Frigate' },
    105: { n: 'Blueprint' },
  },
  materials: {
    // Rifter BP: activity 1 (manufacturing) needs Tritanium ×34, Mexallon ×12
    588: {
      1: [[34, 34], [36, 12]],
    },
  },
  // Maps product → its source blueprint+qty
  products: {
    1: {
      587: [588, 1],
    },
  },
  // Reverse lookup: bp → product
  productsByBp: {
    588: { 1: [587, 1] },
  },
  blueprints: {
    588: { ml: 10 },  // max runs per copy
  },
  activities: {
    588: { 1: { t: 1800 } },  // 30 min manufacture
  },
}
