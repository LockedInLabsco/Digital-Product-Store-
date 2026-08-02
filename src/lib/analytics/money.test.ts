import { describe, expect, it } from 'vitest'
import { parseAmountMinorUnits } from './money'

describe('parseAmountMinorUnits', () => {
  it('converts Paddle minor-unit strings to major units', () => {
    expect(parseAmountMinorUnits('500')).toBe(5)
    expect(parseAmountMinorUnits('1999')).toBe(19.99)
    expect(parseAmountMinorUnits('0')).toBe(0)
  })

  it('never lets bad revenue data crash a summation', () => {
    expect(parseAmountMinorUnits(null)).toBe(0)
    expect(parseAmountMinorUnits(undefined)).toBe(0)
    expect(parseAmountMinorUnits('')).toBe(0)
    expect(parseAmountMinorUnits('not-a-number')).toBe(0)
    expect(parseAmountMinorUnits('NaN')).toBe(0)
  })
})
