import { describe, it, expect } from 'vitest'
import { stackingPenalty } from './dogmaEngine.js'

describe('stackingPenalty', () => {
  it('index 0 has no penalty (factor 1.0)', () => {
    expect(stackingPenalty(0)).toBe(1)
  })

  it('index 1 ≈ 0.869 (canonical EVE first-stack value)', () => {
    expect(stackingPenalty(1)).toBeCloseTo(0.8693, 3)
  })

  it('index 2 ≈ 0.571', () => {
    expect(stackingPenalty(2)).toBeCloseTo(0.5706, 3)
  })

  it('index 3 ≈ 0.283', () => {
    expect(stackingPenalty(3)).toBeCloseTo(0.2829, 3)
  })

  it('approaches 0 for large indices', () => {
    expect(stackingPenalty(8)).toBeLessThan(0.001)
  })

  it('strictly decreasing for non-negative indices', () => {
    for (let i = 1; i < 8; i++) {
      expect(stackingPenalty(i)).toBeLessThan(stackingPenalty(i - 1))
    }
  })
})
