import { describe, expect, it } from 'vitest'
import { buildBaseline, hasEnoughEvidence, median, percentVsBaseline } from './baselines'

describe('median', () => {
  it('computes the median of an odd-length set', () => {
    expect(median([1, 3, 2])).toBe(2)
  })

  it('averages the two middle values for an even-length set', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5)
  })

  it('ignores null/undefined values rather than treating them as zero', () => {
    expect(median([10, null, 20, undefined, 30])).toBe(20)
  })

  it('is resistant to a single large outlier the way a mean would not be', () => {
    const withOutlier = median([10, 12, 11, 9, 100000])
    expect(withOutlier).toBe(11)
  })

  it('returns null for an empty or all-null set', () => {
    expect(median([])).toBeNull()
    expect(median([null, undefined, null])).toBeNull()
  })
})

describe('buildBaseline', () => {
  it('reports sample size alongside every median', () => {
    const baseline = buildBaseline([
      { views: 1000, engagementRate: 0.1, saveRate: 0.02, followConversion: 0.01, dmConversion: 0.001 },
      { views: 2000, engagementRate: 0.2, saveRate: 0.04, followConversion: 0.02, dmConversion: 0.002 },
    ])

    expect(baseline.sampleSize).toBe(2)
    expect(baseline.medianViews).toBe(1500)
    expect(baseline.medianEngagementRate).toBe(0.15000000000000002)
  })

  it('returns an empty-but-safe baseline for zero content, never throwing', () => {
    const baseline = buildBaseline([])
    expect(baseline.sampleSize).toBe(0)
    expect(baseline.medianViews).toBeNull()
    expect(baseline.medianEngagementRate).toBeNull()
  })
})

describe('hasEnoughEvidence', () => {
  it('requires at least the minimum sample size', () => {
    expect(hasEnoughEvidence(0)).toBe(false)
    expect(hasEnoughEvidence(4)).toBe(false)
    expect(hasEnoughEvidence(5)).toBe(true)
    expect(hasEnoughEvidence(20)).toBe(true)
  })
})

describe('percentVsBaseline', () => {
  it('computes a positive percent difference above baseline', () => {
    expect(percentVsBaseline(150, 100)).toBe(50)
  })

  it('computes a negative percent difference below baseline', () => {
    expect(percentVsBaseline(50, 100)).toBe(-50)
  })

  it('returns null when the baseline is zero instead of Infinity', () => {
    expect(percentVsBaseline(50, 0)).toBeNull()
  })

  it('returns null when either input is missing', () => {
    expect(percentVsBaseline(null, 100)).toBeNull()
    expect(percentVsBaseline(50, null)).toBeNull()
  })
})
