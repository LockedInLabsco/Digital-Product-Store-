import type { PbCalculatedRates, PbContentMetric } from '@/src/types/personalBrand'

/**
 * Safe division for performance rates: null whenever the numerator or
 * denominator is missing, or the denominator is zero or negative — never
 * NaN or Infinity. A missing metric (platform doesn't expose it, or no
 * snapshot recorded yet) must read as "unknown," not as zero, which is
 * why this takes `number | null | undefined` rather than defaulting to 0.
 */
export function safeRate(numerator: number | null | undefined, denominator: number | null | undefined): number | null {
  if (numerator === null || numerator === undefined) return null
  if (denominator === null || denominator === undefined) return null
  if (denominator <= 0) return null
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return null
  const result = numerator / denominator
  return Number.isFinite(result) ? result : null
}

/**
 * Sums a set of nullable metric fields, treating missing ones as 0 —
 * appropriate for engagement rate's numerator (likes+comments+shares+saves),
 * where "this platform didn't report saves" should not zero out the whole
 * rate the way safeRate's numerator-must-exist rule would. Returns null
 * only when every input is null/undefined (nothing to sum).
 */
function sumKnown(...values: (number | null | undefined)[]): number | null {
  const known = values.filter((v): v is number => v !== null && v !== undefined && Number.isFinite(v))
  if (known.length === 0) return null
  return known.reduce((total, v) => total + v, 0)
}

/**
 * Calculates every deterministic performance rate for one metrics
 * snapshot, against `views` as the denominator (the metric every
 * platform reliably reports). All math is plain arithmetic — no AI
 * involvement, per the Content OS design: numbers are always computed
 * the same way from the same inputs.
 */
export function calculateRates(metric: Pick<
  PbContentMetric,
  'views' | 'likes' | 'comments' | 'shares' | 'saves' | 'followers_gained' | 'dms_generated'
>): PbCalculatedRates {
  const engagementNumerator = sumKnown(metric.likes, metric.comments, metric.shares, metric.saves)

  return {
    engagementRate: safeRate(engagementNumerator, metric.views),
    likeRate: safeRate(metric.likes, metric.views),
    commentRate: safeRate(metric.comments, metric.views),
    shareRate: safeRate(metric.shares, metric.views),
    saveRate: safeRate(metric.saves, metric.views),
    followConversion: safeRate(metric.followers_gained, metric.views),
    dmConversion: safeRate(metric.dms_generated, metric.views),
  }
}

/** The most recent snapshot by recorded_at — used wherever "current
 * performance" is needed (dashboard, content list, detail header). */
export function latestSnapshot<T extends { recorded_at: string }>(snapshots: T[]): T | null {
  if (snapshots.length === 0) return null
  return snapshots.reduce((latest, s) => (new Date(s.recorded_at) > new Date(latest.recorded_at) ? s : latest))
}

/** Formats a 0..1 rate as a percentage string, or an em dash when
 * unknown — never "NaN%" or "Infinity%". */
export function formatRate(rate: number | null, digits = 2): string {
  if (rate === null || !Number.isFinite(rate)) return '—'
  return `${(rate * 100).toFixed(digits)}%`
}
