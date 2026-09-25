import { calculateRates, latestSnapshot } from './metrics'
import { buildBaseline, hasEnoughEvidence, type BaselineInput } from './baselines'
import type { PbContentItem, PbContentMetric, PbFormat } from '@/src/types/personalBrand'

/** One content item paired with its latest metrics snapshot (if any) and
 * that snapshot's calculated rates — the shared unit every dashboard/
 * Winning Formats calculation is built from, so "which snapshot counts
 * as current" is decided in exactly one place. */
export interface PerformanceRow {
  content: PbContentItem
  latestMetric: PbContentMetric | null
  rates: ReturnType<typeof calculateRates> | null
}

export function buildPerformanceRows(
  items: PbContentItem[],
  metricsByContentId: Record<string, PbContentMetric[]>
): PerformanceRow[] {
  return items.map((content) => {
    const snapshots = metricsByContentId[content.id] || []
    const latestMetric = latestSnapshot(snapshots)
    return {
      content,
      latestMetric,
      rates: latestMetric ? calculateRates(latestMetric) : null,
    }
  })
}

function toBaselineInput(row: PerformanceRow): BaselineInput {
  return {
    views: row.latestMetric?.views ?? null,
    engagementRate: row.rates?.engagementRate ?? null,
    saveRate: row.rates?.saveRate ?? null,
    followConversion: row.rates?.followConversion ?? null,
    dmConversion: row.rates?.dmConversion ?? null,
  }
}

/** Baseline over a cohort of rows — caller decides the cohort (whole
 * account, posted-only, one content type, recent window, ...). Rows
 * without a metrics snapshot yet still count toward nothing (their
 * values are null and median() ignores nulls), so an unmeasured draft
 * can't silently skew a baseline. */
export function baselineFromRows(rows: PerformanceRow[]) {
  return buildBaseline(rows.map(toBaselineInput))
}

export interface FormatEvidence {
  format: PbFormat
  sampleSize: number
  medianViews: number | null
  medianEngagementRate: number | null
  medianSaveRate: number | null
  medianFollowConversion: number | null
  medianDmConversion: number | null
  hasEnoughEvidence: boolean
  bestPost: { contentId: string; title: string | null; engagementRate: number | null } | null
}

/**
 * Historical evidence for every format that has at least one associated
 * posted content item with a metrics snapshot. Formats with zero
 * evidence are still included (sampleSize: 0, every median null) so the
 * Winning Formats page can show "no evidence yet" rather than silently
 * omitting a format that simply hasn't been used.
 */
export function buildFormatEvidence(formats: PbFormat[], rows: PerformanceRow[]): FormatEvidence[] {
  return formats.map((format) => {
    const formatRows = rows.filter((r) => r.content.format_id === format.id && r.latestMetric)
    const baseline = baselineFromRows(formatRows)

    let bestPost: FormatEvidence['bestPost'] = null
    for (const row of formatRows) {
      const rate = row.rates?.engagementRate ?? null
      if (rate !== null && (bestPost === null || (bestPost.engagementRate ?? -Infinity) < rate)) {
        bestPost = { contentId: row.content.id, title: row.content.title, engagementRate: rate }
      }
    }

    return {
      format,
      sampleSize: baseline.sampleSize,
      medianViews: baseline.medianViews,
      medianEngagementRate: baseline.medianEngagementRate,
      medianSaveRate: baseline.medianSaveRate,
      medianFollowConversion: baseline.medianFollowConversion,
      medianDmConversion: baseline.medianDmConversion,
      hasEnoughEvidence: hasEnoughEvidence(baseline.sampleSize),
      bestPost,
    }
  })
}
