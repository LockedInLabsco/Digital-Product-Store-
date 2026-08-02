import { describe, expect, it } from 'vitest'
import { resolveDateRange, percentChange } from './dateRange'

describe('resolveDateRange', () => {
  it('resolves the "today" preset to a same-day range', () => {
    const range = resolveDateRange({ preset: 'today' })
    expect(range).not.toBeNull()
    expect(range!.from.toDateString()).toBe(range!.to.toDateString())
  })

  it('resolves 7d/30d/90d to the expected span', () => {
    const sevenDays = resolveDateRange({ preset: '7d' })!
    const spanDays = Math.round((sevenDays.to.getTime() - sevenDays.from.getTime()) / 86400000)
    expect(spanDays).toBe(7) // today + 6 prior days = 7 calendar days, inclusive
  })

  it('computes a previous period of equal length', () => {
    const range = resolveDateRange({ preset: '7d' })!
    const currentSpan = range.to.getTime() - range.from.getTime()
    const previousSpan = range.previousTo.getTime() - range.previousFrom.getTime()
    expect(Math.abs(currentSpan - previousSpan)).toBeLessThan(2000) // within 2s (ms rounding)
    expect(range.previousTo.getTime()).toBeLessThan(range.from.getTime())
  })

  it('rejects a custom range with from after to', () => {
    const range = resolveDateRange({ preset: 'custom', from: '2026-02-01', to: '2026-01-01' })
    expect(range).toBeNull()
  })

  it('rejects a custom range without both dates', () => {
    expect(resolveDateRange({ preset: 'custom', from: '2026-01-01' })).toBeNull()
    expect(resolveDateRange({ preset: 'custom' })).toBeNull()
  })

  it('rejects malformed date strings rather than producing Invalid Date', () => {
    const range = resolveDateRange({ preset: 'custom', from: 'not-a-date', to: '2026-01-01' })
    expect(range).toBeNull()
  })

  it('rejects a custom range spanning more than ~400 days', () => {
    const range = resolveDateRange({ preset: 'custom', from: '2020-01-01', to: '2026-01-01' })
    expect(range).toBeNull()
  })

  it('accepts a reasonable custom range', () => {
    const range = resolveDateRange({ preset: 'custom', from: '2026-01-01', to: '2026-01-31' })
    expect(range).not.toBeNull()
  })
})

describe('percentChange', () => {
  it('computes a simple percentage increase', () => {
    expect(percentChange(150, 100)).toBe(50)
  })

  it('computes a simple percentage decrease', () => {
    expect(percentChange(50, 100)).toBe(-50)
  })

  it('treats 0 -> 0 as 0% change, not a divide-by-zero error', () => {
    expect(percentChange(0, 0)).toBe(0)
  })

  it('returns null when the previous period was zero but current is not (undefined % change)', () => {
    expect(percentChange(10, 0)).toBeNull()
  })
})
