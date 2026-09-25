import type { PbBaseline } from '@/src/types/personalBrand'

/**
 * Median of a set of numbers, ignoring null/undefined/non-finite values.
 * Median over mean deliberately — per the Content OS design, social
 * performance data has large outliers (one viral post shouldn't drag the
 * "typical" number up for every future comparison). Returns null when
 * there's nothing usable to compute from (never NaN).
 */
export function median(values: (number | null | undefined)[]): number | null {
  const clean = values.filter((v): v is number => v !== null && v !== undefined && Number.isFinite(v))
  if (clean.length === 0) return null

  const sorted = [...clean].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)

  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

export interface BaselineInput {
  views: number | null | undefined
  engagementRate: number | null | undefined
  saveRate: number | null | undefined
  followConversion: number | null | undefined
  dmConversion: number | null | undefined
}

/**
 * Builds a baseline (sample size + medians) from a set of already-
 * calculated rates — one row per content item, typically its latest
 * snapshot's rates (see src/lib/personal-brand/metrics.ts). Deliberately
 * dumb: no weighting, no recency decay, no statistics framework — just
 * "how many posts, and what's the median" — per the Content OS's stated
 * V1 scope. Callers are responsible for filtering the input set down to
 * whatever cohort the baseline should represent (whole account, one
 * content type, one format, one topic, a recent window, ...).
 */
export function buildBaseline(rows: BaselineInput[]): PbBaseline {
  return {
    sampleSize: rows.length,
    medianViews: median(rows.map((r) => r.views)),
    medianEngagementRate: median(rows.map((r) => r.engagementRate)),
    medianSaveRate: median(rows.map((r) => r.saveRate)),
    medianFollowConversion: median(rows.map((r) => r.followConversion)),
    medianDmConversion: median(rows.map((r) => r.dmConversion)),
  }
}

/** Below this many data points, evidence is treated as too thin to
 * highlight as a "winning" pattern anywhere in the UI — surfaced instead
 * as "not enough data yet." Applies uniformly across dashboard, Winning
 * Formats, and AI context so the same threshold means the same thing
 * everywhere. */
export const MIN_SAMPLE_SIZE_FOR_CONFIDENCE = 5

export function hasEnoughEvidence(sampleSize: number): boolean {
  return sampleSize >= MIN_SAMPLE_SIZE_FOR_CONFIDENCE
}

/**
 * Percent difference of `value` vs. `baseline`, or null if either is
 * missing/zero (a baseline of 0 makes "% above baseline" meaningless,
 * not infinite).
 */
export function percentVsBaseline(value: number | null, baseline: number | null): number | null {
  if (value === null || baseline === null) return null
  if (baseline <= 0) return null
  if (!Number.isFinite(value) || !Number.isFinite(baseline)) return null
  const result = ((value - baseline) / baseline) * 100
  return Number.isFinite(result) ? result : null
}
