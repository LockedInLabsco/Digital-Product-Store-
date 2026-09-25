import { describe, expect, it } from 'vitest'
import { calculateRates, formatRate, latestSnapshot, safeRate } from './metrics'

describe('safeRate', () => {
  it('divides normally when both values are present', () => {
    expect(safeRate(50, 1000)).toBe(0.05)
  })

  it('returns null for a zero or negative denominator instead of Infinity/NaN', () => {
    expect(safeRate(50, 0)).toBeNull()
    expect(safeRate(50, -10)).toBeNull()
  })

  it('returns null when either value is missing', () => {
    expect(safeRate(null, 1000)).toBeNull()
    expect(safeRate(undefined, 1000)).toBeNull()
    expect(safeRate(50, null)).toBeNull()
    expect(safeRate(50, undefined)).toBeNull()
  })

  it('never returns NaN or Infinity', () => {
    const result = safeRate(50, 0)
    expect(Number.isNaN(result)).toBe(false)
    expect(result === Infinity || result === -Infinity).toBe(false)
  })
})

describe('calculateRates', () => {
  it('computes every rate from a full snapshot', () => {
    const rates = calculateRates({
      views: 1000,
      likes: 100,
      comments: 20,
      shares: 10,
      saves: 30,
      followers_gained: 5,
      dms_generated: 2,
    })

    expect(rates.likeRate).toBe(0.1)
    expect(rates.commentRate).toBe(0.02)
    expect(rates.shareRate).toBe(0.01)
    expect(rates.saveRate).toBe(0.03)
    expect(rates.followConversion).toBe(0.005)
    expect(rates.dmConversion).toBe(0.002)
    expect(rates.engagementRate).toBe(0.16)
  })

  it('handles a zero-views snapshot without NaN/Infinity anywhere', () => {
    const rates = calculateRates({
      views: 0,
      likes: 10,
      comments: 0,
      shares: 0,
      saves: 0,
      followers_gained: 0,
      dms_generated: 0,
    })

    for (const value of Object.values(rates)) {
      expect(value).toBeNull()
    }
  })

  it('treats a fully empty snapshot as all-null, not zero', () => {
    const rates = calculateRates({
      views: null,
      likes: null,
      comments: null,
      shares: null,
      saves: null,
      followers_gained: null,
      dms_generated: null,
    })

    for (const value of Object.values(rates)) {
      expect(value).toBeNull()
    }
  })

  it('computes engagement rate from partial engagement fields without zeroing it out', () => {
    // Platform only reports likes + comments; shares/saves unknown for this snapshot.
    const rates = calculateRates({
      views: 1000,
      likes: 50,
      comments: 10,
      shares: null,
      saves: null,
      followers_gained: null,
      dms_generated: null,
    })

    expect(rates.engagementRate).toBe(0.06)
    expect(rates.shareRate).toBeNull()
    expect(rates.saveRate).toBeNull()
  })
})

describe('latestSnapshot', () => {
  it('returns null for an empty list', () => {
    expect(latestSnapshot([])).toBeNull()
  })

  it('picks the most recent by recorded_at', () => {
    const rows = [
      { id: 'a', recorded_at: '2026-01-01T00:00:00Z' },
      { id: 'b', recorded_at: '2026-01-10T00:00:00Z' },
      { id: 'c', recorded_at: '2026-01-05T00:00:00Z' },
    ]
    expect(latestSnapshot(rows)?.id).toBe('b')
  })
})

describe('formatRate', () => {
  it('formats a rate as a percentage', () => {
    expect(formatRate(0.0523)).toBe('5.23%')
  })

  it('renders an em dash for null instead of NaN%', () => {
    expect(formatRate(null)).toBe('—')
  })
})
